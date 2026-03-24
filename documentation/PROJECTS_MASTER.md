# Lamar Project Master Overview

**Generated**: 2026-03-19  
**Status**: Specs Ready → Code Generation Pending

---

## Summary

| Brand | Projects | Spec Status | Code Status |
|-------|----------|-------------|-------------|
| **rigor.design** | 8 | ✅ Ready | ❌ Pending |
| **mdothree.com** | 10 | ✅ Ready | ❌ Pending |
| **ronnascanner.com** | 6 | ✅ Ready | ❌ Pending |
| **Total** | **24** | ✅ Complete | ❌ Pending |

---

## rigor.design — Professional Career Tools

### Agent 1: Career Tools (4 projects)

| # | Project | Description | Subdomain | Pricing |
|---|---------|-------------|-----------|--------|
| 1 | rigor-resume | ATS resume analyzer | resume.rigor.design | Free tier + $29 premium |
| 2 | rigor-cover | AI cover letter generator | cover.rigor.design | Free tier + $19 premium |
| 3 | rigor-linkedin | LinkedIn profile optimizer | linkedin.rigor.design | Free tier + $24 premium |
| 4 | rigor-interview | AI interview prep coach | interview.rigor.design | Free tier + $34 premium |

### Agent 2: Secondary Tools (4 projects)

| # | Project | Description | Subdomain | Pricing |
|---|---------|-------------|-----------|--------|
| 5 | rigor-salary | Salary negotiation helper | salary.rigor.design | Free tier + $19 premium |
| 6 | rigor-portfolio | Portfolio review tool | portfolio.rigor.design | Free tier + $29 premium |
| 7 | rigor-networking | Networking email generator | networking.rigor.design | Free tier + $15 premium |
| 8 | rigor-api | Shared API (serverless) | api.rigor.design | Internal |

### rigor.design Tech Stack
- Frontend: Vanilla JS + CSS (Vercel static)
- Backend: Vercel Serverless Functions
- Auth/DB: Firebase
- Payments: Stripe Checkout
- AI: Claude API

---

## mdothree.com — Utility Tools

### Agent 3: Utilities Part 1 (5 projects)

| # | Project | Description | Subdomain | Pricing |
|---|---------|-------------|-----------|--------|
| 9 | mdothree-pdf | PDF merge, split, compress | pdf.mdothree.com | Free + $9 premium |
| 10 | mdothree-image | Image resize, convert, crop | image.mdothree.com | Free + $9 premium |
| 11 | mdothree-qr | QR generator + decoder | qr.mdothree.com | Free |
| 12 | mdothree-text | Word counter, diff, formatter | text.mdothree.com | Free |
| 13 | mdothree-json | JSON formatter, validator | json.mdothree.com | Free |

### Agent 4: Utilities Part 2 + Landing (5 projects)

| # | Project | Description | Subdomain | Pricing |
|---|---------|-------------|-----------|--------|
| 14 | mdothree-hash | Hash generator (MD5, SHA) | hash.mdothree.com | Free |
| 15 | mdothree-password | Password generator + strength | password.mdothree.com | Free |
| 16 | mdothree-timestamp | Timestamp converter | timestamp.mdothree.com | Free |
| 17 | mdothree-color | Color picker + palette | color.mdothree.com | Free |
| 18 | mdothree-landing | Hub landing page | mdothree.com | N/A |

### mdothree.com Tech Stack
- Frontend: Vanilla JS + CSS (Vercel static)
- Backend: Client-side (most tools) or Firebase Functions
- Auth: Optional Firebase
- Payments: Optional Stripe

---

## ronnascanner.com — Lead Generation Tools

### Agent 5: Lead Gen Suite (6 projects)

| # | Project | Description | Subdomain | Pricing |
|---|---------|-------------|-----------|--------|
| 19 | ronnascanner-leads | Business lead scanner | leads.ronnascanner.com | Free 10/mo + $49-199/mo |
| 20 | ronnascanner-contacts | Contact finder | contacts.ronnascanner.com | Free 5/mo + $79+/mo |
| 21 | ronnascanner-prospects | Prospect research | prospects.ronnascanner.com | Free 3/mo + $99+/mo |
| 22 | ronnascanner-emails | Email finder/verifier | emails.ronnascanner.com | Free 50/mo + $39+/mo |
| 23 | ronnascanner-companies | Company database | companies.ronnascanner.com | Free browse + $59+/mo |
| 24 | ronnascanner-api | Shared API (serverless) | api.ronnascanner.com | Internal |

### ronnascanner.com Tech Stack
- Frontend: Vanilla JS + CSS (Vercel static)
- Backend: Vercel Serverless Functions
- Auth/DB: Firebase
- Payments: Stripe Checkout
- External APIs: Apollo, Hunter, Clearbit, ZoomInfo

---

## Existing Code (Already Built)

| Platform | Location | Status |
|----------|----------|--------|
| resume-analyzer | ~/lamar/platforms/resume-analyzer | ✅ Complete |
| dream-interpreter | ~/lamar/platforms/dream-interpreter | ✅ Complete |
| tarot-cards | ~/lamar/platforms/tarot-cards | ✅ Complete |
| oracle-cards | ~/lamar/platforms/oracle-cards | ✅ Complete |
| trauma-evaluation | ~/lamar/platforms/trauma-evaluation | ✅ Complete |
| feng-shui-analyzer | ~/lamar/platforms/feng-shui-analyzer | ✅ Complete |
| astrology-horoscope | ~/lamar/platforms/astrology-horoscope | ✅ Complete |
| numerology-calculator | ~/lamar/platforms/numerology-calculator | ✅ Complete |
| past-life-insights | ~/lamar/platforms/past-life-insights | ✅ Complete |

---

## GitHub Repos

**Organization**: [mdothree](https://github.com/mdothree)

### Landing Pages (exist)
- rigor-landing
- mdothree-landing
- ronnascanner-landing
- mdo3d-landing

### Project Repos (need code)
All other repos exist as empty starters from project_hack.py

---

## Deployment Pipeline

1. **Code Generation** → ~/Downloads/lamar-code-generation/
2. **Copy to local** → ~/lamar/platforms/[project-name]/
3. **Push to GitHub** → mdothree/[repo-name]
4. **Link to Vercel** → Create project, connect repo
5. **Configure env vars** → Set Firebase, Stripe, API keys
6. **Deploy** → Automatic on push

---

## Dependencies Summary

### Firebase Projects Needed
- `rigor-desk` (for all rigor.design tools)
- `mdothree-com` (for mdothree tools)
- `ronnascanner` (for lead gen tools)

### Stripe Products to Create
- rigor-resume: $29/mo premium
- rigor-cover: $19/mo premium
- rigor-linkedin: $24/mo premium
- rigor-interview: $34/mo premium
- rigor-salary: $19/mo premium
- rigor-portfolio: $29/mo premium
- rigor-networking: $15/mo premium
- ronnascanner: Various credit packages

### External API Keys Needed
- Anthropic (Claude): For all AI features
- Apollo.io: Lead/contact data
- Hunter.io: Email finding
- Clearbit: Company enrichment
- ZoomInfo: Contact data

---

## File Locations

| Document | Location |
|----------|----------|
| Agent Specs | ~/Downloads/lamar-code-generation/Agent[N]-[name]/SPEC.md |
| Shared Components | ~/Downloads/lamar-code-generation/shared/SHARED_COMPONENTS.md |
| Master Overview | ~/lamar/PROJECTS_MASTER.md (this file) |
| Domain Registry | ~/latarence/MASTER_DOMAIN_REGISTRY.md |
| Lamar Docs | ~/lamar/platforms/PROJECTS_STATUS.md |
| Ecosystem Page | ~/latarence/web/ecosystem.html |

---

## Next Steps

- [ ] Generate code for Agent 1 (4 projects)
- [ ] Generate code for Agent 2 (4 projects)
- [ ] Generate code for Agent 3 (5 projects)
- [ ] Generate code for Agent 4 (5 projects)
- [ ] Generate code for Agent 5 (6 projects)
- [ ] Create Firebase projects
- [ ] Configure Stripe products
- [ ] Get external API keys
- [ ] Deploy and test
- [ ] Update ecosystem.html status badges
