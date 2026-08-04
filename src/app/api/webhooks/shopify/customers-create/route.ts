import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(
  /\/$/,
  ""
);
const API_SECRET = process.env.API_SECRET ?? "";
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
const ENTITY_ID = process.env.SHOPIFY_SIGNUP_ENTITY_ID ?? "";
const WORKFLOW_URL = process.env.SHOPIFY_SIGNUP_WORKFLOW_URL ?? "";

/**
 * Shopify `customers/create` webhook: verifies the delivery, then hands the
 * customer off to the "Shopify Signup → New Patient" workflow, which creates
 * the patient record (`patient_action`) and sends the welcome email.
 *
 * What stays here rather than moving into the workflow:
 *  - the HMAC check, which is the only thing separating a real Shopify
 *    delivery from anyone who has learned the trigger URL;
 *  - the "already a patient" lookup, because `patient_action` rejects a
 *    duplicate email outright and Shopify re-delivers until it gets a 2xx —
 *    without this, every retry would leave a failed run behind. The engine has
 *    no lookup-by-email step to do it with.
 *
 * Public route — authenticated by the Shopify HMAC signature, not by Clerk. See
 * `isPublicRoute` in `src/proxy.ts`.
 */

interface ShopifyAddress {
  address1?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
}

interface ShopifyCustomer {
  id?: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  default_address?: ShopifyAddress | null;
}

function isVerified(rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody, "utf8").digest();
  // Base64 decoding never throws — a malformed header just yields the wrong
  // number of bytes, which the length check rejects before the compare.
  const provided = Buffer.from(header, "base64");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(expected, provided);
}

/** Trims, and drops blanks so we never write empty strings over real values. */
function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Flattens the Shopify customer into the shape the workflow's `patient_action`
 * step reads. Blank values are sent as empty strings, which is what an
 * unresolved template would produce anyway.
 */
function toWorkflowPayload(customer: ShopifyCustomer, email: string) {
  const address = customer.default_address ?? {};
  return {
    email,
    firstName: clean(customer.first_name) ?? "",
    lastName: clean(customer.last_name) ?? "",
    // The templates greet by first name, which Shopify signups often lack, and
    // the renderer has no default filter — so the fallback is resolved here.
    greetingName: clean(customer.first_name) ?? "there",
    mobile: clean(customer.phone) ?? clean(address.phone) ?? "",
    streetAddress: clean(address.address1) ?? "",
    city: clean(address.city) ?? "",
    state: clean(address.province) ?? "",
    postcode: clean(address.zip) ?? "",
    country: clean(address.country) ?? "",
    shopifyCustomerId: customer.id ?? null,
  };
}

/**
 * Starts the workflow that creates the patient and sends the welcome email.
 * Nothing has been written at this point, so a failure is worth reporting back
 * to Shopify — its retry re-runs the whole thing safely.
 */
async function startSignupWorkflow(body: Record<string, unknown>): Promise<boolean> {
  if (!WORKFLOW_URL) {
    console.error("shopify/customers-create: SHOPIFY_SIGNUP_WORKFLOW_URL unset");
    return false;
  }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(WORKFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (res.ok) return true;
      console.error(
        `shopify/customers-create: workflow trigger returned ${res.status} (attempt ${attempt})`
      );
    } catch (error) {
      console.error(
        `shopify/customers-create: workflow trigger failed (attempt ${attempt})`,
        error
      );
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET || !API_SECRET || !ENTITY_ID) {
    // Fail closed: without the signing secret every caller would look valid.
    console.error("shopify/customers-create: missing required configuration");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!isVerified(rawBody, req.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic");
  if (topic && topic !== "customers/create") {
    return NextResponse.json({ ok: true, skipped: "unexpected topic" });
  }

  let customer: ShopifyCustomer;
  try {
    customer = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Every stored patient email is lower-cased; keep Shopify's casing out of the
  // record so lookups and display stay consistent.
  const email = clean(customer.email)?.toLowerCase();
  if (!email) {
    // Nothing to key a patient record on, and nowhere to send the welcome email.
    return NextResponse.json({ ok: true, skipped: "no email" });
  }

  const headers = { "X-API-Key": API_SECRET, "Content-Type": "application/json" };

  // Shopify retries a delivery until it gets a 2xx, and the same customer can
  // sign up again later — look first so neither creates a duplicate patient.
  const lookup = await fetch(
    `${API_URL}/api/entities/${encodeURIComponent(ENTITY_ID)}/patients?search=${encodeURIComponent(email)}&limit=1`,
    { headers, cache: "no-store" }
  );
  if (!lookup.ok) {
    // 502 so Shopify retries rather than silently dropping the signup.
    console.error(`shopify/customers-create: patient lookup returned ${lookup.status}`);
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
  const existing = await lookup.json();
  if ((existing?.data?.pagination?.total ?? 0) > 0) {
    return NextResponse.json({ ok: true, skipped: "already a patient" });
  }

  const started = await startSignupWorkflow(toWorkflowPayload(customer, email));
  if (!started) {
    return NextResponse.json({ error: "Workflow trigger failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, triggered: true });
}
