# Runwae UI Modernization Plan

## Overview

Modernize the legacy jQuery/Bootstrap runwae platform with improved styling, light/dark theming, better sidebar and modal design, and an LLM chat drawer.

**Current State:**
- jQuery 3.2.1 + Bootstrap 4
- 21,869 lines in main.css (403KB)
- Template-based rendering with mustache-style placeholders
- Firebase Realtime Database backend
- No build step - static assets served directly

---

## Approach

**CSS Variables + Incremental Cleanup** - Add a theming layer on top of existing Bootstrap/CSS without full migration.

---

## Phase 1: CSS Architecture Foundation

### Create `css/theme.css`

Define CSS custom properties for all colors, shadows, and spacing:

```css
:root {
  /* Primary */
  --color-primary: #9389FF;
  --color-primary-hover: #7b6fea;
  --color-primary-light: rgba(147, 137, 255, 0.1);

  /* Backgrounds */
  --color-bg-body: #edf2f6;
  --color-bg-card: #ffffff;
  --color-bg-header: #ffffff;

  /* Text */
  --color-text-primary: #515365;
  --color-text-secondary: #9a9fbf;

  /* Borders & Shadows */
  --color-border: #e6ecf5;
  --shadow-card: 0 0 34px 0 rgba(63, 66, 87, 0.1);

  /* Spacing */
  --spacing-card: 25px;
  --radius-card: 5px;
}

/* Dark Mode */
[data-theme="dark"] {
  --color-bg-body: #1a1a2e;
  --color-bg-card: #16213e;
  --color-bg-header: #0f0f1a;
  --color-text-primary: #e8e8e8;
  --color-text-secondary: #a0a0b0;
  --color-border: #2a2a4a;
  --shadow-card: 0 0 34px 0 rgba(0, 0, 0, 0.3);
}
```

### Create `js/theme-toggle.js`

Theme persistence with localStorage and toggle button binding:

```javascript
const ThemeManager = {
  init: function() {
    // Check saved preference or system preference
    const saved = localStorage.getItem('runwae-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (systemPrefersDark ? 'dark' : 'light');
    this.setTheme(theme);
    this.bindToggle();
    this.watchSystemTheme();
  },

  setTheme: function(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('runwae-theme', theme);
    this.updateToggleIcon(theme);
  },

  toggle: function() {
    const current = document.documentElement.getAttribute('data-theme');
    this.setTheme(current === 'dark' ? 'light' : 'dark');
  },

  updateToggleIcon: function(theme) {
    const icon = document.querySelector('.theme-toggle ion-icon');
    if (icon) {
      icon.setAttribute('name', theme === 'dark' ? 'sunny-outline' : 'moon-outline');
    }
  },

  bindToggle: function() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-toggle')) {
        this.toggle();
      }
    });
  },

  watchSystemTheme: function() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('runwae-theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
```

### Add Toggle Button to Header

Add to each page's header control block (near notifications/messages icons):

```html
<div class="control-icon theme-toggle" title="Toggle dark mode">
  <ion-icon name="moon-outline"></ion-icon>
</div>
```

**Toggle Button Styling:**
```css
.theme-toggle {
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.theme-toggle:hover {
  background-color: var(--color-primary-light);
}

.theme-toggle ion-icon {
  font-size: 22px;
  color: var(--color-text-primary);
}
```

### Dark Mode Considerations

Elements requiring special attention for dark mode:

| Element | Light | Dark |
|---------|-------|------|
| `.ui-block` | white bg | #16213e |
| `.header` | white bg | #0f0f1a |
| `.modal-content` | white bg | #1a1a2e |
| Images/avatars | - | Add subtle border |
| Form inputs | #f7f9fa | #252540 |
| Dropdown menus | white | #1a1a2e |
| Scrollbars | default | custom dark |

**Image handling in dark mode:**
```css
[data-theme="dark"] .author-thumb img,
[data-theme="dark"] .post img {
  border: 1px solid var(--color-border);
}
```

---

## Phase 2: Modern Styling Overrides

### Create `css/modern-overrides.css`

Target key components to use CSS variables:

- `.ui-block` - Card containers
- `.header` - Top navigation
- `.post` - Feed posts
- Form inputs, buttons
- Dropdown menus

---

## Phase 3: Sidebar Improvements

### Create `css/sidebar-modern.css`

Fix the sidebar posts with:

- Better widget title styling with subtle gradient accent
- Improved list item spacing and hover states
- Activity feed with left border accent on hover
- Sticky positioning on desktop
- Visual hierarchy between main feed and sidebar

**Key improvements:**
```css
.w-activity-feed li {
  padding: 12px 15px;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.w-activity-feed li:hover {
  border-left-color: var(--color-primary);
  background-color: var(--color-primary-light);
}
```

---

## Phase 4: Modal/Popup Redesign

### Create `css/modal-modern.css`

Modernize the Bootstrap modals:

- Remove hard borders, add rounded corners (12px)
- Better shadows (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`)
- Gradient header backgrounds
- Improved close button (circular, subtle)
- Better two-column layout for photo posts
- Smooth scale+fade animations
- Responsive mobile layout

---

## Phase 5: LLM Chat Slide-Out Drawer

**Reference:** AHL/tillio chat interface patterns (see below)

### Create `css/chat-drawer.css`

Full-height slide-out panel from right edge:

```css
.llm-chat-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: var(--color-bg-card);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1050;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

.llm-chat-drawer.active {
  transform: translateX(0);
}

.llm-chat-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 1049;
}

.llm-chat-overlay.active {
  opacity: 1;
  visibility: visible;
}
```

### Create `js/llm-chat.js`

- Toggle drawer open/close
- Message history management
- API integration placeholder
- Auto-scroll to latest message
- Typing indicator
- Keyboard shortcuts (Escape to close, Enter to send)

### Add toggle button to header

Place chat toggle in the header control block next to theme toggle.

---

## AHL/Tillio Chat Interface Patterns

Reference implementation from `~/ahl/tillio` and related AHL projects.

### Chat UI Implementations Found

| Location | Features |
|----------|----------|
| `blacklab/.../ChatPanel.tsx` | Material-UI, file attachments (PDF, CSV, JSON), message history |
| `nods/.../LLMChat.tsx` | Session management, project analysis, token tracking |
| `blacklab/.../AIChatSidebar/` | Right-aligned drawer, message bubbles, smooth scroll |

### Color Scheme (Blacklab Theme)

```
Primary: #000000 (Black)
Secondary: #FFD700 (Gold)
Accent: #00B5D8 (Cyan)
Background Paper: #1A1A1A (Dark)
Background Default: #333333 (Dark)

Sensor Domain Colors:
- RF/Electromagnetic: #0066FF (Blue)
- Thermal: #FF3333 (Red)
- LiDAR/Mechanical: #00CC66 (Green)
- Radar: #9933FF (Purple)

Text Colors:
- Light mode: rgb(17, 24, 39) primary
- Dark mode: rgb(255, 255, 255) primary
```

### Chat Message Layout Pattern

```
Box (Container)
├── Header (flex, divider bottom)
│   ├── Icon + Title
│   └── Close Button
├── Messages Area (scrollable)
│   └── Messages List
│       ├── UserMessage (flex-end, 80% max-width)
│       └── AIMessage (flex-start, avatar + bubble)
└── Input Area (flex bottom)
    ├── Attachment Button
    ├── Text Field (multiline, max 3-4 rows)
    └── Send Button
```

### CSS Styling Patterns

**Message Bubbles:**
```css
/* User Message */
maxWidth: '80%';
padding: 12px 16px;
borderRadius: 12px;
borderTopRightRadius: 0;  /* Angled corner */
backgroundColor: alpha(primary, 0.1);

/* AI Message */
maxWidth: '80%';
padding: 12px 16px;
borderRadius: 12px;
borderTopLeftRadius: 0;  /* Angled corner */
backgroundColor: background.paper;
border: 1px solid divider;
```

**Drawer/Panel:**
```css
width: { xs: 300, md: 360, xl: 400 };  /* Responsive */
height: '100%';
display: 'flex';
flexDirection: 'column';
backdrop: transparent;  /* No dimming */
```

**Input Area:**
```css
padding: 12px 20px;
borderTop: 1px solid divider;
display: flex;
gap: 12px;
alignItems: flex-end;
```

### Animation & Interaction Patterns

**Scroll Behavior:**
```javascript
scrollIntoView({ behavior: 'smooth' })
```

**Keyboard Handling:**
```javascript
if (event.key === 'Enter' && !event.shiftKey) {
  event.preventDefault();
  handleSendMessage();
}
// Shift+Enter for multi-line
```

**Input Expansion:**
```css
textarea {
  min-height: 60px;
  transition: all 0.3s ease;
}
textarea:focus {
  min-height: 100px;  /* Expands on focus */
}
```

### Recommendations from AHL Patterns

1. **Right-side Drawer** - non-modal, non-dimming
2. **Responsive widths** - 300-400px based on viewport
3. **Alternating alignment** - user right, AI left
4. **Avatar indicators** for AI messages
5. **Angled bubble corners** - avoid perfect symmetry
6. **Max-width constraints** (80%) for readability
7. **File attachment support** with visual indicators
8. **Typing indicators** for AI responses
9. **Keyboard shortcuts** - Enter to send, Shift+Enter for newline
10. **Auto-scroll** to latest message

---

## Post Social Media Buttons (Implemented)

Restyled the awkward floating social media icons on posts.

**Before:** Floating buttons positioned on the right side of posts (`right: -17px`)

**After:** Inline pill-style buttons at the bottom of posts with:
- Subtle tinted backgrounds matching platform colors
- Fill animation on hover with lift effect
- Platform-colored shadows
- Dark mode support
- Mobile responsive (centered, smaller)

```css
.post .control-block-button.post-control-button {
  position: relative;
  display: flex;
  gap: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

.btn-control.bg-facebook {
  background-color: rgba(47, 91, 157, 0.1);
  color: var(--color-facebook);
}

.btn-control.bg-facebook:hover {
  background-color: var(--color-facebook);
  color: #fff;
  transform: translateY(-2px);
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `css/theme.css` | CSS custom properties + dark mode |
| `css/modern-overrides.css` | Component styling updates |
| `css/sidebar-modern.css` | Sidebar widget improvements |
| `css/modal-modern.css` | Modal redesign |
| `css/chat-drawer.css` | LLM chat slide-out drawer |
| `js/theme-toggle.js` | Light/dark mode logic |
| `js/llm-chat.js` | Chat drawer functionality |

## Files to Modify

| File | Changes |
|------|---------|
| `explore.html` | Add CSS/JS includes, toggle buttons, chat drawer HTML |
| `profile.html` | Add CSS/JS includes, toggle buttons, chat drawer HTML |
| `messages.html` | Add CSS/JS includes, toggle buttons, chat drawer HTML |
| `notifications.html` | Add CSS/JS includes, toggle buttons, chat drawer HTML |
| `account.html` | Add CSS/JS includes, toggle buttons, chat drawer HTML |

---

## Critical Source Files

- `/runwae/css/main.css` - Core 21K-line stylesheet (read for selectors)
- `/runwae/css/runwae.css` - Custom styles to migrate to variables
- `/runwae/explore.html` - Main feed page, primary target
- `/runwae/unobfrunwaejs/feed.js` - Template rendering patterns

---

## Verification

**Visual testing:**
- Light mode renders correctly
- Dark mode toggles and persists
- Sidebar widgets have improved styling
- Modals animate smoothly and look modern
- Chat drawer slides in/out correctly

**Functional testing:**
- Theme persists across page navigation (localStorage)
- Chat drawer keyboard shortcuts work
- Mobile responsive layout works
- No JavaScript console errors

**Cross-browser:** Test in Chrome, Firefox, Safari

---

## Phase 6: Profile & Chat Interface Improvements

### Create `css/profile-chat-modern.css`

Additional styling for profile pages and messaging interfaces.

**Profile Header Improvements:**
- Profile picture overlay with camera icon on hover
- Author content with text shadow for readability over header images
- Profile menu tabs with pill-style active states
- Action buttons with lift effect on hover

**Messages/Chat Interface:**
- Chat container with sticky header
- Message bubbles with distinct styling for sent vs received
- Conversations list with active state indicator
- Improved input area with focus states
- Unread message indicators

**Key styling:**
```css
/* Message bubble - sent */
.chat-message-field li.sent .notification-event {
  background: var(--color-primary);
  color: white;
}

/* Conversations list - active state */
.conversationsContainer .notification-list li.active {
  background: var(--color-primary-light);
  border-left: 3px solid var(--color-primary);
}

/* Chat input focus */
.chat-field .form-group textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

---

## Emoji/Animation Assessment

### Findings

**Emojis in codebase:** None found in JavaScript or HTML templates. The platform uses Ionicons consistently throughout.

**Lottie Animations:** Found in marketing/public-facing pages only:
- `welcome.html` - Landing page animations (appropriate for marketing)
- `blog.html` - Article decorations
- `login.html` - Onboarding flow

**Assessment:** Lottie animations are appropriately used for marketing pages and do not need to be replaced. The core application (profile, messages, explore, etc.) uses professional Ionicons throughout.

**Lottiepng folder:** Contains static PNG exports of Lottie animations - likely used as fallbacks for performance or static contexts.

---

## Border Radius Refinements

Reduced border-radius values for a more sophisticated look:

| Element | Before | After |
|---------|--------|-------|
| Cards (`.ui-block`) | 15-20px | 6px |
| Buttons | 30px (pill) | 4px |
| Input fields | 15px | 6px |
| Modals | 15px | 8px |
| Avatars | 50% | 50% (unchanged) |

Defined in `css/theme.css`:
```css
:root {
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-card: 6px;
  --radius-button: 4px;
  --radius-input: 6px;
}
```

---

## Implementation Status

| Phase | Status | Files |
|-------|--------|-------|
| CSS Architecture | Complete | `css/theme.css` |
| Modern Overrides | Complete | `css/modern-overrides.css` |
| Sidebar | Complete | `css/sidebar-modern.css` |
| Modal Redesign | Complete | `css/modal-modern.css` |
| LLM Chat Drawer | Complete | `css/chat-drawer.css`, `js/llm-chat.js` |
| Feed Cards | Complete | `css/feed-cards.css` |
| Refinements | Complete | `css/refinements.css` |
| Profile/Chat | Complete | `css/profile-chat-modern.css` |
| **Security Fixes** | **Complete** | `unobfrunwaejs/*.js` (12 files) |
| **CSS Cleanup** | **Complete** | Removed 4 duplicate files, fixed hardcoded colors |
| **HTML Cleanup** | **Complete** | Removed material-input spans from 12 files |

### HTML Files Updated

All core pages now include the modern CSS stack:
- `explore.html`
- `profile.html`
- `messages.html`
- `notifications.html`
- `account.html`
- `gig.html`

---

## Security Improvements (2026-05-03)

### XSS Vulnerability Fixes

Fixed 40+ Cross-Site Scripting vulnerabilities:

| Category | Files | Changes |
|----------|-------|---------|
| Direct `.html()` → `.text()` | 11 JS files | 40+ fixes for user-controlled data |
| Template escaping | `util.js` | Added `escapeHtml()` function to `replaceText()` |

**Key files fixed:** `gigHQ.js`, `auth.js`, `display.js`, `navHQ.js`, `messagesHQ.js`, `post.js`, `postHQ.js`, `follow.js`, `reviews.js`, `notifications.js`, `messages.js`

### CSS Cleanup

| Task | Status |
|------|--------|
| Replace `#9389FF` → `var(--color-primary)` | ✅ Complete (8 locations) |
| Remove duplicate Font Awesome CSS | ✅ Complete (~6,000 lines removed) |
| Remove `<span class="material-input">` | ✅ Complete (12 HTML files) |
