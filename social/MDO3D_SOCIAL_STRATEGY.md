# MDO3D Social Strategy

**Date:** 2026-08-17
**Page:** https://www.linkedin.com/company/mdo3 (LinkedIn, umbrella/studio page)
**Adapted from:** the AHL distribution playbook (`~/ahl/distribution/docs/SOCIAL_CONTENT_PLAYBOOK.md` et al.).
**Companion files:** [`MDO3D-Project-Summaries.md`](MDO3D-Project-Summaries.md) (source material) ·
[`CONCEPTS.md`](CONCEPTS.md) (styling) · [`../comms/voice/VOICE_AND_GUIDELINES.md`](../comms/voice/VOICE_AND_GUIDELINES.md) (voice QC) ·
[`data/social_links.json`](data/social_links.json) (page registry) · [`data/content-plan.md`](data/content-plan.md) (calendar + backfill).

---

## 0. The one decision that differs from AHL

AHL runs **one independent brand page per product** and never mentions the parent lab
(the "independent-brand rule" — simultaneous launches read as separate products). **MDO3D
is the opposite on purpose:** one **umbrella studio page** (`/company/mdo3`) that builds in
public across the whole portfolio. That fits the brand's own positioning — *"One ecosystem,
many dimensions of intelligence."* So MDO3D's page is a **studio / building-in-public**
account, not a single-product account.

Everything else from the AHL playbook transfers directly: weekly cadence, a rotating
content portfolio, backfill-before-launch, a hard honesty gate, a draft→review→schedule
pipeline where **nothing auto-publishes**, and the voice rules already enforced by
`review/voice_qc.py`.

---

## 1. Channel fit (be honest about it)

LinkedIn is not equally right for every MDO3D product; the **studio narrative** is what makes
it work across all of them:

- **Strong native fit:** the studio's founder/build story, and the **career line**
  (rigor.design — resume, interview, LinkedIn tools) whose audience literally lives on LinkedIn.
- **Workable via the build angle:** utilities and the developer tools (mdothree) — "here's a
  thing I shipped this week" plays to a maker/professional audience.
- **Weak native fit, studio-framed:** the **divination line** is a consumer/spiritual audience
  that lives on Instagram / Pinterest / TikTok, not LinkedIn. On the studio page, post it as
  *"how we built an AI tarot reader,"* not *"get your reading."* (Flag: when divination gets
  real traction, stand up an Instagram/Pinterest presence for it — out of scope for this doc.)

**Takeaway:** the LinkedIn page sells **the studio and the making of the tools**, and does
direct product marketing only for the professional line. Consumer conversion for divination
comes later on consumer channels.

---

## 2. Cadence & mechanics (mirror AHL)

- **Rhythm:** weekly generate/schedule sweep (owned by `loops/social-content`), with a daily
  monitor once volume justifies it. A recurring rhythm, not a one-time launch.
- **Company page only.** Never a personal profile.
- **Bulk-schedule, never live.** Approved posts are future-dated in batches via LinkedIn's
  native scheduler (reviewable/deletable before firing). Vary the slots — rotate weekdays,
  cap per day, skip weekends, add a lead-time buffer. Never the same time daily.
- **Volume target:** 2–3 posts/week to start (studio pages get penalized for thin *or* spammy).
  Grow toward 3–4/week once the backfill is established and reviewed.

---

## 3. Content portfolio (the rotation, adapted for a tools studio)

Rotate types so the page never looks like one genre. Each type has an honesty gate.

| # | Type | Purpose | Product-tie | Cadence weight |
|---|------|---------|-------------|----------------|
| 1 | **Build log** | "This week I shipped X / fixed Y." The studio's real progress. | direct, light | 25% |
| 2 | **Tool spotlight** | One live tool, what it does, a real screenshot. Shipped-only. | direct | 20% |
| 3 | **Category education** | Phenomenon-first: the *field* behind a tool (the psychology of numerology, how ATS parsers actually work, the history of tarot). No pitch. | none / second | 25% |
| 4 | **Founder lesson** | An honest lesson from building a multi-product AI studio solo (shipping, pricing, what broke). | none | 15% |
| 5 | **Launch announcement** | A genuinely new capability going live (merit-launch copy). | direct | as-needed |
| 6 | **Behind-the-build** | "How I built an AI dream interpreter" — the making-of, for the consumer tools that don't fit LinkedIn directly. | indirect | 10% |
| 7 | **Results / proof** | Real numbers only (usage, uptime, a real before/after). **Trigger-gated — never fabricated.** | direct | only when real |
| 8 | **Hiring** | Only if a real role exists. No fabricated headcount. | — | rare |

**Rule from AHL, kept verbatim:** connect to a product **briefly and second** in educational
posts; educational-only posts mention no product at all. Draft only from **defensible,
shipped** points in `MDO3D-Project-Summaries.md` (respect its 🟢/🟡/🔵 status — never announce
🔵 In-Dev, teaser-only for 🟡).

---

## 4. Backfill (the single most important move for a new page)

A brand-new page is a **ghost town** — it looks dead when someone arrives. Before any launch
push, seed a credible history:

- **Draft ~12 posts** weighted toward **category-education + build-log** (types 3 and 1), so the
  page reads as a credible maker/domain voice, not an ad feed.
- **Review them** through the Social lane, then **bulk-schedule** future-dated across varied
  slots over the first ~4–5 weeks so the page fills on a steady rhythm.
- **Grounded, not fabricated.** Every post traces to a real shipped capability or a real,
  resolving citation. No invented metrics, testimonials, or user counts. (AHL had to rework
  ~45 fabricated-metric posts — don't create that debt.)

The starting 12 are drafted in [`data/content-plan.md`](data/content-plan.md).

---

## 5. Pipeline (idea → published), reusing what exists

Same governed flow as AHL — the human does **judgment (the review gate)**, not labor:

1. **Ground** — read `MDO3D-Project-Summaries.md` (scope, status, do-not-claim). Draft only from defensible points.
2. **Draft** — write the row into the editorial calendar (`social/data/*` — start with `content-plan.md`, graduate to an xlsx to match the loop's expectation). Set Post Type + status `Drafted`.
3. **Style** — turn approved copy into a card using the existing `social/MDO3D Social Posts.dc.html` frames + `CONCEPTS.md` styling (treat design frames as concepts to re-scope, never copy claims from).
4. **QC gate** — `review/voice_qc.py` auto-flags em/en dashes, "not X it's Y" reframing, product perf claims, user-count metrics, project-name hashtags, unresolving citations. Fail → back to draft.
5. **Review** — the `review/` dashboard Social lane; approve / reject / revise. Nothing advances unapproved.
6. **Schedule** — bulk future-date the approved rows on varied slots; the browser click fires it on the company page. Set status `Scheduled`.
7. **Measure** — verify Scheduled→Posted, capture the LinkedIn URL, track engagement.

**State machine:** `needed → drafted → styled → (review) → approved → scheduled → posted`.
Never schedule a row that is not `approved`; never make a live post.

---

## 6. Voice rules (live + the register to fill)

**Mechanical rules (enforced now by `review/voice_qc.py`):** no em/en dashes; no contrastive
reframing ("not X, it's Y"); no performance/adoption claims about our own tools; no fabricated
or unresolving citations; no project-name hashtags. Observation-first opens; open, non-promo closes.

**Register (now written — see the voice doc):** MDO3D speaks as a **maker running a real AI
studio** — plainspoken, specific, a little wry, never mystical-woo even for the divination
tools (the studio voice is the engineer's, not the oracle's). Per-brand tone is defined in
`../comms/voice/VOICE_AND_GUIDELINES.md`.

---

## 7. LinkedIn tactics

- **Hashtags:** 4–5 broad, high-search topic tags (#AI #BuildInPublic #IndieHackers #SaaS
  #CareerTools). Never `#MDO3D` (tacky, low-search). Pure product-launch posts can run no tags.
- **Format:** observation-first body, concise caption on image posts; short on-image headline.
- **Engagement (as the page, human-gated):** like/comment/repost relevant maker + AI + career
  content as MDO3D, a few targets/week, drafted for review — never auto-fired, never personal.
- **Reach reality:** cold organic reach on a new brand page is ≈ zero. The page is a
  **credibility/nurture asset**, not a cold-acquisition engine. Real acquisition comes from
  merit surfaces — Show HN / Product Hunt / relevant subreddits / SEO / the tools themselves —
  which is a separate track from this page.

---

## 8. Rollout sequence

| Wave | What | When |
|------|------|------|
| **0 — Substrate** | mdo3d.com + the live tools clean and working (done); page bio/logo/links set | now |
| **0.5 — Backfill** | draft + review the starting 12; bulk-schedule across ~4–5 weeks | week 1 |
| **1 — Studio intro** | one honest "what MDO3D is / why I'm building it" founder post | opens the schedule |
| **2 — Steady rhythm** | 2–3/week rotating the portfolio (§3); begin page-as-MDO3D engagement | weeks 2+ |
| **3 — Launch beats** | announce genuinely new live capabilities as they ship (rigor first — best LinkedIn fit) | as-shipped |
| **4 — Proof** | real usage/results posts — **only when real numbers exist** | trigger-gated |
| **5 — Consumer channels** | stand up Instagram/Pinterest for the divination line | when divination traction warrants |

---

## 9. What's still needed to go live (owner actions)

1. **Page setup:** confirm `/company/mdo3` bio, logo (`social/assets/m3-*`), banner, and the
   website link point at mdo3d.com.
2. **Review the 12 backfill drafts** in `data/content-plan.md` (approve/revise) before scheduling.
3. **Scheduling access:** the bulk-schedule step needs a logged-in LinkedIn session on the
   company page (Claude-in-Chrome or the Playwright poster) — same as AHL's `bin/bulk_schedule.py`.
4. **Decide graduation to xlsx:** the `loops/social-content` loop is "candidate until an
   editorial calendar exists in `social/data/*.xlsx`." `content-plan.md` is the human-readable
   start; convert to xlsx (AHL's schema) to flip the loop from candidate → active.
