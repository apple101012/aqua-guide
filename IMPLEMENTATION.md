# Aqua Guide Implementation

## Current architecture

The app is now structured as a real multi-page product instead of a single long landing page.

- `index.html`
  - Editorial homepage
  - Priority region spotlight
  - Region search
  - Region cards
  - Global map entry point
  - Assistant teaser
- `map/index.html`
  - Interactive world map
  - Clickable country severity layer
  - Country drawer with guidance and assistant handoff
  - Fast search handoff for city and country guidance
- `region/index.html`
  - Region-specific guidance
  - Live context cards
  - Action modal flow
  - Copy/share interaction
  - Geolocation shortcut
- `assistant/index.html`
  - Multilingual chat
  - Selected-region context
  - Suggestion chips
  - Safe fallback path when no model key is configured
- `resources/index.html`
  - Household guidance patterns
  - Field-team communication guidance
  - Translation-focused guidance

## Server responsibilities

`server.mjs` now handles:

- static file serving
- security headers and CSP
- OpenAI chat proxying
- simple per-IP rate limiting for the chat route

## What is live versus curated

Live:

- generated country-level world map data
- country-level water access indicators
- country-level sanitation indicators
- country-level population
- current weather context
- search and reverse geocoding
- assistant responses when `OPENAI_API_KEY` is configured

Curated:

- region-level household summaries
- action cards and safety steps
- region prioritization and quality scoring
- region-specific assistant suggestion chips

That split is intentional. A usable product needs real public signals, but it also needs stable household guidance that does not disappear when a third-party feed changes.

## Sponsor positioning

- `AWS`
  - The assistant layer can still be presented as something that can be powered by `AWS Bedrock or similar`, while the current implementation uses an OpenAI-compatible path for speed.
- `MongoDB`
  - Not required for the chosen track, but the product can naturally grow into saved household histories, outreach logs, and regional alert subscriptions if that angle comes up.

## Validation status

- `npm run test:functional` passes
- `npm run test:live-smoke` passes
- `npm run screenshots:presentation` passes

## Security notes

- `.env` stays gitignored
- secrets are not committed
- chat responses render through a restricted escaped formatting layer
- the chat route is rate-limited
- CSP and related hardening headers are applied on every response
