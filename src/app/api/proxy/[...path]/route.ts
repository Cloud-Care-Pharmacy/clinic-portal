import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { normalizeApiPayload, toBackendPatientSort } from "@/lib/api-normalize";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(
  /\/$/,
  ""
);
const API_SECRET = process.env.API_SECRET ?? "";

/**
 * Catch-all API proxy: forwards client requests to the backend,
 * injecting the X-API-Key server-side so it's never exposed in the browser.
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  // Backend has multiple top-level groups: regular `/api/...` endpoints, and
  // the workflows/notifications/webhooks endpoints which live at the root.
  // Skip the `/api/` prefix for those.
  const ROOT_PREFIXES = new Set([
    "workflows",
    "notifications",
    "webhooks",
    // legacy alias kept temporarily; new code should not use this
    "internal",
  ]);
  const isRootPath = ROOT_PREFIXES.has(path[0]);
  const backendPath = isRootPath ? `/${path.join("/")}` : `/api/${path.join("/")}`;
  const url = new URL(backendPath, API_URL);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  if (path[0] === "entities" && path[2] === "patients") {
    const sort = toBackendPatientSort(url.searchParams.get("sort") ?? undefined);
    if (sort) url.searchParams.set("sort", sort);
  }

  const headers: Record<string, string> = {
    "X-API-Key": API_SECRET,
    "X-Clerk-User-Id": userId,
  };

  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  } else {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
    method: req.method,
    headers,
    // Auth proxy must never cache: every request is per-user and time-sensitive.
    cache: "no-store",
    next: { revalidate: 0 },
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    // Use arrayBuffer for binary-safe forwarding (e.g. multipart/form-data uploads)
    const buf = await req.arrayBuffer();
    fetchOptions.body = buf;
  }

  // Auth proxy: cache disabled via fetchOptions.cache and next.revalidate above.
  // oxlint-disable-next-line react-doctor/server-fetch-without-revalidate
  const backendRes = await fetch(url.toString(), fetchOptions);

  // Stream binary responses (e.g. document downloads) directly
  const resContentType = backendRes.headers.get("content-type") ?? "application/json";
  const isJson = resContentType.includes("application/json");

  if (!isJson) {
    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers: {
        "Content-Type": resContentType,
        ...(backendRes.headers.get("content-disposition")
          ? { "Content-Disposition": backendRes.headers.get("content-disposition")! }
          : {}),
        ...(backendRes.headers.get("content-length")
          ? { "Content-Length": backendRes.headers.get("content-length")! }
          : {}),
        "Cache-Control": backendRes.headers.get("cache-control") ?? "no-store",
      },
    });
  }

  const data = await backendRes.text();

  if (!data) {
    return new NextResponse(null, { status: backendRes.status });
  }

  const payload = JSON.parse(data);
  const normalized = normalizeApiPayload(payload, backendPath);

  return NextResponse.json(normalized, {
    status: backendRes.status,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
