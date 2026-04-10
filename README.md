# Aqua Guide

Aqua Guide is a multi-page web application for water guidance in places facing scarcity, flooding, service interruption, and fragile infrastructure. It combines featured launch profiles with live public data for searched locations, then turns that into plain-language actions that families, volunteers, and field teams can actually use.

## Product snapshot

- Four featured launch profiles:
  - `Cox's Bazar, Bangladesh`
  - `Turkana County, Kenya`
  - `Beira, Mozambique`
  - `Port-au-Prince, Haiti`
- Global place search for cities, districts, and communities through public APIs
- Separate product pages for:
  - home
  - region guidance
  - global map
  - multilingual AI assistant
  - resources
- Interactive country map with a generated country-risk dataset and clickable guidance handoff
- Live country indicators from the World Bank
- Live weather and place search from Open-Meteo
- Reverse geocoding via BigDataCloud
- Country metadata via REST Countries
- Multilingual AI chat through a server-side OpenAI route with a safe fallback when no key is configured
- Local persistence for saved places, quick-read mode, and last-viewed location

## Why this product works

- The problem is globally legible in seconds.
- The UI stays calm and premium even when the subject matter is serious.
- The assistant and shareable summary make the app feel operational rather than purely informational.
- The architecture is lightweight enough for a hackathon build, but structured like a real web product.

## Local development

```bash
npm install
npm start
```

Then open `http://127.0.0.1:4173`.

To enable live OpenAI responses, copy `.env.example` to `.env` and set:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1
```

`.env` is ignored by git.

## Validation

Run the automated browser flow:

```bash
npm run test:functional
```

Refresh the generated country map dataset:

```bash
npm run build:map-data
```

Generate the current presentation screenshots:

```bash
npm run screenshots:presentation
```

If your Obsidian vault is not under `~/Documents/Github/my-notes`, set `OBSIDIAN_VAULT` before running the screenshot command.

## Stack

- Static HTML, CSS, and browser JavaScript for the frontend
- Client-side public API calls for place search, live context, and country metadata
- A lightweight Node server for hosting, security headers, health checks, and the OpenAI-backed assistant route
- Playwright for functional validation and screenshot capture

## Project structure

- `index.html`: homepage shell
- `region/index.html`: region detail page
- `map/index.html`: interactive world risk map
- `assistant/index.html`: assistant page
- `resources/index.html`: resource page
- `client/`: page controllers and shared browser utilities
- `data/regions.js`: featured launch profiles and search helpers
- `data/country-water-index.js`: generated country-level water risk dataset
- `data/world-countries.geo.json`: local world geometry for the map
- `client/location-service.js`: public API orchestration for place search and live context
- `client/map.js`: map page controller
- `server.mjs`: static hosting plus assistant and health endpoints
- `scripts/build-country-water-index.mjs`: dataset generation for the map
- `scripts/test-functional.mjs`: end-to-end validation
- `scripts/test-live-smoke.mjs`: live upstream smoke check
- `scripts/capture-presentation.mjs`: screenshot capture
- `.env.example`: local environment template
- `render.yaml`: Render deployment config

## External data

- World Bank indicators:
  - basic drinking water access
  - basic sanitation access
  - population
- Open-Meteo geocoding and current conditions
- BigDataCloud reverse geocoding
- REST Countries metadata

The featured launch profiles still use curated household guidance copy on top of those public signals, because a practical water-guidance product needs both live context and human-readable operational advice.
