# MDO3D Landing Page - Status

**Last Updated:** 2026-08-17

---

## Deploy + fixes (2026-08-17) — now actually live on mdo3d.com

**⚠️ Critical discovery:** mdo3d.com is served by the **`mdo3d-landing`** Vercel project,
NOT `mdo3d-static` (this directory). Edits made here had never reached the live domain, so
mdo3d.com was stale (still had 404ing `guidance.mdo3d.com/*` links, no theme toggle). This
session deployed this source to `mdo3d-landing`, so everything below is now live.
**Footgun:** two Vercel projects for one page. Consider consolidating (point mdo3d.com at
`mdo3d-static`, or retire one) so edits don't silently miss the live site.

- **Theme toggle (dark/light) now live** on mdo3d.com, with a pre-paint `<head>` guard so
  light-mode users don't get a flash of dark on load.
- **Removed the "Powered by" trust bar** (Next.js/React/TypeScript/Vercel badges).
- **Fixed dark-mode bug:** the "Featured Subdomain" guidance section used `var(--ink)` as a
  background (a text-color var that flips with theme), so it turned white in dark mode. Now a
  fixed dark. Same fix applied to the white CTA button's text and the filter "active" button.
- **Fixed divination links:** featured/showcase/footer links pointed at
  `guidance.mdo3d.com/<tool>` paths that 404; repointed to real `<tool>.mdo3d.com` subdomains,
  added iching/runes/names/pastlife, marked astrology/fengshui live.

---

## Earlier: theme toggle + cursor tracker added (2026-05-10) — but not deployed to prod until 08-17 (see above)

---

## Recent Improvements (2026-05-10)

### Performance Optimizations
- [x] Added `preconnect` to fonts.gstatic.com for faster font loading
- [x] Added `preload` for critical fonts
- [x] Cursor tracker now uses `requestAnimationFrame` with lerp smoothing
- [x] Cursor uses `translate3d` for GPU acceleration
- [x] Added visibility change handler to pause cursor animation when tab is hidden
- [x] Inner cursor follows mouse instantly, outer cursor has smooth lag effect

### Accessibility Improvements
- [x] Added skip-to-main-content link for keyboard users
- [x] Added `:focus-visible` styling for keyboard focus states
- [x] Added `prefers-reduced-motion` support (disables animations)
- [x] All interactive elements have proper ARIA labels
- [x] Table rows are keyboard accessible with tabindex and role="link"
- [x] Keyboard navigation for filter buttons (arrow keys)
- [x] Mobile menu has proper aria-expanded state

### UX Enhancements
- [x] Theme toggle now shows sun/moon icons based on current theme
- [x] Theme toggle has subtle rotation animation on hover
- [x] Table rows are fully clickable (not just the link)
- [x] Filter buttons support arrow key navigation
- [x] Added mobile hamburger menu with slide-in navigation
- [x] Mobile menu closes when link is clicked
- [x] Added subtle hero gradient background
- [x] Added scroll-margin-top for smooth anchor navigation past sticky nav
- [x] Live status indicators now have pulsing animation in table
- [x] Buttons have lift effect and shadow on hover

### Visual Polish
- [x] Hero section has radial gradient overlay
- [x] Platform name highlights on row hover
- [x] Rows have focus-within highlight for keyboard users
- [x] Loading state for empty table body

---

## Issues Fixed (2026-05-10)

### Critical - Missing CSS Definitions
- [x] Added `.hero-content` CSS definition
- [x] Added `.footer-col` base CSS definition

### High - Dark Mode Backgrounds
- [x] `.stack-card` - Changed to `var(--white)`
- [x] `.cat-card` - Changed to `var(--white)`
- [x] `.trust-bar` - Changed to `var(--white)`
- [x] `.filter-btn` - Changed to `var(--white)`

### Medium - Code Cleanup
- [x] Removed unused `.section`, `.section-desc`, `.section-divider` classes
- [x] Footer colors now use CSS variables

### Low - Links & Content
- [x] Fixed all placeholder links
- [x] Added social media icons (Twitter, GitHub, LinkedIn)
- [x] Category cards now link to proper destinations

---

## File Structure

```
landing/mdo3d-static/
├── index.html          # Main landing page (52.5 KB)
├── guidance.html       # Guidance subdomain landing
├── og-image.svg        # Open Graph image
├── sitemap.xml
├── robots.txt
├── vercel.json
└── STATUS.md           # This file
```

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive (breakpoints at 960px and 600px)
- Touch device support (custom cursor hidden)
- Reduced motion support
- Keyboard navigation support

---

## Deployment

- **Platform:** Vercel
- **Domain:** mdo3d.com
- **Status:** Live

---

## Testing Checklist

### Theme
- [ ] Toggle dark -> light -> dark
- [ ] Verify localStorage persistence
- [ ] Check sun/moon icon switching
- [ ] Test with system preference (prefers-color-scheme)

### Accessibility
- [ ] Tab through entire page
- [ ] Use skip link
- [ ] Navigate filter buttons with arrow keys
- [ ] Navigate table rows with keyboard
- [ ] Test with screen reader

### Mobile
- [ ] Test hamburger menu open/close
- [ ] Verify menu links navigate correctly
- [ ] Confirm custom cursor is hidden
- [ ] Test all breakpoints

### Performance
- [ ] Verify cursor animation is smooth (60fps)
- [ ] Check cursor pauses when tab is hidden
- [ ] Confirm no layout shifts on load

### Visual
- [ ] All cards adapt to dark mode
- [ ] Hero gradient is visible
- [ ] Button hover effects work
- [ ] Live indicators pulse correctly
