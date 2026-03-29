#!/bin/sh
set -e

mkdir -p /data

if [ ! -f /data/prod.db ]; then
  echo "📦 Initializing SQLite database from bundled seed..."
  cp /app/prisma/dev.db /data/prod.db
else
  echo "ℹ️  Existing SQLite database found at /data/prod.db"
fi

echo "🚀 Starting Next.js server..."
exec node server.js
