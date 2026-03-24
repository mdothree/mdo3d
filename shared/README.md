# Shared Libraries & Components

This directory contains reusable code shared across multiple projects in the Lamar ecosystem.

## Structure

```
shared/
├── auth/              # Authentication utilities
├── payments/          # Payment processing (Stripe, etc.)
├── ui-components/     # Reusable UI components
└── api-clients/       # External API wrappers
```

## Guidelines

- Keep components framework-agnostic when possible
- Document all public APIs
- Add tests for shared utilities
- Version control breaking changes

## Usage

Import shared components into your project:

```javascript
import { StripeClient } from '../../../shared/payments/stripe.js';
import { AuthService } from '../../../shared/auth/firebase-auth.js';
```

Or use relative paths from your project location.
