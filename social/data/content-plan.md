# MDO3D Content Plan & Backfill Seed

**Date:** 2026-08-17 · **Page:** linkedin.com/company/mdo3 · **Strategy:** [`../MDO3D_SOCIAL_STRATEGY.md`](../MDO3D_SOCIAL_STRATEGY.md)

This is the human-readable editorial calendar. Every draft below is `status: drafted` and
must pass the review Social lane + `review/voice_qc.py` before scheduling. Graduate this to
`social/data/social_media_posts.xlsx` (AHL schema) to flip the `loops/social-content` loop
from candidate → active.

**Voice reminders (enforced):** observation-first open; no em/en dashes; no "not X, it's Y";
no performance/adoption claims about our own tools; educational posts cite a real, resolving
source or state widely-known fact; broad hashtags only, never `#MDO3D`.
`[CITATION NEEDED]` = a real URL must be added before this post can be approved.

**Mix of the 12:** 4 category-education · 3 build-log · 3 tool-spotlight · 2 founder-lesson.
Weighted to educational + build so the page reads as a maker/domain voice, not an ad feed.

---

### 1 · Studio intro (founder) — schedule opener
**Type:** Founder lesson · **Status:** drafted
> I build AI tools. MDO3D is where they live: a small studio shipping a family of them across career help, everyday utilities, and self-reflection.
>
> The idea is simple. Large language models made it cheap to build a focused, useful tool in a weekend. So instead of one big product, MDO3D is many small ones, each on its own site, each doing one thing well.
>
> I will use this page to show the building. What shipped, what broke, what I learned. If you build software or you are curious what a one-person AI studio actually looks like week to week, follow along.

**CTA:** Follow the page. **Hashtags:** #BuildInPublic #AI #IndieHackers #SaaS #SoloFounder

---

### 2 · Tool spotlight — Rigor Resume Analyzer (career line, best LinkedIn fit)
**Type:** Tool spotlight · **Status:** drafted
> Most resumes are read by software before a human sees them. Applicant tracking systems parse a PDF into fields and score it against the job description, and a lot of good resumes lose points on formatting the applicant never sees.
>
> Rigor's Resume Analyzer (resume.rigor.design) reads a resume the way one of those parsers would, then shows the gaps against a specific job posting: missing keywords, sections it could not read, and concrete edits.
>
> It runs on the free tier for a single analysis. Built as part of MDO3D.

**CTA:** Try it at resume.rigor.design. **Hashtags:** #CareerTools #JobSearch #Resume #AI #ATS

---

### 3 · Category education — how ATS parsing actually works
**Type:** Category education · **Status:** drafted
> An applicant tracking system does not read a resume. It parses one. The PDF gets converted into text, split into fields like experience and education, and matched against the role. Multi-column layouts, tables, and text baked into images are common places that conversion drops information.
>
> The practical takeaway for anyone job hunting: a single-column layout, real text rather than a graphic, and the same words the posting uses will survive parsing more reliably than a designed template.
>
> [CITATION NEEDED: a real ATS-parsing study or vendor doc, resolving URL]

**CTA:** none (educational). **Hashtags:** #JobSearch #CareerAdvice #Hiring #Resume #Recruiting

---

### 4 · Build log — shipping the payment loop
**Type:** Build log · **Status:** drafted
> This week I closed a gap across the MDO3D tools that sell a premium result. Checkout worked, but the paid result was only gated in the browser, which meant a determined user could skip payment. The fix moved the check to the server: the app now verifies the completed payment before it returns the premium output.
>
> The lesson that keeps repeating in this studio: a client-side gate is a suggestion. If money is involved, the server has to be the one that says yes.

**CTA:** none. **Hashtags:** #BuildInPublic #Stripe #WebDev #SaaS #Payments

---

### 5 · Behind-the-build — the AI oracle tools
**Type:** Behind-the-build · **Status:** drafted
> One of the MDO3D tools gives AI tarot and oracle readings. The interesting engineering problem was not the mysticism. It was getting a language model to return a structured, well-formed reading every time, when the model likes to wrap its answer in extra prose.
>
> The fix was a parser that finds the first complete JSON object and ignores anything the model adds around it. Small, boring, and the difference between a clean reading and a screen of raw text.

**CTA:** none. **Hashtags:** #BuildInPublic #AI #LLM #WebDev #SideProject

---

### 6 · Founder lesson — many small products vs one big one
**Type:** Founder lesson · **Status:** drafted
> Running many small products at once teaches you where your time actually goes. It is rarely the feature work. It is the shared plumbing: auth, payments, deploys, the same three bugs in slightly different shapes across every app.
>
> The thing that made a portfolio manageable for one person was pushing that plumbing into shared code, so a fix in one place lands everywhere. When that broke down, every tool drifted into its own subtle version of the same problem.

**CTA:** none. **Hashtags:** #SoloFounder #IndieHackers #BuildInPublic #SaaS #Startups

---

### 7 · Tool spotlight — mdothree utilities
**Type:** Tool spotlight · **Status:** drafted
> mdothree.com is a set of small browser utilities that do one job with no signup: format JSON, generate a hash, make a QR code, convert a timestamp, check color contrast, and a few more.
>
> They exist because I kept opening a new tab to do these mid-task and wanted them in one clean place that respected the work. Everything runs in the browser.

**CTA:** Browse them at mdothree.com. **Hashtags:** #WebDev #DeveloperTools #Productivity #Utilities #Frontend

---

### 8 · Category education — why numerology and horoscopes feel accurate
**Type:** Category education · **Status:** drafted
> There is a well-documented reason a generic personality description can feel personally accurate. It is called the Barnum or Forer effect: people rate vague, broadly-true statements as highly specific to them, especially when the statement is flattering and they believe it was made for them.
>
> It is worth knowing whether you read horoscopes for fun or build tools that generate them. The effect is not a trick so much as a feature of how we read ourselves into open-ended language.
>
> [CITATION NEEDED: Forer 1949 / Barnum effect reference, resolving URL]

**CTA:** none. **Hashtags:** #Psychology #BehavioralScience #AI #Design #ProductDesign

---

### 9 · Build log — the landing site theme + dark mode
**Type:** Build log · **Status:** drafted
> Small polish item this week: a proper dark and light mode across the MDO3D landing site, with the theme applied before the page paints so there is no flash of the wrong color on load.
>
> The bug that made it worth writing down: one featured section used the text-color variable as its background. In light mode that read as a dark band, which was the intent. In dark mode the same variable flipped to near-white, so the section turned into a white block. The fix was to stop reusing a variable that is meant to invert with the theme.

**CTA:** Take a look at mdo3d.com. **Hashtags:** #WebDev #CSS #Frontend #BuildInPublic #UIDesign

---

### 10 · Category education — behavioral interviews (STAR)
**Type:** Category education · **Status:** drafted
> A large share of interview questions are behavioral: "tell me about a time you..." Interviewers use them because past behavior is a more reliable signal than hypotheticals. A widely-taught way to answer is STAR: describe the Situation, the Task, the Action you took, and the Result.
>
> The common failure is spending three sentences on the situation and one on the action. The action and the result are the parts the interviewer is actually scoring.
>
> [CITATION NEEDED: a real source on structured/behavioral interviewing, resolving URL]

**CTA:** none. **Hashtags:** #Interviewing #CareerAdvice #JobSearch #Hiring #ProfessionalDevelopment

---

### 11 · Tool spotlight — the career suite (Rigor)
**Type:** Tool spotlight · **Status:** drafted
> The career tools under Rigor now cover the pieces of a job search that benefit from a second pass: a resume analyzer, a cover-letter writer, a LinkedIn profile optimizer, an interview coach, a salary-negotiation helper, a portfolio reviewer, and a networking-email writer. Each lives on its own subdomain under rigor.design.
>
> They were built for the moment right before you hit send, when a specific, honest read of your draft is worth more than another template.

**CTA:** See them at rigor.design. **Hashtags:** #CareerDevelopment #JobSearch #AI #CareerTools #Productivity

---

### 12 · Founder lesson — the free tier
**Type:** Founder lesson · **Status:** drafted
> Every MDO3D tool has a free tier that does something genuinely useful before it asks for anything. That is a deliberate constraint, not generosity. For a small studio with no ad budget, the free result is the only marketing that scales: it has to be good enough that a person would tell someone else about it.
>
> The hard part is drawing the line. Give away too little and no one sticks. Give away everything and there is nothing to charge for. I am still moving that line, per tool, and watching what happens.

**CTA:** none. **Hashtags:** #IndieHackers #SaaS #Pricing #BuildInPublic #SoloFounder

---

## Scheduling notes
- Order: **1 first** (studio intro), then alternate education / build / spotlight so no two same-type posts run back to back.
- ~3 posts/week across ~4 weeks. Vary weekday and time; skip weekends.
- Resolve every `[CITATION NEEDED]` with a real URL, or cut the claim, before approving.
- Do not schedule any row that has not been approved in the review lane.
