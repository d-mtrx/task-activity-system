# Task Activity System

A real-time task management backend built with Node.js (TypeScript), PostgreSQL, Redis, and Socket.io.

🚀 **Live Demo:** https://task-activity-system-production.up.railway.app

> Open the live URL in your browser for an interactive demo   or hit the endpoints directly with curl. Both work on the same server.

---

## Features

- **REST API**   Create, list, and update tasks
- **Real-time updates**   WebSocket broadcast via Socket.io + Redis Pub/Sub
- **Token-based auth**   JWT authentication on all task endpoints
- **Caching**   Redis cache for `GET /tasks` with automatic invalidation
- **Activity logs**   Redis List stores an audit trail of all task events
- **Pagination & filtering**   Filter by status, search by keyword, paginate results
- **Docker**   One-command setup with Docker Compose
- **Railway**   Deployed and live

---

## Testing the Live Demo

### Option 1   Browser UI

Visit https://task-activity-system-production.up.railway.app

- Register or log in
- Create and update tasks
- Open the same URL in a **second tab** with a different user   any task event in one tab appears instantly in the other tab's live feed, demonstrating the WebSocket + Redis Pub/Sub pipeline in real time

### Option 2   curl

```bash
BASE=https://task-activity-system-production.up.railway.app

# 1. Register
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "secret123"}' | jq

# 2. Save token
TOKEN="paste-token-here"

# 3. Create a task
curl -s -X POST $BASE/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Fix login bug", "description": "Users cant log in on mobile"}' | jq

# 4. List tasks
curl -s $BASE/tasks -H "Authorization: Bearer $TOKEN" | jq

# 5. Update status (paste task id from step 4)
curl -s -X PATCH $BASE/tasks/<task-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "in-progress"}' | jq

# 6. Activity logs
curl -s "$BASE/tasks/activity" -H "Authorization: Bearer $TOKEN" | jq

# 7. Health check
curl -s $BASE/health | jq
```

---

## Quick Start (Docker   recommended)

```bash
# Clone the repo
git clone https://github.com/d-mtrx/task-activity-system.git
cd task-activity-system

# Copy env file (defaults work out of the box with Docker)
cp .env.example .env

# Start everything (Postgres + Redis + App)
# Docker Compose v2 (plugin):
docker compose up --build

# Docker Compose v1 (standalone binary):
docker-compose up --build
```

The API and UI will be available at `http://localhost:3000`.

> Migrations run automatically on startup   no separate step needed.

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+

### Steps

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your local Postgres/Redis credentials

# Start dev server with hot reload (migrations run on startup)
npm run dev
```

---

## API Reference

Base URL (live): `https://task-activity-system-production.up.railway.app`


Base URL (local): `http://localhost:3000`

### Auth

#### Register
```
POST /auth/register
Content-Type: application/json

{ "username": "alice", "password": "secret123" }
```

#### Login
```
POST /auth/login
Content-Type: application/json

{ "username": "alice", "password": "secret123" }
```

Returns `{ data: { token, username } }`. Use the token as `Authorization: Bearer <token>` on all task endpoints.

---

### Tasks

All task endpoints require `Authorization: Bearer <token>`.

#### Create a Task
```
POST /tasks
Content-Type: application/json

{ "title": "Fix login bug", "description": "Users can't log in on mobile" }
```

#### List Tasks
```
GET /tasks
GET /tasks?status=pending
GET /tasks?search=bug&page=2&limit=10
```

Query params:
| Param | Type | Description |
|---|---|---|
| `status` | string | Filter: `pending`, `in-progress`, `completed` |
| `search` | string | Full-text search on title and description |
| `page` | int | Page number (default: 1) |
| `limit` | int | Items per page (default: 20, max: 100) |

#### Update Task Status
```
PATCH /tasks/:id
Content-Type: application/json

{ "status": "in-progress" }
```

Valid statuses: `pending`, `in-progress`, `completed` (any direction is allowed).

#### Activity Logs
```
GET /tasks/activity              # Last 50 events across all tasks
GET /tasks/activity?taskId=<id>  # Events for a specific task
```

#### Health Check
```
GET /health
```

---

## WebSocket

Connect via Socket.io:

```js
import { io } from 'socket.io-client';

const socket = io('https://task-activity-system-production.up.railway.app', {
  auth: { token: '<jwt>' }   // optional   read-only access works without token
});

socket.on('task:created', (event) => {
  console.log('New task:', event.payload);
  // { event, payload: Task, actorUsername, timestamp }
});

socket.on('task:updated', (event) => {
  console.log('Updated task:', event.payload);
});
```

---

## Architecture

```
src/
├── config/
│   ├── database.ts              # PostgreSQL pool
│   ├── redis.ts                 # Redis clients (cache, pub, sub)
│   └── schema.sql               # Schema   runs on every startup (idempotent)
├── controllers/
│   ├── task.controller.ts
│   └── auth.controller.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── models/
│   ├── task.model.ts            # SQL queries
│   └── user.model.ts
├── routes/
│   ├── task.routes.ts
│   └── auth.routes.ts
├── services/
│   ├── task.service.ts          # Business logic
│   ├── auth.service.ts
│   ├── cache.service.ts         # Redis cache wrapper
│   ├── event.service.ts         # Pub/Sub ↔ Socket.io bridge
│   └── activity-log.service.ts  # Redis List audit trail
├── types/index.ts
├── app.ts                       # Express app factory
└── index.ts                     # Bootstrap (HTTP + WebSocket server)
public/
└── index.html                   # Demo frontend (single file, no build step)
```

---

## Design Decisions

### Why PostgreSQL for tasks?

Tasks are structured, relational data with strict schema requirements (UUID primary keys, status constraints, foreign keys to users). PostgreSQL's ACID guarantees ensure no task update is lost, and indexes on `status` and `created_at` make filtered queries efficient.

### Why Redis   and for what exactly?

Redis serves **three distinct roles**, each chosen because a relational database would be a poor fit:

1. **Caching (`GET /tasks`)**   The task list is read far more than it changes. A 5-minute cache in Redis reduces DB load significantly. Cache keys include query parameters so different filters don't collide. Invalidation happens on every create/update.

2. **Pub/Sub (real-time broadcast)**   Socket.io by itself only broadcasts to clients connected to the *same* process. In a multi-replica deployment, a task updated on Instance A must reach clients on Instance B. Redis Pub/Sub decouples the emitter from the socket layer: any instance publishes to `task:events`, all instances subscribe and forward to their local sockets. This makes horizontal scaling trivial.

3. **Activity logs (Redis List)**   `LPUSH` + `LTRIM` gives O(1) inserts with automatic bounding at 1,000 entries. Activity logs are high-write, short-lived, and don't need joins or transactions   perfect for Redis. Storing them in Postgres would require index maintenance and periodic cleanup jobs for no real benefit.

### Why a separate Redis connection for Pub/Sub?

Redis requires dedicated connections for subscribers   a client in subscribe mode cannot issue regular commands. We maintain three clients: `redis` (cache), `redisPub` (publish), `redisSub` (subscribe).

### Why inline migrations instead of a migration runner?

All schema SQL uses `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `CREATE OR REPLACE FUNCTION`   making it fully idempotent. Running it on every startup is safe, removes the need for a separate migration step, and works seamlessly on both Docker and Railway without shell script timing issues.

### Error handling

All async route handlers use `try/catch` forwarding to a central `errorHandler` middleware. Validation is done with `express-validator` before hitting services. The 4xx/5xx distinction is explicit: 422 for validation, 404 for missing resources, 409 for conflicts, 401 for auth.

---

## Trade-offs

| Decision | Trade-off |
|---|---|
| No ORM (raw `pg`) | More SQL to write, but full control over queries and no hidden N+1 problems |
| JWT (stateless auth) | Tokens can't be revoked without a blocklist; acceptable for this scope |
| Redis activity log (no Postgres) | Logs are ephemeral (capped at 1,000); for production you'd want durable storage |
| Inline migrations | Slightly slower cold start; eliminates deployment complexity entirely |
| Any status → any status | No enforced FSM transitions; intentional for flexibility (easy to add) |
| Single-file frontend | No build step, no framework   easy to review and self-contained |

---

## Deploying to Railway

### 1. Create a Railway project

Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select `task-activity-system`.

### 2. Add PostgreSQL

Inside your Railway project → **New** → **Database** → **Add PostgreSQL**.

### 3. Add Redis

**New** → **Database** → **Add Redis**.

### 4. Set environment variables

In your app service → **Variables**, set the following to match your Railway Postgres and Redis service values:

```
POSTGRES_HOST=<from Railway Postgres service>
POSTGRES_PORT=<from Railway Postgres service>
POSTGRES_DB=<from Railway Postgres service>
POSTGRES_USER=<from Railway Postgres service>
POSTGRES_PASSWORD=<from Railway Postgres service>
REDIS_HOST=<from Railway Redis service>
REDIS_PORT=<from Railway Redis service>
REDIS_PASSWORD=<from Railway Redis service>
JWT_SECRET=<your-strong-secret>
NODE_ENV=production
CACHE_TTL=300
```

### 5. Set the public port

App service → **Settings** → **Networking** → **Public Networking** → enter the port shown in your deployment logs (Railway overrides `PORT` automatically).

### 6. Deploy

Railway deploys automatically on every push to `main`.

### How Railway vs Docker env vars work

| Variable | Docker | Railway |
|---|---|---|
| Postgres | `POSTGRES_HOST/PORT/DB/USER/PASSWORD` | Same vars, values from Railway Postgres service |
| Redis | `REDIS_HOST/PORT/PASSWORD` | Same vars, values from Railway Redis service |
| Auth | `JWT_SECRET` | `JWT_SECRET` (set manually) |
