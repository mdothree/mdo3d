# Shared Libraries & Components

This directory contains reusable code shared across multiple projects in the Lamar ecosystem.

## Structure

Actual contents (checked 2026-11-03; ORG-08). Earlier drafts of this file listed `auth/`, `payments/` and `api-clients/`, which do not exist.

```
shared/
├── services/stripeService.js   # exports class StripeService
├── mdothree/                   # MDOThree site kit: firebase.js (initFirebase, saveToHistory, getHistory; exports auth, db, analytics), config.js, stripe-paywall.js, pricing.*, account.*, ui helpers, service worker
├── ui-components/              # SocialShare.js (class SocialShare, shareModalStyles), ShareImageGenerator.js, entitlement.js
├── utils/numerology.js         # calculateLifePath, calculateExpression, calculateNumerologyProfile, ...
├── utilities/                  # firebase-config.js + shared Firestore rules/indexes
├── career/ leads/ spiritual/   # per-product-family firebase-config.js, firebase.json, firestore.rules, firestore.indexes.json
├── trauma/api/                 # trauma product API
└── rules-tests/                # Firestore rules tests (package.json)
```

## Guidelines

- Keep components framework-agnostic when possible
- Document all public APIs
- Add tests for shared utilities
- Version control breaking changes

## Usage

Import from the real module paths (ES modules; adjust the relative depth to your project):

```javascript
import { StripeService } from '../../../shared/services/stripeService.js';
import { initFirebase, saveToHistory } from '../../../shared/mdothree/firebase.js';
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';
```

Distribution: several products carry their own copy of these files (for example `SocialShare.js` is duplicated in product `public/js/` trees), so a fix here must be ported to each copy; direct import versus bundled copy is decided per product. Check a module's current exports before copying an example: the examples above were written from the files' `export` lines, not from running them.
