# Deir Hanna Local World Cup

React + Vite starter for the Deir Hanna local World Cup tournament app.

## Included

- Mobile-first public dashboard
- Real tournament data entered manually by admins
- Clickable team cards with squad and detail pages
- 10-player squad limit with 7 starters and 3 bench players
- Clickable player cards with goals, assists, history, and next games
- English, Hebrew, and Arabic manual names for teams and players
- Automatic league table calculation
- Match schedule with final, live, and scheduled states
- Clickable match rows with scorers, assists, final score, time, and lineups
- Player leaderboards for goals, assists, and goal contributions
- Single-game knockout path with semi-finals, third-place match, and final
- Supabase-backed admin panel for adding, editing, and deleting teams, players, and matches
- Supabase-backed prediction voting with one browser vote per match

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
npm run seed:sql
node scripts/verify-real-data-mode.mjs
```

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Run `supabase/schema.sql` in the Supabase SQL editor.
   - For an existing demo database, run `supabase/migrations/20260614_prepare_real_data_mode.sql` once. It adds multilingual columns and clears tournament demo rows while preserving `admin_users`.
4. Add your admin email:

```sql
insert into public.admin_users (email)
values ('your-email@example.com');
```

5. Optional: generate cleanup seed SQL. In real-data mode this clears tournament rows and leaves the app ready for manual admin entry:

```bash
npm --silent run seed:sql > /tmp/deir-hanna-seed.sql
```

Admin access uses Supabase magic-link email login. Public viewers do not need accounts.

## Next Steps

- Add real teams, players, fixtures, scores, and venues from the Admin page.
- Enter English, Hebrew, and Arabic names manually. The app does not auto-translate names.
- Deploy after Supabase env vars and database schema are configured.
- Add PWA support before sharing by QR code.
