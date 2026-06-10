# Deir Hanna Local World Cup

React + Vite starter for the Deir Hanna local World Cup tournament app.

## Included

- Mobile-first public dashboard
- 12 seeded country teams across 4 groups
- Clickable team cards with detail popups and squad tab
- 10-player squad limit with 7 starters and 3 bench players
- Clickable player cards with goals, assists, history, and next games
- Automatic group table calculation
- Match schedule with final, live, and scheduled states
- Clickable match rows with scorers, assists, final score, time, and lineups
- Player leaderboards for goals, assists, and goal contributions
- Centered single-game knockout path with quarter-finals, semi-finals, and final
- Supabase-backed admin panel for adding teams, adding players, adding matches, editing match details/scores, and updating scorer/assist events
- Supabase-backed prediction voting with one browser vote per match

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
npm run seed:sql
```

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Add your admin email:

```sql
insert into public.admin_users (email)
values ('your-email@example.com');
```

5. Generate seed SQL and run the output in the Supabase SQL editor:

```bash
npm --silent run seed:sql > /tmp/deir-hanna-seed.sql
```

Admin access uses Supabase magic-link email login. Public viewers do not need accounts.

## Next Steps

- Replace seed data in `src/data/tournament.js` with the real teams, players, and fixtures.
- Deploy after Supabase env vars and database seed are configured.
- Add PWA support before sharing by QR code.
