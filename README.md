# Self-Tracker

A self-hosted, single-user app for keeping track of money, school, bills and the gym in one place. It's built to run on a home server and be reached privately (for example over [Tailscale](https://tailscale.com)), and it installs as an app on your phone.

## Features

**Finance**
- Import Bank of America's combined CSV export (`ExportData.csv`) with a preview step, duplicate protection, and automatic categories
- Transfers between your own accounts are detected, so they move balances without counting as income or spending
- An Accounts tab with spending donut charts (overall and per account), date ranges, and a category filter
- Account types: checking, savings, credit card (APR, limit, minimum payment) and installment loans (Affirm, Klarna, car loans) that count down on each payment date
- A payoff and savings plan that suggests spending cuts, uses savings above an emergency cushion, and compares paying off cards highest-APR-first against paying only the minimums

**School**
- Sync assignments and class times from any iCal feed (Canvas, Blackboard, Google Calendar…) or an uploaded `.ics` file
- A two-week calendar on the dashboard and a month view on the School tab, with a dot per assignment in its class's color
- Check off assignments from the calendar; checkmarks survive re-syncs

**Bills and Gym**
- Recurring bills with due-soon reminders
- Workout sessions, exercises and weight progress charts

## Tech stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Prisma 7 + PostgreSQL · Tailwind CSS 4 · Recharts · Docker

## Running it

You need Docker with Docker Compose.

1. Copy the example environment file and fill it in:
   ```bash
   cp .env.example .env
   ```
   - `POSTGRES_PASSWORD`: any strong password for the database
   - `AUTH_SECRET`: generate with `openssl rand -base64 32`
   - `ADMIN_USERNAME`: the name you'll log in with
   - `ADMIN_PASSWORD_HASH`: generate with `npx tsx scripts/hash-password.ts 'your-password'`. Wrap the result in single quotes, because bcrypt hashes contain `$`.

2. Start it:
   ```bash
   docker compose up -d --build
   ```
   Database migrations run automatically when the app container starts.

3. Open http://localhost:3000 and log in.

### Local development

```bash
npm install
docker compose up -d db        # just Postgres
npx prisma migrate deploy
npm run dev
```

## Security notes

- There's one user, whose credentials come from `.env`. The password is stored only as a bcrypt hash, and sessions are signed cookies.
- The app is meant to be reached over a private network like Tailscale, not exposed directly to the internet.
- Never commit `.env`, bank CSV exports or calendar `.ics` files. They're in `.gitignore` for that reason.
