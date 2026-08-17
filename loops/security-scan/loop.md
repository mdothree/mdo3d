---
loop: security-scan
family: Guard
mode: monitor
cadence: weekly
executor: sentinel
runs_from: laptop (supervised) · control seat (scheduled)
targets: repo working trees + the 4 Firebase projects' rules
context:
  - ../CONTROL.md
  - ../CENTRAL_MONITORING_PLAN.md
records_to: LEDGER.md (+ INBOX.md on escalation)
status: draft
---

# Loop: security-scan

**One-line:** the weekly integrity read. Firestore/Storage rules are not world-open, no secrets
are committed, and no live server keys leak into client bundles.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md); always a monitor.
- Static repo read needs no cloud auth; the deployed-rules read uses the read-only SA token.

## SENSE (read-only)
- **Rules:** each project's `firestore.rules` / `storage.rules` (source and, if auth allows,
  deployed) for `allow read, write: if true` or missing auth conditions.
- **Committed secrets:** scan tracked files for private keys, service-account JSON, non-public
  API keys, Stripe secret keys. Firebase web `apiKey` values are public by design and are not
  findings; a Stripe secret or SA private key is.
- **Client exposure:** built/public JS for server-only keys that should never ship to the browser.
- Confirm `.gitignore` still covers `loops/secrets/`, `review/data/monitoring.json`, and the
  SA/Stripe key paths.

## DECIDE
- All-clear: rules gated, no server secrets tracked or shipped, gitignore intact.
- Flag: an open rule, a committed server secret, a leaked key, or a gitignore gap.

## ACT (monitor only)
- Record findings with file paths and project. Do not rewrite rules or rotate keys.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): counts by finding type.
- Any real exposure → [`../INBOX.md`](../INBOX.md) (do not quote the secret value; reference the
  file and line).

## Guardrails
- Read-only. Never edit rules, never rotate or print a secret value.

## Escalation
- A world-open rule on a project holding user data, or a committed/shipped server secret →
  INBOX.md + PushNotification the same run.

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first; always MONITOR. Weekly security read: (1) check each project's
firestore.rules / storage.rules (source, and deployed via read-only SA if available) for world-open access;
(2) scan tracked files for committed server secrets — SA JSON, private keys, Stripe SECRET keys (Firebase web
apiKey is public, not a finding); (3) check built/public JS for server-only keys that shouldn't ship; (4) confirm
.gitignore still covers loops/secrets/, review/data/monitoring.json, and the key paths. Append a LEDGER row with
counts by type. Escalate any real exposure to INBOX.md + push, referencing file:line — never print the secret
value. Read-only: never edit rules or rotate keys.
```
