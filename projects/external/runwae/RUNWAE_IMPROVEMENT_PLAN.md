# Runwae Platform Improvement Plan

**Created:** 2026-05-03
**Status:** Draft
**Priority Areas:** UI Polish, Stripe Modernization, Agreement Flow UX

---

## Executive Summary

This document outlines remaining improvements for the Runwae influencer marketing platform. Many UI modernization efforts have been completed (theming, dark mode, feed cards, chat drawer). This plan addresses the remaining gaps.

---

## 1. Stripe Implementation Review

### Current State

The Stripe integration uses **older patterns** that should be reviewed:

| Component | Current Implementation | Status |
|-----------|----------------------|--------|
| Stripe.js | v3 CDN (`https://js.stripe.com/v3/`) | ⚠️ OK but check for deprecated APIs |
| Payment Form | Stripe Elements (Card Element) | ✅ Current approach |
| Server Endpoint | `/charge` POST | ⚠️ Needs verification |
| Influencer Payout | Stripe Connect OAuth | ⚠️ Review for Express/Standard migration |

### Stripe Connect OAuth Flow (gig.html:684)

```html
<!-- Current: Standard Connect OAuth -->
<a href="https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_ErI4AkdbhU0utLvqC2EBqGowHmBFgQqQ&scope=read_write">
  Accept Payment With Stripe
</a>
```

**Issues to Investigate:**
1. Is the `/charge` endpoint on a backend server, or is this a placeholder?
2. Stripe Connect OAuth requires a backend callback handler (`/oauth/callback`)
3. Standard Connect accounts require more setup from users - consider **Stripe Connect Express** for faster onboarding

### Recommended Actions

| Priority | Task | Description |
|----------|------|-------------|
| HIGH | Verify backend exists | Check if `/charge` and OAuth callback endpoints are implemented |
| HIGH | Add Runwae Stripe keys to Vercel | The new keys provided need to be added as environment variables |
| MEDIUM | Migrate to Payment Intents | If using Charges API, migrate to Payment Intents (newer, supports SCA) |
| MEDIUM | Consider Stripe Express | Simplifies influencer onboarding for payouts |
| LOW | Add webhook handling | For payment status updates, refunds, disputes |

### Runwae Stripe Keys (to add to Vercel)

```bash
# Production
STRIPE_PUBLISHABLE_KEY=pk_live_[REDACTED-ROTATE]
STRIPE_SECRET_KEY=sk_live_[REDACTED-ROTATE]

# Test
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_[REDACTED]
STRIPE_TEST_SECRET_KEY=sk_test_[REDACTED]
```

---

## 2. Agreement Flow Improvements

### Current Flow (gig.html)

The 5-step agreement process:

```
[1. Proposal] → [2. Payment] → [3. Post] → [4. Verification] → [5. Payout]
```

### Current UX Issues

| Issue | Description | Impact |
|-------|-------------|--------|
| Visual feedback | Status changes aren't clearly communicated | Users confused about current state |
| Progress indicator | Radio buttons for steps feel dated | Looks like a form, not a workflow |
| Skip actions | "Skip Proposal/Post Verification" buttons feel risky | Users may accidentally skip |
| Error states | Limited feedback when things go wrong | Users stuck without guidance |
| Mobile | Progress bar doesn't translate well to mobile | Poor experience on phones |

### Recommended Improvements

#### 2.1 Progress Indicator Redesign

Replace radio-button progress bar with a visual stepper:

```
Current:  ○ Proposal ○ Payment ○ Post ○ Verification ○ Payout

Proposed: ✓ Proposal ─── ● Payment ─── ○ Post ─── ○ Verification ─── ○ Payout
          [Completed]    [Current]     [Pending]
```

**CSS Changes:**
- Use connected line between steps
- Checkmark icon for completed steps
- Pulsing dot for current step
- Muted color for pending steps
- Mobile: Collapse to current step only with "Step 2 of 5" label

#### 2.2 Step Content Improvements

| Step | Improvement |
|------|-------------|
| Proposal | Add character count, preview on mobile, AI generation already added ✅ |
| Payment | Show payment summary before charging, add estimated payout timeline |
| Post | Add direct link to post instructions, countdown timer for posting deadline |
| Verification | Side-by-side comparison of proposal vs actual post |
| Payout | Show transaction status, add "Payment sent" confirmation |

#### 2.3 Confirmation Dialogs

Add confirmation modals for destructive/irreversible actions:
- "Decline Proposal" → "Are you sure? The influencer will need to resubmit."
- "Skip Post Verification" → "This will move directly to payout. Continue?"
- "Decline Gig" → "This will end the agreement. You won't be able to undo this."

#### 2.4 Status Notifications

Add toast notifications for status changes:
- "Proposal submitted successfully"
- "Payment processed - waiting for influencer to post"
- "Post verified - payout initiated"

---

## 3. Posts UI Refinements

### Completed Work ✅
- Feed cards restyled (`css/feed-cards.css`)
- Social buttons moved inline
- Dark mode support
- Hover effects and transitions

### Remaining Opportunities

| Area | Current | Proposed |
|------|---------|----------|
| Like animation | Instant toggle | Heart "pop" animation on like |
| Comment preview | Hidden by default | Show 1-2 preview comments, expand for more |
| Share modal | Opens new window | Dropdown with copy link, platform icons |
| Post timestamp | "3 hours ago" | "3h" (shorter) with full date on hover |
| Image lightbox | Opens in modal | Smooth zoom with pan/pinch on mobile |

---

## 4. Border Radius Audit

### Already Addressed ✅

The `css/theme.css` defines sophisticated, tight border radii:

```css
--radius-xs: 2px;
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 10px;
--radius-2xl: 12px;
--radius-card: 6px;
--radius-button: 6px;
--radius-input: 6px;
--radius-pill: 20px;  /* Only for pill-shaped elements */
```

### Values Still in main.css That May Need Override

Found in `main.css` (legacy values):

| Selector | Current Value | Should Override? |
|----------|---------------|------------------|
| Various elements | `border-radius: 30px` | ⚠️ Yes - too rounded |
| Pills/badges | `border-radius: 100px` | ✅ OK for pill shapes |
| Buttons | `border-radius: 20px` | ⚠️ Override to 6px |
| Cards | `border-radius: 15px` | ⚠️ Override to 6px |

### Recommended Action

Add overrides to `css/refinements.css` for any remaining large radius values that look dated.

---

## 5. Profile Page UI

### Current State ✅
- Profile header with cover photo
- Tab navigation (Campaigns/Gigs, Following, Followers, Applications, Agreements)
- Dark mode support via `css/profile-chat-modern.css`

### Potential Improvements

| Area | Improvement |
|------|-------------|
| Stats display | Add follower/following counts as prominent numbers |
| Verification badge | Add verified checkmark for established accounts |
| Profile completeness | Show % complete with prompts to add missing info |
| Social links | Display linked Instagram/Twitter/etc with follower counts |
| Portfolio grid | For influencers, show recent posts in a grid layout |

---

## 6. Chat/Messages UI

### Current State ✅
- Two-column layout (conversations list + chat)
- Message bubbles with timestamps
- Dark mode support
- `css/profile-chat-modern.css` handles styling

### Potential Improvements

| Feature | Description |
|---------|-------------|
| Read receipts | Show checkmarks when message is delivered/read |
| Typing indicator | "John is typing..." bubble |
| Message reactions | Quick emoji reactions (👍 ✅ ❤️) |
| File attachments | Allow sending images/documents |
| Search messages | Search within conversation history |
| Message grouping | Group consecutive messages from same sender |

---

## 7. Template Images → Icons

### Current State ✅

**Good news:** The platform already uses Ionicons consistently. No problematic emojis found in the main application pages.

**Lottie animations** are used only on marketing pages (`welcome.html`, `blog.html`, `login.html`) which is appropriate.

### Minor Cleanup Opportunities

| File | Item | Recommendation |
|------|------|----------------|
| Template headers | Some use PNG logos | Consider SVG for crispness |
| Social buttons | PNG platform logos | Already using ion-icons ✅ |
| Loading states | May use GIF spinners | Consider CSS-only spinners |

---

## 8. Light/Dark Mode Toggle

### Current State ✅

**Fully Implemented:**
- `js/theme-toggle.js` handles toggle logic
- `css/theme.css` defines CSS variables for both modes
- Toggle button in header with moon/sun icon
- Respects system preference
- Persists to localStorage
- Keyboard accessible (Enter/Space)

**No further action needed.**

---

## Implementation Priority

### Completed ✅
1. ✅ **XSS Security Fixes** - Fixed 40+ XSS vulnerabilities across 12 JS files
2. ✅ **CSS Variable Migration** - Replaced hardcoded #9389FF with var(--color-primary)
3. ✅ **Duplicate CSS Cleanup** - Removed 4 duplicate Font Awesome files (~6,000 lines)
4. ✅ **Material-input Cleanup** - Removed garbage `<span class="material-input">` from 12 HTML files

### High Priority (Do First)
1. ⬜ Verify Stripe backend endpoints exist
2. ⬜ Add Runwae Stripe keys to Vercel environment variables
3. ⬜ Redesign agreement flow progress indicator

### Medium Priority
4. ⬜ Add confirmation dialogs for destructive actions in gig flow
5. ⬜ Override remaining large border-radius values in main.css
6. ⬜ Add toast notifications for status changes

### Low Priority (Polish)
7. ⬜ Post like animation
8. ⬜ Message read receipts
9. ⬜ Profile completeness indicator
10. ⬜ Comment preview on posts

---

## Files to Modify

| File | Changes |
|------|---------|
| `runwae/gig.html` | Progress bar redesign, confirmation dialogs |
| `runwae/css/progressbar.css` | New stepper component styles |
| `runwae/css/refinements.css` | Override remaining large radii |
| `runwae/runwaejs/gigHQ.js` | Add confirmation dialogs, toast notifications |
| `vercel.json` | Ensure API routes for Stripe are configured |

---

## 9. Security Improvements (Completed)

### XSS Vulnerability Fixes ✅

**Date:** 2026-05-03

Fixed 40+ Cross-Site Scripting (XSS) vulnerabilities across the codebase by replacing unsafe `.html()` calls with `.text()` for user-controlled data.

#### Files Modified

| File | Fixes |
|------|-------|
| `unobfrunwaejs/util.js` | Added `escapeHtml()` function + updated `replaceText()` to auto-escape template values |
| `unobfrunwaejs/gigHQ.js` | 12 fixes - partnerName, marketer/influencer names, usernames, captions, platform, tracking numbers |
| `unobfrunwaejs/auth.js` | 3 fixes - loginError, error messages |
| `unobfrunwaejs/display.js` | 9 fixes - name, username, description, website, industry, city, role, gigsCount |
| `unobfrunwaejs/navHQ.js` | 3 fixes - navName, navUsername, messagedEmail |
| `unobfrunwaejs/messagesHQ.js` | 1 fix - conversationRecipient |
| `unobfrunwaejs/post.js` | 6 fixes - postHostName, postCaption, counts, postTime |
| `unobfrunwaejs/postHQ.js` | 2 fixes - previewCaption, previewHostName |
| `unobfrunwaejs/follow.js` | 3 fixes - followersCount, followingCount |
| `unobfrunwaejs/reviews.js` | 3 fixes - reviewsCount displays |
| `unobfrunwaejs/notifications.js` | 1 fix - unreadNotificationsCount |
| `unobfrunwaejs/messages.js` | 1 fix - unreadMessagesCount |

#### Template System Protection

Added HTML escaping to the `replaceText()` function in `util.js`:

```javascript
// HTML escape function to prevent XSS attacks
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    var str = String(text);
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Safe patterns (URLs, IDs) bypass escaping
var safePatterns = ['{{uid}}', '{{key}}', '{{src}}', '{{header_src}}', ...];
```

This protects all template-based rendering in `timeline.js`, `feed.js`, and other files that use `displayHTML()`.

### CSS Cleanup ✅

#### Hardcoded Colors → CSS Variables

Replaced all instances of hardcoded `#9389FF` with `var(--color-primary)`:

| File | Lines Fixed |
|------|-------------|
| `css/progressbar.css` | Line 135 |
| `css/ext.css` | Lines 136, 190 |
| `css/welcome.css` | Lines 111, 143 |
| `css/runwae.css` | Lines 286, 393-394, 874 |
| `welcome.html` | Line 225 (inline style → class) |
| `admin.html` | Line 99 (inline style → class) |

#### Duplicate CSS Removal

Removed ~6,000 lines of duplicate Font Awesome CSS:

| File Deleted | Lines |
|--------------|-------|
| `css/accountbootstrap.css` | ~2,240 |
| `css/explorebootstrap.css` | ~2,209 |
| `css/profilebootstrap.css` | ~1,105 |
| `css/welcomebootstrap.css` | ~445 |

### HTML Cleanup ✅

Removed garbage `<span class="material-input"></span>` elements from 12 HTML files:
- welcome.html, login.html, account.html, admin.html, profile.html
- explore.html, faqs.html, gig.html, notifications.html, messages.html
- terms.html, privacy.html

---

## Stripe Backend Check

**Action Required:** Investigate whether the following server endpoints exist:

1. `POST /charge` - Process card payments
2. `GET /oauth/callback` - Stripe Connect OAuth callback
3. `POST /webhook` - Stripe webhook handler (recommended)

If these don't exist, Stripe integration is incomplete and payments won't work. The frontend is ready but needs backend support.

---

## Next Steps

1. **Check Vercel project** for existing serverless functions or API routes
2. **Review Firebase** for any payment-related cloud functions
3. **Test the payment flow** end-to-end in test mode
4. **Implement missing backend** if needed (Vercel Functions recommended)

---

## Related Documents

- `UI_IMPROVEMENTS.md` - Detailed CSS/JS implementation
- `RUNWAE_UI_MODERNIZATION_PLAN.md` - Original modernization plan
- `FUNCTIONALITY_IMPROVEMENTS.md` - LLM integration plan
