#!/bin/sh
set -e

echo "🔄 Running Prisma migrations..."
npx prisma db push --skip-generate

echo "🌱 Seeding database (skipped if already seeded)..."
# Only seed if the user table is empty
USER_COUNT=$(npx prisma db execute --stdin <<'SQL'
SELECT COUNT(*) as count FROM User;
SQL
) || true

node --import tsx prisma/seed.ts 2>/dev/null || echo "ℹ️  Seed skipped (data already exists or seed failed gracefully)"

echo "🚀 Starting Next.js server..."
exec node server.js
