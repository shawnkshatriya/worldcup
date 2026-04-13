# PWA Setup Guide — WC26 Predictor

## What is a PWA?
A Progressive Web App lets users install your site to their phone's home screen. It looks and feels like a native app — no App Store, no download. Users just tap "Add to Home Screen" and it's there.

## Step 1 — Create your icons

You need two PNG icons:
- `public/icon-192.png` — 192×192px
- `public/icon-512.png` — 512×512px

**Easiest way:** Go to https://favicon.io or https://realfavicongenerator.net
- Upload any square image or emoji (the ⚽ works great)
- Download the package
- Copy the 192px and 512px PNGs into your `public/` folder with those exact names

Or use the SVG template included at `public/icon.svg` and convert it.

## Step 2 — Files already added

These are already in your project:
- `public/manifest.json` — app name, colors, icon references
- `public/sw.js` — service worker for offline caching
- `index.html` — manifest link and Apple meta tags added
- `src/main.jsx` — service worker registration added

## Step 3 — Deploy to Vercel

Just push to GitHub as normal. Vercel serves everything in `public/` at the root URL automatically.

## Step 4 — Test it

On your phone:
1. Open your site in Safari (iOS) or Chrome (Android)
2. iOS: tap the Share button → "Add to Home Screen"
3. Android: tap the 3-dot menu → "Add to Home Screen" or Chrome shows an install banner automatically

## Step 5 — Verify with Lighthouse

In Chrome DevTools:
1. Open your site → F12 → Lighthouse tab
2. Run "Progressive Web App" audit
3. Should score green on all checks

## Customising

Edit `public/manifest.json` to change:
- `"name"` — full app name shown on install prompt
- `"short_name"` — name shown under the icon (keep under 12 chars)
- `"theme_color"` — browser chrome color (currently FIFA red `#C8102E`)
- `"background_color"` — splash screen color (currently dark `#080B12`)

## iOS specifics

iOS doesn't fully support all PWA features but the basics work:
- Home screen icon ✓
- Full screen (no browser chrome) ✓
- Push notifications — not supported on iOS Safari (works on Android)
- Offline caching ✓

## What the service worker caches

The service worker at `public/sw.js` uses a network-first strategy for all Supabase API calls (so you always get fresh data) and cache-first for static assets (so it loads fast). The cache is named `wc26-v1` — bump this to `wc26-v2` if you ever need to force a cache refresh after a big update.
