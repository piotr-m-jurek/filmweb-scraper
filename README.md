# filmweb-scraper

Exports your Filmweb ratings (voted films + your score for each) into a local SQLite database.

## How it works

1. `pnpm run login` — Playwright logs into filmweb.pl and saves the session to `data/storageState.json`.
2. `pnpm run discover` — paginates your `votes/film` list (auth required) and records every voted movie ID + vote date into `scrape_queue`.
3. `pnpm run enrich` — for each queued ID, fetches the movie details (`film/{id}/preview`) and your rating (`votes/film/{id}`), and upserts them into `movies` / `scores`.

All three scripts are safe to rerun: discovery and enrichment upsert by ID, and `scrape_queue` tracks per-movie status (`pending` / `done` / `error`) so a rerun only retries what's missing or failed — no need to redo the whole 1200+ movie run to pick up a handful of new votes or fix transient errors.

## Data

- `movies` — id, title (Polish, falls back to original title if untranslated), year, duration, genres, directors, cast, full raw API response
- `scores` — your rating, view date, vote timestamp per movie
- `scrape_queue` — internal checkpoint table, not really "your data"

Inspect with `pnpm run db:studio` (drizzle studio) or any SQLite client, e.g.:

```bash
sqlite3 data/filmweb.db "select title, year, rate from movies join scores on scores.movie_id = movies.id order by rate desc limit 20;"
```

## Setup

```bash
pnpm install
npx playwright install chromium
cp .env.example .env   # fill in FILMWEB_EMAIL / FILMWEB_PASSWORD / FILMWEB_USER_ID
npx drizzle-kit migrate
pnpm run login
pnpm run discover
pnpm run enrich
```

Note: `pnpm login` (no `run`) is pnpm's own npm-registry login command — always use `pnpm run login` for this project's script.
