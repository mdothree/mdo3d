# Runwae UI Modernization Plan

## Overview
Modernize the legacy jQuery/Bootstrap runwae platform with improved styling, light/dark theming, better sidebar and modal design, and an LLM chat drawer.

## Approach
**CSS Variables + Incremental Cleanup** - Add a theming layer on top of existing Bootstrap/CSS without full migration.

---

## Phase 1: CSS Architecture Foundation

### Create `/runwae/css/theme.css`
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

### Create `/runwae/js/theme-toggle.js`
Theme persistence with localStorage and toggle button binding.

---

## Phase 2: Modern Styling Overrides

### Create `/runwae/css/modern-overrides.css`
Target key components to use CSS variables:

- `.ui-block` - Card containers
- `.header` - Top navigation
- `.post` - Feed posts
- Form inputs, buttons
- Dropdown menus

---

## Phase 3: Sidebar Improvements

### Create `/runwae/css/sidebar-modern.css`
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

### Create `/runwae/css/modal-modern.css`
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

### Create `/runwae/css/chat-drawer.css`
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

### Create `/runwae/js/llm-chat.js`
- Toggle drawer open/close
- Message history management
- API integration placeholder
- Auto-scroll to latest message
- Typing indicator
- Keyboard shortcuts (Escape to close)

### Add toggle button to header
Place chat toggle in the header control block next to theme toggle.

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

1. **Visual testing**: Open each page and verify:
   - Light mode renders correctly
   - Dark mode toggles and persists
   - Sidebar widgets have improved styling
   - Modals animate smoothly and look modern
   - Chat drawer slides in/out correctly

2. **Functional testing**:
   - Theme persists across page navigation (localStorage)
   - Chat drawer keyboard shortcuts work
   - Mobile responsive layout works
   - No JavaScript console errors

3. **Cross-browser**: Test in Chrome, Firefox, Safari
