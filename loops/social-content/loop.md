---
loop: social-content
family: Grow
mode: operator
cadence: weekly
executor: curator
runs_from: laptop (supervised) · control seat (scheduled)
targets: social/ content + the review dashboard Social lane
context:
  - ../CONTROL.md
  - ../../social/CONCEPTS.md
  - ../../social/MDO3D-Project-Summaries.md
  - ../../comms/voice/VOICE_AND_GUIDELINES.md
records_to: LEDGER.md (+ INBOX.md on escalation) + social/data/
status: candidate
---

# Loop: social-content

**One-line:** keep a steady, on-brand social pipeline moving: draft from the handoff set,
route through the review dashboard's Social lane, and schedule what is approved. Nothing
auto-publishes.

## CONTEXT (run first)
- Read [`../CONTROL.md`](../CONTROL.md). `operator` here means **draft and bulk-schedule
  approved**, never auto-publish. Under `execution: monitor` it only drafts.
- **Candidate until** an editorial calendar exists in `social/data/*.xlsx`. Until then this loop
  logs "waiting on editorial calendar" and stops.

## SENSE (read-only)
- Load `social/data/*.xlsx` (status per row) and the review verdicts (`review/data/verdicts.csv`).
- Load `social/MDO3D-Project-Summaries.md` for the promote/teaser/hold status of each tool.
- Load `social/CONCEPTS.md` and the 12-frame set for the design archetypes.

## DECIDE
- Per row compute state: needed / drafted / approved / scheduled / posted.
- Enforce the status gate: only Live tools get promotional copy; Coming-soon get teaser/waitlist
  only; in-dev tools are not drafted. Runwae and DailyAIToll are excluded.

## ACT (operator: draft + schedule approved; monitor: draft only)
- Draft to quota in the voice from `comms/voice/VOICE_AND_GUIDELINES.md`, passing each draft
  through the voice QC gate (`review/voice_qc.py`) before it reaches review.
- Bulk-schedule only rows the review dashboard marks approved. Future-dated always, company
  accounts only, never a live/immediate post.

## RECORD
- Append to [`../LEDGER.md`](../LEDGER.md): drafted / approved / scheduled counts.
- Escalations (a claim that fails the status gate, an ambiguous tool) → [`../INBOX.md`](../INBOX.md).

## Guardrails
- Never auto-publish. Approval in the review dashboard authorizes future-dated scheduling only.
- Respect the status gate and the exclusions. No performance/adoption claims for tools not Live.

## Escalation
- A draft that cannot be made truthful within the status gate → INBOX.md rather than posting it.

## Dispatch prompt
```
Read mdo3d/loops/CONTROL.md first and resolve mode (operator = draft + schedule approved, never auto-publish;
monitor = draft only). If mdo3d/social/data/ has no *.xlsx editorial calendar, log "waiting on editorial calendar"
and STOP. Otherwise: load the calendar + review verdicts + MDO3D-Project-Summaries.md status gate. Draft to quota
in the voice from mdo3d/comms/voice/VOICE_AND_GUIDELINES.md, run each through mdo3d/review/voice_qc.py, and only
promote Live tools (Coming-soon = teaser only; in-dev = skip; Runwae/DailyAIToll excluded). Bulk-schedule only
review-approved rows, future-dated, company accounts only. Append a LEDGER row (drafted/approved/scheduled).
Never auto-publish.
```
