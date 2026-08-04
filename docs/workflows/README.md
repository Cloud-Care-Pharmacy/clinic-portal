# Shopify signup → new patient

Automation for the marketing funnel: when someone signs up as a customer in
Shopify, create the matching patient record in the clinic and send them a
welcome email.

```
Shopify customers/create webhook
   │
   ▼
POST /api/webhooks/shopify/customers-create   ← this app
   │   verify Shopify HMAC → look up by email → POST /api/patients
   ▼
"Shopify Signup → New Patient" workflow (webhook trigger)
       └─ router "Has email?"
            ├─ send-welcome ..... welcome email + timeline entry
            └─ no-email ......... skip
```

| | |
|---|---|
| Workflow ID | `019fce63-5b36-71dc-980c-ffcf8d7ab8d2` |
| Entity | `aded0afd-47f8-411e-ba99-9684571caaf8` (Quity) |
| Status | `draft` — **not live** |
| Trigger link | Shown on the trigger node in the workflow editor |

`shopify-signup-to-patient.json` is the payload the workflow was created from,
kept here so the definition is reviewable and re-appliable.

## Why the create step isn't in the workflow

The obvious shape — one workflow doing lookup, create, and email via `http_call`
— doesn't run. Verified by test run:

- `http_call` to `https://api.quity.com.au` returns **522** from inside the
  engine, while the same request succeeds from anywhere else. Calls to
  third-party hosts work (`https://example.com` → 200), so this is the gateway
  being unable to reach its own Cloudflare-fronted hostname, not egress in
  general.
- There is no native patient-creating step — `create_patient` is rejected by the
  definition validator, and the step catalog has no equivalent.

So the create happens in the route handler, which can reach the API. That also
keeps `API_SECRET` server-side instead of stored in the workflow definition
where anyone who can open the editor could read it.

If the gateway later gains a `create_patient` step (or the engine can reach the
API), the lookup and create can move back into the workflow and the route can go
away.

## Configuration

Set in Vercel (and `.env.local` for local work):

| Variable | Value |
|---|---|
| `SHOPIFY_WEBHOOK_SECRET` | signing secret from the Shopify webhook subscription |
| `SHOPIFY_SIGNUP_ENTITY_ID` | `aded0afd-47f8-411e-ba99-9684571caaf8` |
| `SHOPIFY_SIGNUP_WORKFLOW_URL` | the workflow's trigger link |

The route returns 503 while any of these (or `API_SECRET`) are unset — it fails
closed rather than accepting unverified callers.

In Shopify: Settings → Notifications → Webhooks → add `customers/create`
pointing at `https://<portal-domain>/api/webhooks/shopify/customers-create`.

## Behaviour

| Situation | Result |
|---|---|
| Valid signature, new customer | patient created, welcome email sent, `200` |
| Signature missing or wrong | `401`, nothing called |
| Customer already has a patient | skipped, no duplicate and no second email |
| Customer has no email | skipped (nothing to key the record on) |
| Another topic posted to the URL | skipped |
| Gateway lookup/create fails | `502`, so Shopify retries the delivery |

Shopify's payload is mapped to the patient record as `email → originalEmail`
(lower-cased, matching every existing record), `first_name`/`last_name`,
`phone` (falling back to the default address phone), `default_address.*` →
street/city/state/postcode/country, plus `introSource: "shopify"`. Blank values
are omitted rather than written as empty strings.

## Before going live

- [ ] Swap the placeholder welcome email for the real template: set `templateId`
      (+ `variables`) on the `send_welcome_email` step and drop the inline
      `subject`/`html`/`text`.
- [ ] Set the three variables above in Vercel and register the Shopify webhook.
- [ ] Test-run the workflow from the editor with your own address in
      `body.email` to check the email renders.
- [ ] Activate the workflow (button in the editor, or
      `POST /workflows/{id}/activate`).

Every customer who signs up gets the welcome email — it is not gated on
`email_marketing_consent`. If that should change, add a condition on
`{{event.payload.body.marketingConsent}}` and pass the flag through from the
route.

## Re-applying the definition

```bash
python3 - <<'PY'
import json, os, subprocess
api, key = os.environ["NEXT_PUBLIC_API_URL"].rstrip("/"), os.environ["API_SECRET"]
payload = json.load(open("docs/workflows/shopify-signup-to-patient.json"))
payload.pop("entityId", None)     # PATCH ignores it
payload.pop("triggers", None)     # sending triggers re-issues the webhook token
subprocess.run(["curl", "-sS", "-X", "PATCH", "-H", f"X-API-Key: {key}",
                "-H", "Content-Type: application/json", "-d", json.dumps(payload),
                f"{api}/workflows/019fce63-5b36-71dc-980c-ffcf8d7ab8d2"])
PY
```

> Sending `triggers` on a PATCH re-issues the webhook token and invalidates the
> old trigger link, so `SHOPIFY_SIGNUP_WORKFLOW_URL` would need updating.
