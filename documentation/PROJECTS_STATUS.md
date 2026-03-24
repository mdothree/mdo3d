# Lamar Projects Status

**Last Updated:** 2026-03-20

## Quick Reference

| Tool | Location | Deployed | URL |
|------|----------|----------|-----|
| **DEPLOYED** ||||
| dreams | platforms/dream-interpreter | ✅ | dreams.mdo3d.com |
| tarot | platforms/tarot-cards | ✅ | tarot.mdo3d.com |
| oracle | platforms/oracle-cards | ✅ | oracle.mdo3d.com |
| pastlife | platforms/past-life-insights | ✅ | pastlife.mdo3d.com |
| fengshui | platforms/feng-shui-analyzer | ✅ | fengshui.mdo3d.com |
| names | platforms/baby-name-oracle | ✅ | names.mdo3d.com |
| numerology | platforms/business-name-generator | ✅ | numerology.mdo3d.com |
| guidance | platforms/guidance-mdo3d | ✅ | guidance.mdo3d.com |
| compare | platforms/mdo3d-compare | ✅ | compare.mdo3d.com |
| **NOT DEPLOYED** ||||
| mdothree-color | platforms/mdothree-color | ❌ | color.mdo3d.com |
| mdothree-hash | platforms/mdothree-hash | ❌ | hash.mdo3d.com |
| mdothree-image | platforms/mdothree-image | ❌ | image.mdo3d.com |
| mdothree-json | platforms/mdothree-json | ❌ | json.mdo3d.com |
| mdothree-password | platforms/mdothree-password | ❌ | password.mdo3d.com |
| mdothree-pdf | platforms/mdothree-pdf | ❌ | pdf.mdo3d.com |
| mdothree-qr | platforms/mdothree-qr | ❌ | qr.mdo3d.com |
| mdothree-text | platforms/mdothree-text | ❌ | text.mdo3d.com |
| mdothree-timestamp | platforms/mdothree-timestamp | ❌ | timestamp.mdo3d.com |
| career-horoscope | platforms/career-horoscope | ❌ | horoscope.mdo3d.com |

## Platforms Directory

**Location:** `~/lamar/platforms/`

```
platforms/
├── guidance-mdo3d/          # ✅ Deployed
├── dream-interpreter/        # ✅ Deployed
├── tarot-cards/             # ✅ Deployed
├── oracle-cards/            # ✅ Deployed
├── past-life-insights/      # ✅ Deployed
├── feng-shui-analyzer/      # ✅ Deployed
├── baby-name-oracle/        # ✅ Deployed
├── business-name-generator/  # ✅ Deployed
├── mdo3d-landing/          # ✅ Deployed
├── mdo3d-compare/          # ✅ Deployed
├── mdothree-color/          # ❌ Code exists, not deployed
├── mdothree-hash/           # ❌ Code exists, not deployed
├── mdothree-image/          # ❌ Code exists, not deployed
├── mdothree-json/           # ❌ Code exists, not deployed
├── mdothree-password/       # ❌ Code exists, not deployed
├── mdothree-pdf/           # ❌ Code exists, not deployed
├── mdothree-qr/            # ❌ Code exists, not deployed
├── mdothree-text/          # ❌ Code exists, not deployed
├── mdothree-timestamp/      # ❌ Code exists, not deployed
├── career-horoscope/        # ❌ Code exists, not deployed
├── rigor-resume/           # ✅ Deployed (resume.rigor.design)
├── rigor-cover/            # ✅ Deployed
├── rigor-linkedin/         # ✅ Deployed
├── rigor-interview/        # ✅ Deployed
├── rigor-portfolio/        # ✅ Deployed
├── rigor-networking/       # ✅ Deployed
├── rigor-salary/           # ✅ Deployed
├── ronnascanner-leads/     # ✅ Deployed (leads.ronnascanner.com)
├── ronnascanner-contacts/  # ✅ Deployed
├── ronnascanner-prospects/ # ✅ Deployed
├── ronnascanner-emails/   # ✅ Deployed
├── ronnascanner-companies/ # ✅ Deployed
├── runwae/                 # ✅ Deployed (runwae.com)
└── rigor-landing/         # ✅ Deployed (rigor.design)
```

## Deployment Commands

```bash
cd ~/lamar/platforms/[tool-name]
export VERCEL_TOKEN="vcp_7xpARJryGnJWSYto1jfZtdYgKyZyC0KGkNoyy7EFf2Cgq8MKSP1FXvUK"
vercel --prod --yes
```

## DNS Configuration

After deployment, add custom domain via Vercel API:
```bash
# Get project ID
curl -s "https://api.vercel.com/v4/projects" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq '.projects[].id, .name'

# Add domain
curl -X POST "https://api.vercel.com/v4/projects/[PROJECT_ID]/domains" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"subdomain.mdo3d.com"}'
```

## Missing Tools (Not Built)

- astrology (astrology.mdo3d.com)
- iching (iching.mdo3d.com)
- runes (runes.mdo3d.com)

These need to be built from scratch.
