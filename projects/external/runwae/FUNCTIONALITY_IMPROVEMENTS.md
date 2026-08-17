# Runwae LLM Functionality Implementation Plan

## Executive Summary

This document outlines the recommended approach for implementing LLM functionality in Runwae, an influencer marketing platform. Based on analysis of the current Runwae architecture and the production-grade LLM implementation in AHL's Chief project, **a hybrid approach with backend-first LLM processing is recommended**.

---

## Current State Analysis

### Runwae Architecture
- **Frontend**: Static HTML/CSS/JS with jQuery, Bootstrap, Handlebars
- **Backend**: Firebase RTDB (real-time database) + Firebase Auth
- **Payments**: Stripe integration
- **Hosting**: Vercel (static deployment)
- **No traditional API layer** - direct Firebase communication from browser

### Chief/Tillio LLM Architecture (Reference)
- **Two-phase LLM orchestration**: Intent classification → Query processing
- **Provider abstraction**: Supports Anthropic (Claude) and OpenAI with fallback
- **Smart RAG**: 3-tier endpoint selection (keyword → embedding → LLM)
- **Cost optimization**: Prompt caching, data limiting, usage tracking
- **Streaming support**: Real-time response delivery

---

## Recommendation: Backend-First Implementation

### Why NOT Pure Client-Side?

| Concern | Impact |
|---------|--------|
| **API Key Exposure** | Client-side requires exposing LLM API keys in browser (critical security risk) |
| **Cost Control** | No rate limiting or usage caps - users could drain your API budget |
| **Prompt Protection** | System prompts visible in network tab (IP theft risk) |
| **RAG Complexity** | Retrieval logic, embeddings, and context injection better suited for backend |
| **Token Management** | Data limiting and context truncation require server-side processing |

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Proposal UI │  │ Message UI  │  │ Content Assistant UI    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┴──────────────────────┘                │
│                          │                                       │
│                    fetch('/api/llm/...')                        │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                    VERCEL FUNCTIONS                              │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │                    /api/llm/                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ /generate   │  │ /suggest    │  │ /analyze        │   │  │
│  │  │  proposal   │  │  reply      │  │  profile        │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │              LLM Service Module                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │ Intent       │  │ Provider     │  │ Usage          │  │  │
│  │  │ Classifier   │  │ (Claude/GPT) │  │ Tracker        │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────────┘  │  │
│  └───────────────────────┬───────────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    FIREBASE RTDB                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ /users      │  │ /items      │  │ /llm_usage              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Backend Infrastructure (Foundation)

#### 1.1 Create Vercel Functions Structure
```
/api/
├── llm/
│   ├── generate-proposal.js    # Generate proposal text
│   ├── suggest-reply.js        # Message reply suggestions
│   ├── optimize-profile.js     # Profile improvement suggestions
│   ├── search-semantic.js      # Natural language search
│   └── _lib/
│       ├── llm-client.js       # LLM provider abstraction
│       ├── intent-classifier.js # Two-phase intent routing
│       ├── context-builder.js  # Build context from Firebase data
│       ├── usage-tracker.js    # Track per-user usage
│       └── rate-limiter.js     # Prevent abuse
```

#### 1.2 LLM Client Module (Adapted from Chief)
```javascript
// /api/llm/_lib/llm-client.js
import Anthropic from '@anthropic-ai/sdk';

const MODELS = {
  fast: 'claude-3-5-haiku-20241022',    // Intent classification
  capable: 'claude-sonnet-4-20250514'    // Main processing
};

export class RunwaeLLMClient {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async classifyIntent(query) {
    // Phase 1: Fast intent classification
    const response = await this.anthropic.messages.create({
      model: MODELS.fast,
      max_tokens: 100,
      messages: [{ role: 'user', content: query }],
      system: INTENT_CLASSIFICATION_PROMPT
    });
    return this.parseIntent(response);
  }

  async process(query, intent, context) {
    // Phase 2: Full processing with context
    const systemPrompt = this.buildSystemPrompt(intent);
    const response = await this.anthropic.messages.create({
      model: MODELS.capable,
      max_tokens: 1024,
      messages: [
        { role: 'user', content: this.buildUserMessage(query, context) }
      ],
      system: systemPrompt
    });
    return response.content[0].text;
  }
}
```

#### 1.3 Firebase Admin SDK Integration
```javascript
// /api/llm/_lib/firebase-admin.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

export const db = admin.database();
export const auth = admin.auth();
```

### Phase 2: Core LLM Features

#### 2.1 Proposal Generation
**Endpoint**: `POST /api/llm/generate-proposal`

**Use Case**: Influencers can auto-generate proposal text based on the marketing opportunity details.

```javascript
// /api/llm/generate-proposal.js
import { RunwaeLLMClient } from './_lib/llm-client';
import { db } from './_lib/firebase-admin';
import { verifyAuth, trackUsage, rateLimit } from './_lib/middleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth & rate limiting
    const user = await verifyAuth(req);
    await rateLimit(user.uid, 'generate-proposal', 10); // 10/hour

    const { itemKey, platform, style } = req.body;

    // Fetch item context from Firebase
    const itemSnap = await db.ref(`items/${itemKey}`).once('value');
    const item = itemSnap.val();

    // Fetch user profile for personalization
    const userSnap = await db.ref(`users/${user.uid}`).once('value');
    const userProfile = userSnap.val();

    // Build context
    const context = {
      opportunity: {
        caption: item.caption,
        compensation: item.compensation,
        price: item.price,
        platforms: item.platforms
      },
      influencer: {
        name: userProfile.name,
        description: userProfile.description,
        badges: userProfile.badges
      },
      platform,
      style // 'professional', 'casual', 'creative'
    };

    // Generate proposal
    const client = new RunwaeLLMClient();
    const proposal = await client.process(
      'Generate a proposal for this influencer marketing opportunity',
      'GENERATE_PROPOSAL',
      context
    );

    // Track usage
    await trackUsage(user.uid, 'generate-proposal');

    return res.status(200).json({
      proposal,
      tokens_used: client.lastUsage
    });

  } catch (error) {
    console.error('Proposal generation error:', error);
    return res.status(500).json({ error: 'Failed to generate proposal' });
  }
}
```

#### 2.2 Message Reply Suggestions
**Endpoint**: `POST /api/llm/suggest-reply`

**Use Case**: Suggest contextual replies in conversations.

```javascript
// Context includes conversation history + gig status
const context = {
  conversation: recentMessages,  // Last 10 messages
  gigStatus: gig?.status,
  userRole: user.role,           // 'marketer' or 'influencer'
  tone: 'professional'
};
```

#### 2.3 Profile Optimization
**Endpoint**: `POST /api/llm/optimize-profile`

**Use Case**: Suggest improvements to influencer profiles.

```javascript
// Analyze profile and suggest improvements
const suggestions = await client.process(
  'Analyze this influencer profile and suggest improvements',
  'OPTIMIZE_PROFILE',
  { profile: userProfile, topPerformers: aggregatedTopProfiles }
);
```

#### 2.4 Semantic Search
**Endpoint**: `POST /api/llm/search-semantic`

**Use Case**: Natural language search ("Find NYC food influencers with 10k+ followers").

```javascript
// Two-phase:
// 1. Parse natural language query into structured filters
// 2. Execute Firebase query with filters
const parsedQuery = await client.classifyIntent(naturalLanguageQuery);
// Returns: { location: 'NYC', badges: ['foodie'], minFollowers: 10000 }
```

### Phase 3: Advanced Features

#### 3.1 RAG for Content Recommendations
```javascript
// /api/llm/_lib/rag-service.js

export class RunwaeRAGService {
  // Build context from multiple Firebase paths
  async buildContext(userId, intent) {
    const [user, recentItems, userInterests, successfulGigs] = await Promise.all([
      db.ref(`users/${userId}`).once('value'),
      db.ref('items').orderByChild('time').limitToLast(50).once('value'),
      db.ref(`users/${userId}/interests`).once('value'),
      db.ref(`users/${userId}/gigs`).orderByChild('status').equalTo(7).limitToLast(20).once('value')
    ]);

    return {
      user: user.val(),
      availableOpportunities: this.filterRelevant(recentItems.val(), user.val()),
      pastInterests: userInterests.val(),
      completedGigs: successfulGigs.val()
    };
  }

  // Limit data to prevent token bloat (from Chief pattern)
  limitData(data, maxRecords = 10, maxSize = 8000) {
    if (Array.isArray(data) && data.length > maxRecords) {
      return {
        items: data.slice(0, maxRecords),
        _truncated: true,
        _original_count: data.length
      };
    }
    const json = JSON.stringify(data);
    if (json.length > maxSize) {
      return {
        ...data,
        _truncated: true,
        _truncated_at: maxSize
      };
    }
    return data;
  }
}
```

#### 3.2 Usage Tracking & Cost Control
```javascript
// /api/llm/_lib/usage-tracker.js

const PRICING = {
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },  // per 1M tokens
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 }
};

export class UsageTracker {
  async record(userId, model, inputTokens, outputTokens) {
    const cost = this.calculateCost(model, inputTokens, outputTokens);

    await db.ref(`llm_usage/${userId}`).push({
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });

    // Check daily limit
    const dailyUsage = await this.getDailyUsage(userId);
    if (dailyUsage > DAILY_LIMIT_USD) {
      throw new Error('Daily usage limit exceeded');
    }
  }
}
```

#### 3.3 Streaming Responses (Optional)
```javascript
// /api/llm/generate-proposal-stream.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  // ... auth & context building ...

  const stream = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    stream: true,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            controller.enqueue(event.delta.text);
          }
        }
        controller.close();
      }
    }),
    { headers: { 'Content-Type': 'text/event-stream' } }
  );
}
```

---

## Client-Side Integration

### API Client Module
```javascript
// /js/services/llm-service.js

class LLMService {
  constructor(authToken) {
    this.authToken = authToken;
    this.baseUrl = '/api/llm';
  }

  async generateProposal(itemKey, platform, style = 'professional') {
    const response = await fetch(`${this.baseUrl}/generate-proposal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ itemKey, platform, style })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate proposal');
    }

    return response.json();
  }

  async suggestReply(conversationKey, context) {
    // ... similar pattern
  }

  async optimizeProfile() {
    // ... similar pattern
  }

  async searchSemantic(query) {
    // ... similar pattern
  }
}

// Initialize with Firebase auth token
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    const token = await user.getIdToken();
    window.llmService = new LLMService(token);
  }
});
```

### UI Integration Example
```javascript
// In gigHQ.js - Add "Generate with AI" button to proposal form

$('#generate-proposal-btn').on('click', async function() {
  const $btn = $(this);
  const $textarea = $('#proposal-text');

  $btn.prop('disabled', true).text('Generating...');

  try {
    const result = await window.llmService.generateProposal(
      currentItemKey,
      selectedPlatform,
      'professional'
    );

    $textarea.val(result.proposal);
    showToast('Proposal generated! Review and edit as needed.');

  } catch (error) {
    showToast('Failed to generate proposal: ' + error.message, 'error');
  } finally {
    $btn.prop('disabled', false).text('Generate with AI');
  }
});
```

---

## Environment Variables

Add to Vercel project settings:

```bash
# LLM Provider
ANTHROPIC_API_KEY=sk-ant-...

# Firebase Admin SDK
FIREBASE_PROJECT_ID=runwae-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@runwae-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://runwae-xxxxx.firebaseio.com

# Usage Limits
LLM_DAILY_LIMIT_USD=10.00
LLM_RATE_LIMIT_PER_HOUR=20
```

---

## Cost Estimates

| Feature | Model | Tokens/Request | Cost/Request | Daily (100 users) |
|---------|-------|----------------|--------------|-------------------|
| Intent Classification | Haiku | ~200 | $0.0008 | $0.08 |
| Proposal Generation | Sonnet | ~2000 | $0.036 | $3.60 |
| Reply Suggestion | Sonnet | ~1000 | $0.018 | $1.80 |
| Profile Optimization | Sonnet | ~3000 | $0.054 | $5.40 |
| **Total Daily Estimate** | | | | **~$11/day** |

With prompt caching enabled (90% savings on system prompts), costs reduce significantly.

---

## Security Considerations

1. **API Key Protection**: Keys stored in Vercel env vars, never exposed to client
2. **Authentication**: All endpoints verify Firebase ID token
3. **Rate Limiting**: Per-user, per-endpoint limits prevent abuse
4. **Input Sanitization**: Strip potential prompt injection attempts
5. **Usage Caps**: Daily spending limits per user and globally
6. **Audit Logging**: Track all LLM requests for review

---

## Migration Path

### Week 1-2: Foundation
- [ ] Set up `/api/llm/` Vercel Functions structure
- [ ] Implement LLM client with Anthropic SDK
- [ ] Add Firebase Admin SDK integration
- [ ] Implement auth middleware and rate limiting

### Week 3-4: Core Features
- [ ] Implement proposal generation endpoint
- [ ] Add "Generate with AI" button to proposal UI
- [ ] Implement reply suggestion endpoint
- [ ] Add suggestion UI to messaging

### Week 5-6: Advanced Features
- [ ] Implement profile optimization
- [ ] Add semantic search
- [ ] Implement usage tracking dashboard
- [ ] Add streaming for long responses

### Week 7-8: Polish
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] User feedback collection
- [ ] Cost optimization (prompt caching)

---

## Conclusion

The recommended approach leverages Vercel Functions as a thin LLM gateway while keeping Firebase as the primary data store. This architecture:

1. **Protects API keys** and system prompts
2. **Enables cost control** through rate limiting and usage tracking
3. **Supports RAG** by fetching context from Firebase server-side
4. **Scales automatically** with Vercel's serverless infrastructure
5. **Maintains simplicity** - no new database or complex infrastructure

The Chief/Tillio implementation provides battle-tested patterns for two-phase processing, provider abstraction, and cost optimization that can be adapted for Runwae's influencer marketing context.
