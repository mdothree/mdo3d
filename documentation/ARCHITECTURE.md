# Platform Architecture Standard

This document defines the standard architecture for all Lamar platforms.

## Directory Structure

Every platform must follow this structure:

```
platform-name/
├── public/                     # Frontend static files
│   ├── index.html             # Main HTML file
│   ├── css/
│   │   └── styles.css         # Main stylesheet
│   └── js/
│       ├── app.js             # Main application entry point
│       ├── config/            # Configuration files
│       │   ├── api.js         # API client configuration
│       │   └── firebase.js    # Firebase configuration
│       ├── services/          # Business logic services
│       │   └── authService.js # Authentication service
│       ├── components/        # Reusable UI components (optional)
│       └── ui/                # UI-specific utilities (optional)
├── src/                       # Backend data/databases
│   └── database.js            # Data files (cards, symbols, etc.)
├── package.json               # NPM dependencies
├── vercel.json                # Vercel deployment config
└── README.md                  # Platform documentation
```

## Required Files

### 1. `public/index.html`
**Purpose**: Main HTML entry point

**Requirements**:
- Semantic HTML5
- Open Graph meta tags
- Twitter Card meta tags
- SEO meta description
- Module script import: `<script src="js/app.js" type="module"></script>`

**Template**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Platform Name - Description</title>
    <meta name="description" content="SEO description">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Platform Name">
    <meta property="og:description" content="Description">
    <meta property="og:image" content="https://platform.vercel.app/og-image.jpg">
    <meta property="og:url" content="https://platform.vercel.app">
    <meta property="og:type" content="website">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Platform Name">
    <meta name="twitter:description" content="Description">
    <meta name="twitter:image" content="https://platform.vercel.app/og-image.jpg">
    
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Content -->
    <script src="js/app.js" type="module"></script>
</body>
</html>
```

---

### 2. `public/js/app.js`
**Purpose**: Main application logic and initialization

**Requirements**:
- ES6 module
- Import all necessary services
- Initialize Firebase and Auth
- Check API health on load
- Export nothing (entry point only)

**Template**:
```javascript
import { apiClient } from './config/api.js';
import { firebaseConfig } from './config/firebase.js';
import { authService } from './services/authService.js';
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';
import { ShareImageGenerator } from '../../../shared/ui-components/ShareImageGenerator.js';

class PlatformApp {
    constructor() {
        this.api = apiClient;
        this.auth = authService;
        this.currentData = null;
        
        // Initialize social sharing
        this.socialShare = new SocialShare({
            title: 'Platform Name',
            hashtags: ['Tag1', 'Tag2'],
            via: 'PlatformName'
        });
        
        this.initialize();
    }

    async initialize() {
        // Initialize Firebase
        await firebaseConfig.initialize();
        await this.auth.initialize();
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Check API health
        this.checkApiHealth();
    }

    async checkApiHealth() {
        try {
            const health = await this.api.checkHealth();
            console.log('API Status:', health.status);
        } catch (error) {
            console.error('API health check failed:', error);
            console.warn('Backend API may be offline. Premium features disabled.');
        }
    }

    initializeEventListeners() {
        // Setup event listeners
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PlatformApp();
});
```

---

### 3. `public/js/config/api.js`
**Purpose**: API client configuration and methods

**Requirements**:
- Export singleton `apiClient`
- Support localhost and production URLs
- Timeout handling
- Error handling
- Standard endpoints: `/health`, `/api/*`

**Template**:
```javascript
const API_CONFIG = {
    baseURL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3XXX'
        : 'https://platform-api.railway.app',
    timeout: 30000
};

class APIClient {
    constructor(config) {
        this.baseURL = config.baseURL;
        this.timeout = config.timeout;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    async checkHealth() {
        try {
            return await this.request('/health');
        } catch (error) {
            return { status: 'offline', error: error.message };
        }
    }

    // Platform-specific methods...
}

export const apiClient = new APIClient(API_CONFIG);
```

---

### 4. `public/js/config/firebase.js`
**Purpose**: Firebase initialization and configuration

**Requirements**:
- Export singleton `firebaseConfig`
- Lazy initialization
- Fallback for development (no Firebase needed)
- Analytics tracking helper

**Template**:
```javascript
class FirebaseConfig {
    constructor() {
        this.initialized = false;
        this.app = null;
        this.analytics = null;
        this.db = null;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const config = {
                apiKey: "YOUR_API_KEY",
                authDomain: "platform.firebaseapp.com",
                projectId: "platform-name",
                storageBucket: "platform.appspot.com",
                messagingSenderId: "YOUR_SENDER_ID",
                appId: "YOUR_APP_ID",
                measurementId: "YOUR_MEASUREMENT_ID"
            };

            console.log('Firebase config ready (development mode)');
            this.initialized = true;

        } catch (error) {
            console.error('Firebase initialization failed:', error);
            this.initialized = true;
        }
    }

    getFirestore() {
        return this.db;
    }

    getAnalytics() {
        return this.analytics;
    }

    trackEvent(eventName, params = {}) {
        console.log('Analytics Event:', eventName, params);
    }
}

export const firebaseConfig = new FirebaseConfig();
```

---

### 5. `public/js/services/authService.js`
**Purpose**: User authentication and session management

**Requirements**:
- Export singleton `authService`
- Anonymous user support
- LocalStorage session persistence
- Optional Firebase Auth integration

**Template**:
```javascript
class AuthService {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const savedUser = localStorage.getItem('platform_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
            }
            this.initialized = true;
        } catch (error) {
            console.error('Auth initialization failed:', error);
            this.initialized = true;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    async createAnonymousUser() {
        const user = {
            uid: 'anon_' + Date.now(),
            isAnonymous: true,
            createdAt: new Date().toISOString()
        };

        this.currentUser = user;
        localStorage.setItem('platform_user', JSON.stringify(user));
        return user;
    }

    async signOut() {
        this.currentUser = null;
        localStorage.removeItem('platform_user');
    }
}

export const authService = new AuthService();
```

---

### 6. `package.json`
**Purpose**: NPM configuration and scripts

**Requirements**:
- `type: "module"` for ES6 modules
- Dev server script
- Deploy script

**Template**:
```json
{
  "name": "platform-name",
  "version": "1.0.0",
  "description": "Platform description",
  "type": "module",
  "scripts": {
    "dev": "npx http-server public -p 8XXX -o",
    "build": "echo 'Static site - no build needed'",
    "deploy": "vercel --prod"
  },
  "keywords": ["keyword1", "keyword2"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "http-server": "^14.1.1"
  }
}
```

---

### 7. `vercel.json`
**Purpose**: Vercel deployment configuration

**Template**:
```json
{
  "version": 2,
  "public": true,
  "builds": [
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

### 8. `README.md`
**Purpose**: Platform documentation

**Required Sections**:
- Description
- Features (Free and Premium tiers)
- Tech Stack
- Quick Start
- Deployment
- Revenue Model
- API Endpoints (if applicable)

---

## Data Files

### `src/database.js`
**Purpose**: Platform-specific data (cards, symbols, etc.)

**Requirements**:
- ES6 module export
- Comprehensive data array
- Helper functions (search, filter, random, etc.)

**Template**:
```javascript
export const data = [
  // Data items...
];

export const searchData = (query) => {
  // Search logic
};

export const getRandomItem = () => {
  return data[Math.floor(Math.random() * data.length)];
};
```

---

## Social Sharing Integration

**Required** on all platforms:

```javascript
import { SocialShare } from '../../../shared/ui-components/SocialShare.js';
import { ShareImageGenerator } from '../../../shared/ui-components/ShareImageGenerator.js';

// In constructor
this.socialShare = new SocialShare({
    title: 'Platform Name',
    hashtags: ['Tag1', 'Tag2'],
    via: 'PlatformHandle'
});

// Share method
async shareResult() {
    const imageBlob = await ShareImageGenerator.generateGenericImage({
        title: 'Result Title',
        subtitle: 'Result details',
        brandColor: '#hexcolor'
    });

    await this.socialShare.share({
        text: 'Share text',
        url: window.location.origin,
        image: imageBlob
    });
}
```

---

## API Backend Structure

Each platform with premium features needs a backend API:

```
platform-api/
├── src/
│   ├── server.js              # Express server
│   ├── routes/                # API routes
│   │   ├── reading.js
│   │   └── payment.js
│   ├── services/              # Business logic
│   │   ├── claudeService.js   # AI integration
│   │   └── stripeService.js   # Payments
│   └── utils/                 # Helpers
│       └── logger.js
├── .env.example               # Environment template
├── package.json
└── README.md
```

---

## Environment Variables

### Frontend (none needed - config in code)

### Backend (`.env`)
```bash
# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Firebase (separate project per platform)
FIREBASE_PROJECT_ID=platform-name
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Server
PORT=3XXX
NODE_ENV=development
```

---

## Deployment Checklist

Before deploying any platform:

- [ ] All required files present
- [ ] Config files properly set up
- [ ] Social sharing integrated
- [ ] API health check working
- [ ] Firebase initialized
- [ ] Auth service initialized
- [ ] Open Graph tags complete
- [ ] SEO meta tags set
- [ ] README.md complete
- [ ] package.json scripts working
- [ ] vercel.json configured
- [ ] API endpoints tested (if applicable)
- [ ] Error handling in place
- [ ] Console logs cleaned (or using logger)

---

## Port Assignments

To avoid conflicts:

| Platform | Frontend Port | API Port |
|----------|--------------|----------|
| Oracle Cards | 8080 | 3002 |
| Tarot Cards | 8081 | 3003 |
| Resume Analyzer | 8082 | 3001 |
| Dream Interpreter | 8083 | 3004 |
| Numerology | 8084 | 3005 |
| Feng Shui | 8085 | 3006 |

---

## Best Practices

1. **Async/Await**: Always use async/await, never callbacks
2. **Error Handling**: Try/catch blocks around all API calls
3. **Loading States**: Show loading indicators during async operations
4. **User Feedback**: Alert or toast notifications for actions
5. **Mobile First**: Responsive design from the start
6. **Performance**: Lazy load large assets
7. **Security**: Never expose API keys in frontend code
8. **Analytics**: Track key user actions
9. **SEO**: Semantic HTML and proper meta tags
10. **Accessibility**: ARIA labels where needed

---

## Code Style

- **Variables**: camelCase
- **Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case.js
- **Indentation**: 4 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use
- **Comments**: JSDoc style for functions

---

## Testing Strategy

1. **Manual Testing**: Test all user flows locally
2. **Cross-Browser**: Test in Chrome, Firefox, Safari
3. **Mobile**: Test on actual mobile devices
4. **API Testing**: Use Postman for backend endpoints
5. **Error Cases**: Test network failures, timeouts
6. **Edge Cases**: Empty states, long text, special characters

---

**Last Updated**: February 28, 2026  
**Version**: 1.0  
**Applies To**: All Lamar platforms
