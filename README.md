# SAT Forge — Digital SAT Prep Platform

A full-stack, self-hosted SAT preparation platform built with **Next.js 15**, **Prisma**, and **SQLite**. Features Bluebook-style mock exams, adaptive practice sets, spaced repetition, deep analytics, and tutor dashboards.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
- [Database](#database)
- [Deployment](#deployment)
  - [Docker Compose (Recommended)](#docker-compose-recommended)
  - [Manual Node.js Deployment](#manual-nodejs-deployment)
  - [Reverse Proxy with Nginx](#reverse-proxy-with-nginx)
- [Default Accounts](#default-accounts)
- [Admin Features](#admin-features)
- [Project Structure](#project-structure)
- [Scripts](#scripts)

---

## Features

### 🎓 Student Experience
- **Bluebook-style Mock Exams** — Full-length adaptive mock exams that mirror the real digital SAT, complete with a countdown timer, question flagging, answer elimination, and automatic Module 2 routing based on Module 1 performance.
- **Targeted Practice Sets** — Build custom sessions filtered by section (Reading & Writing / Math), difficulty (Easy / Medium / Hard), domain, and question count.
- **Quick-start Presets** — One-click sessions for common drills (e.g., "Hard questions only", "Confidence builder").
- **Post-exam Review** — Full question-by-question review of any completed exam attempt with correct answers and explanations.
- **Dark Mode** — System-preference-aware dark mode with a manual toggle, stored in `localStorage` with no flash on load.

### 🧠 Spaced Repetition (SRS)
- Questions answered incorrectly are automatically added to a **Review Bin** powered by the [SM-2 algorithm](https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm).
- The Review Bin surfaces questions at optimal intervals to maximise long-term retention.
- A dedicated "Start review" button is promoted on both the Dashboard and Practice pages whenever items are due.

### 📊 Analytics & Goal Tracking
- **Dashboard** with lifetime accuracy, sessions completed, average response time per question, and current study streak (🔥).
- **Score Trajectory Chart** — Line chart of SAT scores over time across completed mock exams.
- **Skill Mastery Heatmap** — Colour-coded grid of every sub-skill, showing individual accuracy and attempt counts.
- **Weak Area Detection** — Automatically surfaces the lowest-accuracy skills with progress bars.
- **Accuracy by Difficulty** — Breakdown of Easy / Medium / Hard performance.
- **First-try vs. Repeat Accuracy** — Distinguishes between performance on fresh questions vs. SRS repeats.
- **Goal Tracking** — Set a target SAT score and test date; live countdown displayed on the dashboard.

### 👩‍🏫 Tutor & Classroom Features
- Tutors can create **classrooms** and invite students.
- **Per-student drill-down pages** showing individual accuracy, session history, and progress by domain and skill.
- **Cohort analytics** on the dashboard give tutors an at-a-glance view of all students across all classrooms.
- **Assignment creation** with optional due dates.

### 🛠 Admin Features
- **Question Manager** — Browse, search, and filter all questions in the database.
- **Question Creator** — Rich form to create new questions with passage, choices, and correct answer.
- **Bulk Importer** — Import questions from the College Board API endpoint or from local SAT practice PDF data via Python parser scripts.
- **AI Explanation Generator** — One-click generation of expert step-by-step explanations for any question, powered by Google Gemini.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, Server Components) |
| Language | TypeScript |
| Database | SQLite (via [Prisma ORM](https://www.prisma.io/)) |
| Auth | Custom HMAC-signed cookie sessions (bcrypt passwords) |
| Styling | Vanilla CSS with design tokens (light + dark mode) |
| Math Rendering | [KaTeX](https://katex.org/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Containerisation | Docker (multi-stage build, Alpine) |

---

## Getting Started

### Prerequisites

- **Node.js** v22+
- **npm** v10+
- (For Docker deployment) **Docker** and **Docker Compose**

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/amliang1/sat-prep-site.git
cd sat-prep-site

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set SESSION_SECRET to a random string

# 4. Push the Prisma schema to create the database
npm run db:push

# 5. Seed the database with sample questions and default accounts
npm run db:seed

# 6. Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite file path. Example: `file:./prisma/dev.db` |
| `SESSION_SECRET` | ✅ | A long, random string used to sign session cookies. Change this before deploying. |
| `GEMINI_API_KEY` | ⬜ | Google Gemini API key. Required only for the AI explanation feature in the admin panel. |

---

## Database

This project uses **SQLite** managed through **Prisma**. The schema is located at `prisma/schema.prisma`.

### Key Models

| Model | Description |
|---|---|
| `User` | Students, tutors, and admins. Stores target score, test date, and study streak. |
| `Question` | SAT questions with section, domain, skill, difficulty, passage, choices, and explanation. |
| `PracticeSession` | A single practice set or SRS review session with aggregated stats. |
| `PracticeAnswer` | Individual answers within a session, including response time and attempt number. |
| `MockExamAttempt` | A full-length mock exam attempt with a final score. |
| `SrsItem` | Spaced repetition state (interval, ease factor, next review date) per user/question pair. |
| `Classroom` | A tutor's class containing student members and assignments. |

### Common Commands

```bash
# Apply schema changes to the database
npm run db:push

# Seed default accounts and sample questions
npm run db:seed

# Open Prisma Studio (GUI database browser)
npx prisma studio
```

---

## Deployment

### Docker Compose (Recommended)

The project includes a production-ready `Dockerfile` (multi-stage Alpine build) and a `docker-compose.yml`.

**1. Create your environment file:**

```bash
# On your server, in the project root
cat > .env << 'EOF'
DATABASE_URL="file:/data/prod.db"
SESSION_SECRET="replace-with-a-long-random-secret"
GEMINI_API_KEY=""
EOF
```

**2. Build and start:**

```bash
docker compose up -d --build
```

On first start, the entrypoint script will automatically:
1. Run `prisma db push` to create the database schema.
2. Seed the database with default accounts if it is empty.
3. Start the Next.js server on port **3000**.

The SQLite database is persisted in a named Docker volume (`sat_data`) so data survives container restarts and upgrades.

**Updating to a new version:**

```bash
git pull
docker compose up -d --build
```

### Manual Node.js Deployment

```bash
# Build the production bundle
npm run build

# Set up the database
npm run db:push
npm run db:seed

# Start with PM2 (recommended process manager)
npm install -g pm2
pm2 start npm --name "sat-prep-site" -- start
pm2 save
pm2 startup
```

### Reverse Proxy with Nginx

Point a domain at the app running on port 3000:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the config and add HTTPS with Let's Encrypt:

```bash
sudo ln -s /etc/nginx/sites-available/sat-prep /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Default Accounts

After running the seed script (`npm run db:seed` or on first Docker start), the following accounts are created:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@satforge.local` | `ChangeMe123!` |
| Student | `student1@satforge.local` | `Student123!` |
| Student | `student2@satforge.local` | `Student123!` |

> **⚠️ Security:** Change the admin password immediately after your first login in any production environment.

---

## Admin Features

Navigate to `/admin` after logging in as an admin to access:

- **`/admin/questions`** — Browse and search all questions.
- **`/admin/questions/create`** — Create a new question manually.
- **`/admin/import`** — Import questions in bulk from the College Board question bank or from local PDF-parsed data.
- **AI Explanations** — On any question page, an admin can click "Generate explanation" to call the Gemini API and auto-fill the explanation field.

---

## Project Structure

```
sat-prep-site/
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Default data seeder
├── public/                   # Static assets (images, etc.)
├── scripts/                  # Data import & utility scripts
│   ├── import-collegeboard.ts
│   ├── import-local-sat-practice.ts
│   └── normalize-imported-math.ts
├── src/
│   ├── app/                  # Next.js App Router pages & API routes
│   │   ├── admin/            # Admin-only pages
│   │   ├── api/              # API route handlers
│   │   ├── dashboard/        # Student/tutor dashboard
│   │   ├── exam/             # Mock exam shell & results
│   │   ├── practice/         # Practice session builder & viewer
│   │   ├── tutor/            # Tutor classroom & student pages
│   │   ├── layout.tsx        # Root layout (header, fonts, dark mode)
│   │   └── globals.css       # Design tokens & global styles
│   ├── components/           # Shared React components
│   └── lib/                  # Server-side utilities
│       ├── auth.ts           # Session management & helpers
│       ├── constants.ts      # Shared enums (roles, sections, difficulties)
│       ├── dashboard.ts      # Analytics data fetching
│       ├── prisma.ts         # Prisma client singleton
│       ├── questions.ts      # Question filtering helpers
│       └── srs.ts            # Spaced repetition (SM-2) logic
├── Dockerfile                # Multi-stage production Docker build
├── docker-compose.yml        # Compose file for self-hosted deployment
├── docker-entrypoint.sh      # Container startup script
├── next.config.ts            # Next.js configuration (standalone output)
└── package.json
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server (after build) |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Seed the database with default accounts and sample questions |
| `npm run ingest:collegeboard` | Import questions from the College Board API |
| `npm run import:sat-practice` | Parse local SAT practice PDFs and import questions |
| `npm run normalize:math` | Normalise LaTeX formatting in imported math questions |
