# AI Job Apply

An AI-powered job application automation platform built as a monorepo.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | Next.js 14, TypeScript, Tailwind CSS |
| Backend      | Node.js, Express, TypeScript        |
| Database     | PostgreSQL + Prisma ORM             |
| Queue        | BullMQ                              |
| Cache        | Redis                               |
| AI           | Google Gemini API                   |

---

## Monorepo Structure

```
ai-job-apply/
├── frontend/                   # Next.js app (port 3000)
│   ├── src/
│   │   ├── app/                # App Router pages & layouts
│   │   └── lib/                # API client, utilities
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
│
├── backend/                    # Express API server (port 4000)
│   ├── src/
│   │   ├── config/             # env, database, redis, gemini
│   │   ├── middleware/         # auth, validation
│   │   ├── queues/             # BullMQ queues & workers
│   │   └── index.ts            # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Seed script
│   └── package.json
│
├── shared/                     # Shared types, enums, constants
│   ├── src/
│   │   ├── types.ts
│   │   ├── enums.ts
│   │   └── constants.ts
│   └── package.json
│
├── .env.example                # Root env reference
├── package.json                # Workspace root
└── README.md
```

---

## Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- **PostgreSQL** running locally (or via Docker)
- **Redis** running locally (or via Docker)
- **Google Gemini API key** — get one at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Quick start with Docker (optional)

```bash
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ai_job_apply -p 5432:5432 postgres:16
docker run -d --name redis -p 6379:6379 redis:7
```

---

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-username/ai-job-apply.git
cd ai-job-apply
npm install
```

### 2. Configure environment variables

Copy the example files and fill in your values:

```bash
# Root (reference only — actual values go in each package)
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

Key variables to set:

| Variable         | Description                          |
|------------------|--------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string         |
| `REDIS_HOST`     | Redis host (default: `localhost`)    |
| `REDIS_PORT`     | Redis port (default: `6379`)         |
| `JWT_SECRET`     | Long random string for signing JWTs  |
| `GEMINI_API_KEY` | Your Google Gemini API key           |

### 3. Set up the database

```bash
# Run migrations (creates tables from Prisma schema)
npm run db:migrate

# Generate Prisma client
npm run db:generate

# (Optional) Open Prisma Studio
npm run db:studio
```

### 4. Start development servers

Run both frontend and backend together:

```bash
npm run dev
```

Or individually:

```bash
npm run dev:backend   # http://localhost:4000
npm run dev:frontend  # http://localhost:3000
```

---

## Available Scripts

### Root workspace

| Script              | Description                                 |
|---------------------|---------------------------------------------|
| `npm run dev`       | Start frontend + backend concurrently       |
| `npm run build`     | Build all packages                          |
| `npm run lint`      | Lint all packages                           |
| `npm run typecheck` | Type-check all packages                     |
| `npm run db:migrate`| Run Prisma migrations                       |
| `npm run db:generate`| Regenerate Prisma client                  |
| `npm run db:studio` | Open Prisma Studio                          |

### Backend only

```bash
cd backend
npm run dev        # tsx watch (hot reload)
npm run build      # Compile TypeScript to dist/
npm run db:seed    # Seed the database
```

### Frontend only

```bash
cd frontend
npm run dev        # Next.js dev server
npm run build      # Production build
npm run lint       # ESLint
```

---

## API

The backend exposes a REST API at `http://localhost:4000`.

- Health check: `GET /health`
- All endpoints are prefixed with `/api/v1`

Routes will be documented here as features are implemented.

---

## Database Schema

The Prisma schema (`backend/prisma/schema.prisma`) defines these models:

- **User** — accounts and authentication
- **Resume** — stored resume content per user
- **JobListing** — scraped or manually added job postings
- **JobApplication** — tracks application status, cover letter, and tailored resume

---

## Shared Package

`@ai-job-apply/shared` contains TypeScript types, enums, and constants used by both the frontend and backend. Both packages reference it via npm workspaces — no separate build step needed during development.

Key exports:
- `JobStatus`, `ApplicationSource`, `QueueJobType`, `UserRole` enums
- `ApiResponse<T>`, `JobApplication`, `JobListing`, `User`, `Resume` types
- `QUEUE_NAMES`, `CACHE_TTL`, `API_PREFIX` constants

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run `npm run typecheck && npm run lint` before committing
4. Open a pull request

---

## License

MIT
