# MDO3D Stripe hub

One Stripe webhook endpoint per Stripe **account** instead of one per app. Stripe caps an
account at 16 webhook endpoints and the portfolio has about 14 Stripe-consuming services.

```
Stripe account "mdo3" ──► POST /api/stripe/webhook/mdo3 ──► verify signature
                                                          ──► resolve service
                                                          ──► POST {eventId, account, type}
                                                              X-Stripe-Hub: 1
                                                              to <service>/…/stripe-forwarded
```

Receivers never trust the forwarded body. Each one re-fetches the event with
`stripe.events.retrieve(eventId)` using its **own** Stripe key, checks that the event is
its own, and runs the same handler as its direct webhook route.

## Runtime

Express 4 on `@vercel/node`, ESM, the same layout as `projects/divination/*/api`
(`vercel.json` sends `/api/*` to `src/server.js`). We used Express rather than plain
Vercel functions because `express.raw()` gives the exact raw body that signature checks
need, plus a `:account` route parameter, with no framework-specific body-parser settings.

- `src/server.js`: the app (`createApp()` is exported for tests, `default` is the Vercel handler)
- `src/router.js`: service resolution and forwarding (no Express)
- `routes.json`: maps a service key to its target URL(s)

Local run: `npm install && STRIPE_WEBHOOK_SECRET_MDO3=whsec_... node src/server.js` (port 3090),
then `stripe listen --forward-to localhost:3090/api/stripe/webhook/mdo3`.

## Endpoint behaviour

| Case | Response |
|---|---|
| `:account` has no `STRIPE_WEBHOOK_SECRET_<ACCOUNT>` | 404 |
| Missing or bad `Stripe-Signature` | 400 |
| Verified, no service resolved | 200 `{routed:false}` plus an `outcome:"unrouted"` log line |
| Every target answered 2xx, or a 4xx other than 429 | 200 (a 4xx is final, because retrying will not fix a 404) |
| Any target answered 5xx or 429, timed out, or had a network error | **500**, so Stripe retries the whole event |

Stripe retries resend the event to **every** target of that service, so targets must be
idempotent per event id. The divination APIs dedupe in memory and their handling only
logs. Rigor's Firestore writes are merge-sets, and its `payment_events` rows are keyed by
event id. The forward timeout per target is `HUB_FORWARD_TIMEOUT_MS` (default 8000 ms).
Targets are called in parallel.

### How a service is resolved (first match wins)

1. `data.object.metadata.serviceName`
2. Invoices: `subscription_details.metadata.serviceName`, `parent.subscription_details.metadata.serviceName`, `lines.data[0].metadata.serviceName`
3. `checkout.session.*`: a `client_reference_id` of the form `<serviceKey>:<anything>`
4. A `subscription` reference on the object: `subscriptions.retrieve(...).metadata.serviceName` (needs `STRIPE_SECRET_KEY_<ACCOUNT>`)
5. `ROUTE_PRICE_MAP`: price ids from `items` / `lines` / the retrieved subscription. For a checkout session it calls `listLineItems` (this also needs the key).

A serviceName matches a `routes.json` key or any of its `aliases`, ignoring case. For
example, the tarot API sets `serviceName: "JarvisBee Tarot"`, which is an alias of `tarot`.
An entry with `"enabled": false` or no targets never matches. Adding `"accounts": ["mdo3"]`
limits a service to that account path.

### Log line (hook for a future revenue ticker)

The hub writes one JSON line per verified event:

```json
{"msg":"stripe_hub_event","id":"evt_…","type":"checkout.session.completed","account":"mdo3",
 "service":"tarot","routedBy":"metadata","amount":499,"currency":"usd","livemode":true,
 "outcome":"forwarded","targets":[{"url":"https://…","status":200}]}
```

`outcome` is one of `forwarded`, `unrouted` or `target_failed_retry`. `amount` is in the
smallest currency unit and comes from the first field present: `amount_total`,
`amount_paid`, `amount_received` or `amount`.

## Environment variables

`<ACCOUNT>` is the path segment in upper case, with `-` changed to `_`.

| Var | Required | Purpose |
|---|---|---|
| `STRIPE_WEBHOOK_SECRET_<ACCOUNT>` | yes, one per account | Signing secret of the hub endpoint in that Stripe account. Without it the path returns 404. |
| `STRIPE_SECRET_KEY_<ACCOUNT>` | optional | Used only for the subscription and line-item lookups in steps 4 and 5. A restricted read-only key is enough. |
| `ROUTE_PRICE_MAP` | optional | JSON `{"price_…":"rigor"}`, the price-id fallback |
| `HUB_FORWARD_TIMEOUT_MS` | optional | Timeout per target, default 8000 |
| `ROUTES_JSON` | optional | Replaces `routes.json` with an inline JSON string |

There are no secrets in the code or in `routes.json`.

## Setup / migration

1. Deploy the receivers first. Each divination API gets `POST /api/webhook/stripe-forwarded`, and rigor gets
   `POST /api/payment/webhook-forwarded`. Their old direct routes keep working.
2. Deploy this hub: `vercel --prod` from `projects/mdo3d/stripe-hub`.
3. In **each** Stripe account, add one endpoint `https://<hub-host>/api/stripe/webhook/<account>`
   (for example `…/webhook/mdo3`). Select the events the apps use: `checkout.session.completed`,
   `payment_intent.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid` and `invoice.payment_failed`.
4. Copy each endpoint's signing secret into `STRIPE_WEBHOOK_SECRET_<ACCOUNT>` on the hub
   project, and optionally `STRIPE_SECRET_KEY_<ACCOUNT>` and `ROUTE_PRICE_MAP`. Redeploy.
5. Verify. Use `stripe trigger checkout.session.completed` or a real test purchase, then check
   the hub logs for `outcome:"forwarded"` and the app logs for the handled event. While the old
   per-app endpoints are still active, each event is delivered twice: once directly and once via
   the hub. The in-memory dedupe and the idempotent handlers make that safe.
6. Remove the old per-app endpoints from the Stripe dashboard, one app at a time.

Important: a receiver can only `events.retrieve` events from the Stripe account its own
`STRIPE_SECRET_KEY` belongs to. Route an app's events only through the account path of
that same account. Otherwise the receiver answers 404 and the event is dropped, because a
404 is final.

## Adding a service

1. In the app, set `metadata.serviceName` on whatever it creates in Stripe: the checkout
   session, plus `subscription_data.metadata` for subscriptions and `payment_intent_data.metadata`
   if it needs `payment_intent.*` events.
2. Add a receiver that reads `{eventId}`, calls `stripe.events.retrieve(eventId)` with the
   app's key, ignores the event (200) if it is not the app's own, and otherwise runs the
   existing handler. The handler must be idempotent per event id. Return 5xx only for a
   failure worth retrying.
3. Add the entry to `routes.json`:
   `"myapp": {"enabled": true, "aliases": ["My App"], "targets": ["https://myapp-api…/api/webhook/stripe-forwarded"]}`
4. Deploy the app, then the hub, verify (step 5 above), and delete the app's own Stripe endpoint.

`routes.json` also lists the other webhook consumers found in the repo (dailyaitoll, leads,
mdothree, ronnascanner), with `"enabled": false` and notes. None of them has a forwarded
receiver or sets `serviceName` yet, so they keep their own endpoints for now.

## Fulfilment: LayoffLeads Pro + Prompts for Business (2026-10-14, staged)

`routes.json` service `fulfilment` has no forward target. It runs in-process (`"handler": "fulfilment"`,
`src/fulfilment/index.js`) and is the last routing step for any `checkout.session.*` that came from a
Payment Link on the `mdo3` account (`"paymentLinks": true`). A `serviceName` match still wins.

1. Re-fetch the event with `STRIPE_SECRET_KEY_FULFIL` (the hub body is never trusted).
2. Act only on `checkout.session.completed` / `async_payment_succeeded` with `payment_status === "paid"`.
3. **Test mode only** until the GO: live events are ignored (200, logged `fulfil_live_blocked`) and a
   live key is refused unless `FULFIL_ALLOW_LIVE=1`.
4. Match the session's Payment Link URL against `src/fulfilment/catalog.json` (15 links, generated by
   `node scripts/build-fulfilment.mjs --catalog-only` from the two `site.config.json` files).
   `FULFIL_LINK_MAP` (JSON, plink id or URL to product key) maps test-mode links. Other links: ignored.
5. Idempotent: in-memory event set, a durable `mdo_fulfilled_at` metadata marker on the Subscription or
   PaymentIntent (checked before sending), and a Resend `Idempotency-Key` per session.
6. Customer email with signed download links (HMAC, `FULFIL_LINK_TTL_DAYS`, default 7) plus an internal
   sale alert to `FULFIL_ALERT_TO`. Email provider failure 5xx/429 makes the hub answer 500 (Stripe retries).

Downloads: `GET /api/fulfil/download?t=<token>` streams one file from `private/` (gitignored, shipped in
the function via `vercel.json` `includeFiles`). Build it on the build host with
`node scripts/build-fulfilment.mjs` (full-history LayoffLeads CSV + every pack as Markdown).
Rebuild and redeploy the hub after each LayoffLeads data refresh so the CSV stays current.

| Var | Purpose |
|---|---|
| `STRIPE_SECRET_KEY_FULFIL` | Restricted key: read Events, Checkout Sessions, Payment Links; write Subscription + PaymentIntent metadata. `sk_test_`/`rk_test_` unless `FULFIL_ALLOW_LIVE=1`. |
| `STRIPE_WEBHOOK_SECRET_MDO3` | The hub endpoint's signing secret (already part of the hub). |
| `FULFIL_DOWNLOAD_SECRET` | Random 32+ byte string that signs download links. |
| `FULFIL_PUBLIC_URL` | The hub's public base URL, used in the links. |
| `FULFIL_EMAIL_API_KEY` | Resend API key (layoffleads.com + promptsforbusiness.com verified as sending domains). |
| `FULFIL_FROM_LAYOFFLEADS`, `FULFIL_FROM_PFB` | Sender, e.g. `LayoffLeads <orders@layoffleads.com>`. |
| `FULFIL_ALERT_TO` | Internal sale-alert inbox. |
| `FULFIL_ALLOW_LIVE` | `1` only after the Principal's GO for live fulfilment. |
| `FULFIL_LINK_MAP`, `FULFIL_LINK_TTL_DAYS` | Optional (test-mode link mapping, link lifetime). |

Tests: `npm test` (`node --test`, no network, no dependencies needed for the fulfilment + router tests).
Not handled automatically: LayoffLeads weekly alerts (the buyer replies with filters; the alert email says
so) and future packs promised to bundle buyers (the alert email flags it).
