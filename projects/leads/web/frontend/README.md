# Ridgefield — Lead Intelligence Platform

A full-stack lead management and enrichment platform built with React + Vite.

## Getting Started

```bash
npm install
npm run dev
```

## Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Root component, routing, global state
├── styles/
│   └── global.css        # Design system — tokens, typography, all component CSS
├── constants/
│   ├── leads.js          # Mock lead data + activity feed
│   ├── plans.js          # Subscription plans, entity types, cadence options
│   └── pipeline.js       # Pipeline log step definitions
├── utils/
│   └── helpers.js        # statusVariant, segmentVariant, scoreColor
├── components/
│   ├── Badge.jsx
│   ├── Btn.jsx
│   ├── Field.jsx
│   ├── Footer.jsx
│   ├── Modal.jsx
│   ├── NavBar.jsx
│   ├── SectionHeader.jsx
│   ├── TagInput.jsx
│   └── Toggle.jsx
└── pages/
    ├── OnboardingPage.jsx   # 4-step signup: account → plan → payment → preferences
    ├── DashboardPage.jsx    # Stats, activity feed, segment breakdown
    ├── LeadsPage.jsx        # Filterable/sortable lead table with bulk actions
    ├── LeadDetailPage.jsx   # Full lead card with enrichment + edit mode
    ├── PipelinePage.jsx     # Manual run, live logs, cron schedule config
    ├── BillingPage.jsx      # Plan, payment method, usage bars, invoices
    └── SettingsPage.jsx     # Profile, API keys, report preferences, danger zone
```

## Design System

Matches the Ridgefield site exactly:
- **DM Serif Display** — headlines and page titles
- **DM Sans** — body text and descriptions
- **DM Mono** — labels, tags, nav links, buttons, metadata
- Colors: `--navy`, `--ink`, `--white`, `--cream`, `--off`, `--mid`, `--light`, `--border`
