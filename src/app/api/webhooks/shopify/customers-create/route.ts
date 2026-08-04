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
 * Shopify `customers/create` webhook: creates the matching patient record, then
 * hands off to the "Shopify Signup → New Patient" workflow, which sends the
 * welcome email.
 *
 * The workflow engine can't do the create itself — an `http_call` step aimed at
 * our own API comes back 522 (the gateway can't reach its own Cloudflare-fronted
 * hostname), and the engine has no `create_patient` step. Doing it here also
 * keeps `API_SECRET` server-side instead of stored in the workflow definition.
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

function toPatientPayload(customer: ShopifyCustomer, email: string) {
  const address = customer.default_address ?? {};
  const payload: Record<string, string> = {
    entityId: ENTITY_ID,
    originalEmail: email,
    introSource: "shopify",
  };
  const optional: Record<string, string | undefined> = {
    firstName: clean(customer.first_name),
    lastName: clean(customer.last_name),
    mobile: clean(customer.phone) ?? clean(address.phone),
    streetAddress: clean(address.address1),
    city: clean(address.city),
    state: clean(address.province),
    postcode: clean(address.zip),
    country: clean(address.country),
  };
  for (const [key, value] of Object.entries(optional)) {
    if (value) payload[key] = value;
  }
  return payload;
}

/**
 * Starts the welcome-email workflow. Failures are logged rather than surfaced:
 * the patient already exists at this point, and a non-2xx would make Shopify
 * retry into the "already a patient" branch, which skips instead of retrying
 * the email.
 */
async function startWelcomeWorkflow(body: Record<string, unknown>): Promise<void> {
  if (!WORKFLOW_URL) {
    console.error("shopify/customers-create: SHOPIFY_SIGNUP_WORKFLOW_URL unset");
    return;
  }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(WORKFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (res.ok) return;
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

  const created = await fetch(`${API_URL}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify(toPatientPayload(customer, email)),
    cache: "no-store",
  });
  if (!created.ok) {
    console.error(`shopify/customers-create: patient create returned ${created.status}`);
    return NextResponse.json({ error: "Create failed" }, { status: 502 });
  }
  const patientId = (await created.json())?.data?.id;

  await startWelcomeWorkflow({
    patientId,
    email,
    firstName: clean(customer.first_name) ?? "",
    lastName: clean(customer.last_name) ?? "",
    // The templates greet by first name, which Shopify signups often lack, and
    // the renderer has no default filter — so the fallback is resolved here.
    greetingName: clean(customer.first_name) ?? "there",
    shopifyCustomerId: customer.id ?? null,
  });

  return NextResponse.json({ ok: true, patientId });
}
