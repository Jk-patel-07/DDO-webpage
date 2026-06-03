# Alms Maths

Alms Maths is a React + TypeScript learning game prototype with a futuristic math-themed interface. It includes an animated splash screen, a playful login flow, and a dashboard with sample math challenges for different learner tiers.

## What is included

- Animated splash experience with particle effects and sound feedback
- Demo login flow with autofill and simulated authentication states
- Student-tier switching for `junior`, `jee`, and `college`
- Interactive dashboard with a math challenge and feedback states
- Built with Vite for fast local development

## Tech stack

- React 19
- TypeScript
- Vite
- Motion
- Lucide React

## Getting started

### Prerequisites

- Node.js 18+ recommended
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The Vite dev server is configured to run on:

```text
http://localhost:3000
```

## Available scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Project structure

```text
src/
  App.tsx                     Main UI flow and screen states
  main.tsx                    React entry point
  index.css                   Global styles
  types.ts                    Shared types and student tier metadata
  components/
    Mascot.tsx
    MathParticles.tsx
```

## Environment variables

The repository includes `.env.example` with placeholders for:

- `GEMINI_API_KEY`
- `APP_URL`

The current frontend code does not appear to use these values directly, but they may be intended for AI Studio or future server-side integration.

## Notes

- This project is currently a demo/prototype experience rather than a full production learning platform.
- The login flow is simulated and does not connect to a real authentication backend.
- Some package metadata still uses generic template naming and can be renamed later if needed.

## Build

To create a production build:

```bash
npm run build
```

The compiled output will be generated in `dist/`.
