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
- Browser-persisted admin panel for adding teams, adding players, adding matches, and editing match details/scores

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Next Steps

- Replace seed data in `src/data/tournament.js` with the real teams, players, and fixtures.
- Move the admin data layer from browser storage to Supabase or PostgreSQL.
- Connect admin actions to authenticated backend mutations.
- Add PWA support before sharing by QR code.
