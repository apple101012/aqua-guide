# Aqua Guide

**Aqua Guide** is a web platform that turns confusing water-risk information into clear, local action plans for households, travelers, and community responders.

## Elevator Pitch

Water guidance is often scattered, technical, and hard to act on. Aqua Guide makes it simple: search a place, understand the risk, and get practical next steps in plain language.

## Live Project

- Live app: `https://aqua-guide.onrender.com`
- Video demo: `https://youtu.be/xn_tyY7c1CE`
- GitHub: `https://github.com/apple101012/aqua-guide`

## What It Does

- Turns place-based water context into one clear guidance page
- Highlights four flagship country stories:
  - Bangladesh
  - Kenya
  - Mozambique
  - Haiti
- Supports broader place search for cities and countries
- Includes a multilingual assistant for follow-up questions
- Provides a focused featured-country map for fast presentation and navigation

## Why It Matters

People dealing with uncertain water conditions do not just need data. They need a clear answer to: **what should I do next?**

Aqua Guide is designed to reduce confusion, improve communication, and help people move from scattered information to action.

## Built With

- React
- Vite
- React Router
- Node.js
- OpenAI API
- Open-Meteo
- World Bank indicators
- REST Countries
- BigDataCloud
- Render

## Local Development

```bash
npm install
npm run dev
```

For the assistant backend route:

```bash
npm start
```

If you want live assistant responses locally, create a `.env` file from `.env.example` and set:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1
```

## Validation

```bash
npm run build
npm run test:functional
npm run test:live-smoke
```

## Repo Structure

- `src/` - React pages, components, and services
- `data/` - featured region data and generated country dataset
- `public/data/` - topology data used by the map
- `scripts/` - build and validation scripts
- `server.mjs` - lightweight backend for assistant routing and local serving
- `render.yaml` - deployment config

## Hackathon Focus

This project is optimized for a short presentation:

- strong visual clarity
- one easy-to-understand problem
- practical action steps
- multilingual assistant support
- broad global relevance
