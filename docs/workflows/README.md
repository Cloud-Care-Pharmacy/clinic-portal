# Shopify signup → new patient

Automation for the marketing funnel: when someone signs up as a customer in
Shopify, create the matching patient record in the clinic and send them a
welcome email.

```
Shopify customers/create webhook
   │
   ▼
POST /api/webhooks/shopify/customers-create   ← this app
   │   verify Shopify HMAC → skip if already a patient → hand off
   ▼
"Shopify Signup → New Patient" workflow (webhook trigger)
       └─ router "Has email?"
            ├─ create-and-welcome
            │     ├─ patient_action ... create the patient record
            │     ├─ send_email ....... welcome email
            │     └─ record_activity .. timeline entry
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

## Why there's still a route in front of the workflow

The create lives in the workflow, on the `patient_action` node. Two things stay
in the route because the engine can't do them:

- **The Shopify signature check.** Without it the trigger URL is the only
  secret, and anyone who learns it could create patients and send mail.
- **The "already a patient?" lookup.** `patient_action` rejects a duplicate
  email outright, and Shopify re-delivers until it gets a 2xx — so without this
  every retry would leave a failed run behind. The engine has no
  lookup-by-email step to do it with (`lookup_patient` takes an id), and it
  can't call our API to improvise one: `http_call` to `api.quity.com.au`
  returns **522** from inside the engine while succeeding from everywhere else,
  and calls to third-party hosts work fine (`https://example.com` → 200).

Because the route no longer writes anything before handing off, a failed
handoff returns 502 and Shopify's retry safely re-runs the whole delivery.

The trade-off of moving the create into the workflow: the route acknowledges
Shopify as soon as the workflow starts, so a failure *inside* the workflow no
longer reaches Shopify's retry machinery. It shows up as a failed run instead.
The create node retries three times with backoff to cover transient errors.

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
| Valid signature, new customer | workflow starts: patient created, welcome email sent, `200` |
| Signature missing or wrong | `401`, nothing called |
| Customer already has a patient | skipped, so the create node never runs |
| Customer has no email | skipped (nothing to key the record on) |
| Another topic posted to the URL | skipped |
| Gateway lookup or workflow trigger fails | `502`, so Shopify retries the delivery |

The route flattens Shopify's customer into the payload the create node reads:
`email` (lower-cased, matching every existing record),
`first_name`/`last_name`, `phone` (falling back to the default address phone),
and `default_address.*` → street/city/state/postcode/country. Absent values are
sent as empty strings, which is what an unresolved template would produce
anyway.

Provenance is `source: "shopify"` on the node, which the gateway stamps onto the
audit row and the `patient.created` event. Note this replaced the
`introSource: "shopify"` column the route used to write — `patient_action`
can't write that column (`PATIENT_ACTION_FIELD_KEYS` has only
`introSourceDate` / `introSourceComments`). Nothing reads it today; every
existing patient has it null.

## Templates

The **signup · assessment not started** sequence — three email templates under
category `signup`:

| # | Template | Subject | Timing | ID |
|---|---|---|---|---|
| 1 | Signup 1 · Welcome | You're all set up - ready to begin? | ~1 day after sign-up | `019fce9f-d890-76cd-8a07-ff7269c0af0e` |
| 2 | Signup 2 · Still waiting | Your assessment is waiting | +2 days after email 1 | `019fcea0-3d21-73da-b284-6728b9fe852b` |
| 3 | Signup 3 · Last nudge | Still thinking it over? | +4 days after email 2 | `019fcea0-41fc-739c-aef1-c445b15e2741` |

Only #1 is wired up, and the workflow sends it **immediately** on signup rather
than at the sequence's ~1 day. Add a `wait` step before `send_welcome_email` if
the design's timing is what's wanted. Day numbers live in the template
descriptions rather than their names, so re-timing the sequence doesn't leave a
stale name behind.

The `send_welcome_email` step carries no inline subject, so each template's
subject is what goes out — editing it in the editor is enough.

The renderer only understands `{{ dotted.path }}` — see `TOKEN_RE` in
`src/lib/templates/variables.ts` — and leaves anything else in the body as
literal text. The supplied HTML used Django-style syntax, so on the way in:

- `{{ first_name|default:'there' }}` → `{{patient.firstName}}`, with the
  fallback resolved in the route (`greetingName`), since Shopify signups often
  have no first name and the renderer has no default filter.
- `{{ email|default:'' }}` → `{{patient.email}}`
- `{% unsubscribe_link %}` → a `mailto:` unsubscribe, which works without any
  new infrastructure. Swap it for a one-click link if we add one.
- `[[ Your registered business address ]]` → `{{clinic.address}}`, so it can be
  filled from the workflow step's `variables` instead of by editing the HTML.
- The hidden preheader div shipped the literal string `undefined` as inbox
  preview text; each template now carries real preview copy.

Subjects weren't supplied, so they mirror each email's headline
("Welcome in, {{patient.firstName}} — here's your next step").

## Before going live

- [ ] **Supply the registered business address.** The footer currently renders
      `{{clinic.address}}` verbatim. Add it to the `send_welcome_email` step's
      `variables`, or hard-code it in the three template bodies.
- [ ] Set the three variables above in Vercel and register the Shopify webhook.
- [ ] Test-run the workflow from the editor with your own address in
      `body.email` to check the email renders.
- [ ] Activate the workflow (button in the editor, or
      `POST /workflows/{id}/activate`).

Emails 2 and 3 have no workflow. The schedule is settled (+2 days, then +4), so
what's left is the exit condition: each send has to be skipped once the patient
has actually started their assessment. The engine can't query our API to check
(see above) and has no lookup-by-email step, so that signal has to come from the
gateway — either a `patient.intake.submitted` event the sequence can wait on
(`wait_for_event`), or an intake flag exposed on a step the sequence can branch
against.

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
