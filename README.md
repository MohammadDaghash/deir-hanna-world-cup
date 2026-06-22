# Deir Hanna Local World Cup Platform

Live multilingual tournament platform built for a real local community tournament in Deir Hanna.

This project turns a local football tournament into a mobile-first public experience for spectators and an admin-controlled operations tool for organizers. It manages teams, players, fixtures, live match events, standings, stats, prediction voting, QR/poster sharing, and branded match cards.

## What It Does

- Publishes a public tournament dashboard for fixtures, results, standings, teams, players, knockout path, and leaderboards.
- Gives admins a live match control workflow for starting matches, pausing/resuming, halftime, second half, goals, assists, cards, penalties, own goals, and final scores.
- Calculates standings, tiebreakers, player leaderboards, suspensions, and event-derived stats from match data.
- Supports English, Hebrew, and Arabic names and UI text with RTL-aware display.
- Generates shareable match cards and WhatsApp-friendly match summaries.

## Key Features

- Mobile-first spectator dashboard
- Supabase-backed admin panel for teams, players, matches, lineups, and events
- Live match clock and match-phase control
- Event timeline for goals, assists, own goals, penalties, yellow cards, and red cards
- Automatic group standings and knockout bracket views
- Prediction voting with one browser vote per match
- Player/team profile pages and leaderboards
- QR/poster flow for sharing the public tournament site
- Multilingual EN/HE/AR UX with RTL handling
- Vercel-ready deployment configuration

## Tech Stack

- React + Vite
- JavaScript
- Supabase / PostgreSQL
- Tailwind CSS
- lucide-react
- QRCode
- Vercel

## Architecture / How It Works

The React app loads tournament data from Supabase tables for teams, players, matches, match events, votes, lineups, and admin users. Public users can view tournament data without authentication. Admin users sign in with Supabase magic-link email auth and can safely edit tournament records.

Core tournament logic lives in utility modules:

- `src/services/tournamentService.js` maps Supabase rows to app models and persists admin changes.
- `src/utils/tournament.js` calculates standings, leaderboards, team/player stats, tiebreakers, and suspensions.
- `src/utils/liveMatch.js` handles live match phases, live clock calculation, event creation, scoring, and discipline events.
- `src/utils/localization.js` manages English, Hebrew, Arabic, and RTL behavior.
- `supabase/schema.sql` defines the production data model.

## Screenshots

Screenshots are not committed yet. Recommended captures:

- Mobile public dashboard
- Admin live match control
- Match detail page with event timeline
- Shareable match card
- Standings and knockout views

## Setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For a new Supabase database, run `supabase/schema.sql` in the Supabase SQL editor and add an admin email to `public.admin_users`.

Useful checks:

```bash
npm run build
npm run lint
npm run verify:data-safety
npm run verify:live-workflow
```

## Production Data Safety

Production tournament data is manually entered and must be preserved. Before migrations or imports:

```bash
npm run backup:prod-data
npm run verify:data-safety
```

Protected tables include `teams`, `players`, `matches`, `match_events`, `match_votes`, and `admin_users`. Seed/import scripts must use stable-key upserts and must not wipe production data unless explicitly requested.

## What This Demonstrates

- Building a real product for a real local community use case
- Full-stack React + Supabase architecture
- Data modeling for tournaments, match events, voting, lineups, and admin access
- Real-time-style match operations and event-derived statistics
- Mobile-first and multilingual UI design
- Deployment-focused engineering with Vercel and data-safety scripts
