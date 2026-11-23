# Personal Command Center

A calm, warm personal hub for everything you juggle in a day: tasks, deadlines and events, habits, fitness and nutrition, quick notes, and an AI assistant that answers questions over your own data.

The core idea is **frictionless capture**. Type (or speak) something like *"submit assignment by 10pm tomorrow"* and it files itself as a task, deadline or event. No confirmation dialogs; you fix things afterwards with a tap.

## Features

- **Today dashboard**: today's routines with 7-day streak chains, tasks filtered by category (Studies / Work / Personal), a week calendar strip, upcoming deadlines, and a "slipping" card for anything untouched for 3+ days.
- **Natural-language capture**: free text is parsed into a structured task, deadline or event with a category and due time.
- **Fitness**: step ring, calories and a macro breakdown. Snap or describe a meal and it estimates items, portions, calories and macros.
- **Notes**: quick notes with search.
- **Ask AI**: a chat that answers over your tasks, habits, notes and fitness data.
- **Desktop and mobile layouts**: sidebar + multi-column dashboard on desktop, a capture-first layout with a bottom tab bar on phones. Installable as a PWA.
- **Themes**: switchable colour palettes.
- **Works offline-first**: when no AI key is configured, the AI features fall back to built-in deterministic parsers, so the app is fully usable without one.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- [Supabase](https://supabase.com) (Postgres) for storage and sync between devices
- Any OpenAI-compatible chat API for capture parsing, meal vision and Ask AI

## Project structure

```
app/
  (app)/            Pages: Today, Capture, Fitness, Notes, Ask
  api/              Route handlers: ask, capture, meal-vision, state, health
components/         UI screens and shared primitives
lib/
  data/             Server-side data access
  domain/           Shared types
  openai/           Single AI client + model swap point
  services/         Capture parser, Ask AI, notes search, nutrition
  supabase/         Browser, server and admin Supabase clients
supabase/migrations SQL schema
```

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project (the free tier is fine)
- Optional: an API key for an OpenAI-compatible provider

### 1. Install

```bash
npm install
```

### 2. Set up the database

Run the SQL files in `supabase/migrations/` in order (`0001_init.sql`, then `0002_app_state.sql`) in the Supabase SQL editor, or with the Supabase CLI:

```bash
supabase db push
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only, never exposed to the browser) |
| `OPENAI_API_KEY` | Optional. Key for an OpenAI-compatible API. Leave unset to use the built-in parsers |
| `OPENAI_BASE_URL` | Optional. Base URL of the provider, including the version path (e.g. `https://api.openai.com/v1`) |

The model used by every AI feature is set in one place: `lib/openai/client.ts`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Deployment

The app deploys as-is to [Vercel](https://vercel.com) or any Node host. Add the same environment variables in your host's settings.
