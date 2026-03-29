# ─── Stage 1: deps ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install libc compat for Alpine + openssl for Prisma
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: builder ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

# Generate Prisma client (uses the schema, doesn't touch the DB)
RUN npx prisma generate

# Build a seeded SQLite database inside the image so deployment does not rely
# on a local untracked prisma/dev.db file being present in the build context.
RUN DATABASE_URL="file:/app/prisma/dev.db" npx prisma db push --skip-generate
RUN DATABASE_URL="file:/app/prisma/dev.db" npm run db:seed

# Build the Next.js app (produces .next/standalone)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/data/prod.db"
RUN npm run build

# ─── Stage 3: runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Database lives in a mounted volume at /data
ENV DATABASE_URL="file:/data/prod.db"

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
RUN mkdir -p /data \
 && chown -R nextjs:nodejs /data

# Copy the standalone Next.js server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma directory so the runtime image includes the seed database
COPY --from=builder /app/prisma ./prisma

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# The /data volume will hold the SQLite database file
VOLUME ["/data"]

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
