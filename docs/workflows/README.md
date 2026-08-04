# Shopify signup → new patient

Automation for the marketing funnel: when someone signs up as a customer in
Shopify, create the matching patient record in the clinic and send them a
welcome email.

The workflow itself lives in the gateway (`/workflows`), not in this repo.
`shopify-signup-to-patient.json` is the exact payload it was created from, kept
here so the definition is reviewable and reproducible.

| | |
|---|---|
| Workflow ID | `019fce63-5b36-71dc-980c-ffcf8d7ab8d2` |
| Entity | `aded0afd-47f8-411e-ba99-9684571caaf8` (Quity) |
| Status | `draft` — **not live** |
| Trigger | Webhook (token is shown in the workflow editor's trigger panel) |

## Shape

```
Shopify customers/create  ──▶  webhook trigger
   │
   ├─ http_call   look up existing patient by email  (search, limit 1)
   └─ router      "New Shopify signup?"  (first match wins)
        ├─ no-email ............. customer has no email → skip
        ├─ new-signup ........... search returned 0 matches
        │     ├─ http_call ...... POST /api/patients
        │     ├─ send_email ..... welcome email
        │     └─ record_activity  log the signup on the patient timeline
        └─ already-a-patient .... fallback, skip (covers Shopify webhook retries)
```

Shopify's `customers/create` body lands at `{{event.payload.body.*}}` — the
webhook trigger wraps the POST as `{ headers, query, params, body, webhookUrl,
executionMode }`. `http_call` responses are stored as
`{ status, ok, body }`, so the parsed JSON of a call stored as `existing` is at
`{{vars.existing.body.…}}`.

## Blocked: the engine cannot call our own API

The two `http_call` steps target `https://api.quity.com.au`. Verified by test
run: **that call returns 522 from inside the workflow engine**, while the same
request from anywhere else succeeds. `http_call` to third-party hosts works
normally (`https://example.com` → 200), so this is specific to the gateway
calling its own Cloudflare-fronted hostname, not general egress.

The engine has no native patient-creating step either — `create_patient` is
rejected by the definition validator, and the step catalog exposes no
equivalent.

So the workflow is correct but cannot run end to end until the patient-creation
hop is provided by one of:

1. **Gateway change** — make the API reachable from the engine (service binding
   or an unproxied internal hostname), or add a `create_patient` step kind.
   The definition here then works unchanged.
2. **An ingest route in this app** — a Shopify-HMAC-verified route handler that
   creates the patient with the server-side `API_SECRET`, letting the resulting
   `patient.created` event drive the welcome-email workflow.
3. **An external caller** (e.g. Shopify Flow's HTTP action) posting to
   `POST /api/patients` with the API key.

## Before going live

- [ ] Provide the patient-creation hop (above).
- [ ] Swap the placeholder welcome email for the real template: set
      `templateId` (+ `variables`) on the `send_welcome_email` step and drop the
      inline `subject`/`html`/`text`.
- [ ] Confirm the Shopify field names against a real delivery. This assumes the
      REST webhook shape (`first_name`, `last_name`, `phone`,
      `default_address.*`).
- [ ] In Shopify: Settings → Notifications → Webhooks, add a `customers/create`
      webhook pointing at the trigger URL from the workflow editor, and store
      its signing secret under Workspace → Integrations → Shopify.
- [ ] Decide whether to gate the email on `email_marketing_consent.state`.
- [ ] Test-run with a payload whose email already exists — that path performs no
      writes and sends nothing.
- [ ] Activate (`POST /workflows/{id}/activate`, or the button in the editor).

## Applying the definition

The JSON keeps `__API_URL__` / `__API_SECRET__` placeholders so no credential is
committed. To re-apply after editing:

```bash
python3 - <<'PY'
import json, os, subprocess
api, key = os.environ["NEXT_PUBLIC_API_URL"].rstrip("/"), os.environ["API_SECRET"]
body = (open("docs/workflows/shopify-signup-to-patient.json").read()
        .replace("__API_URL__", api).replace("__API_SECRET__", key))
payload = json.loads(body); payload.pop("entityId", None)   # PATCH ignores entityId
subprocess.run(["curl", "-sS", "-X", "PATCH", "-H", f"X-API-Key: {key}",
                "-H", "Content-Type: application/json", "-d", json.dumps(payload),
                f"{api}/workflows/019fce63-5b36-71dc-980c-ffcf8d7ab8d2"])
PY
```

> The definition stores the entity API key in the `http_call` headers — the only
> way for a step to authenticate against our API today. Both steps are marked
> `sensitive: true` so run captures omit their inputs and outputs, but the key is
> still readable by anyone who can open the workflow in the editor or read
> `GET /workflows/{id}`. Option 1 or 2 above removes the need for it entirely.
