# SAT Forge

SAT Forge is a Next.js SAT prep platform with:

- email/password login
- question categorization by section, domain, skill, difficulty, and tags
- practice sessions with saved answers
- user analytics dashboard
- admin ingestion for public College Board SAT question-bank material

## Stack

- Next.js App Router
- Prisma + SQLite
- simple signed-cookie auth

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Push the Prisma schema and seed starter data:

```bash
npm run db:push
npm run db:seed
```

4. Start the app:

```bash
npm run dev
```

## Seeded admin account

- Email: `admin@satforge.local`
- Password: `ChangeMe123!`

Change the password immediately after first login.

## Importing real public SAT questions

This repo does not bundle a large copyrighted SAT corpus. Instead, it includes an importer that targets public College
Board material on demand:

```bash
npm run ingest:collegeboard -- 40
```

You can also trigger imports from `/admin/import` after signing in as an admin.

## Notes

- The importer is built for public official sources and may need adjustment if College Board changes payload formats.
- Starter seed data is included so the site works before any external import runs.
