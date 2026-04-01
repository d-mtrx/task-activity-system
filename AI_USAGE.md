# AI Usage

This document reflects how AI tooling was used during the development of this system.

---

## Tools Used

- **Claude (Anthropic)** — primary AI assistant throughout the build

---

## What AI Helped With

### 1. Initial architecture scaffolding

I described the requirements (REST API + PostgreSQL + Redis + WebSockets + auth + Docker) and asked Claude to suggest a clean folder structure before writing any code. It proposed the `config / controllers / middleware / models / routes / services / types` split, which matched my instincts. This saved maybe 10 minutes of bikeshedding and let me get to the interesting parts faster.

### 2. Redis connection strategy for Pub/Sub

I asked Claude to explain why you need separate Redis client instances for Pub/Sub vs regular commands. It correctly explained that a client in `SUBSCRIBE` mode is blocked and cannot issue other commands — which is why `redisPub`, `redisSub`, and the main `redis` client are three separate connections. I would have likely hit this as a runtime bug without asking first.

### 3. Boilerplate for express-validator

I asked Claude to generate the validator chains for the task and auth controllers. It produced correct chains. I reviewed and trimmed them — in particular I removed a redundant `.escape()` call it added to the title field (which would corrupt content like `<fix this>`) and replaced it with `.trim()` only.

### 4. TypeScript type definitions

I asked Claude to draft the shared `types/index.ts`. The initial output included an overly broad `Record<string, any>` in `ActivityLog.changes`. I tightened it to `Record<string, unknown>` to preserve type safety without losing flexibility.

### 5. SQL migration script

Asked Claude for idiomatic PostgreSQL DDL for the tasks and users tables. It generated the `uuid-ossp` extension usage, the `CHECK` constraint on status, and the `update_updated_at_column` trigger. I added the `DROP TRIGGER IF EXISTS` guard myself after noticing re-running the migration would fail without it.

### 6. Docker Compose healthchecks

Asked Claude for a `docker-compose.yml` with proper healthchecks so the app container waits for Postgres/Redis before starting. It produced correct `pg_isready` and `redis-cli ping` checks. I adjusted the `entrypoint.sh` to run migrations before the server starts, which Claude's initial version omitted.

---

## What I Had to Correct or Improve

| Area | Issue | Fix |
|---|---|---|
| Validator `.escape()` on task title | Would HTML-encode `<` and `>` in task titles | Replaced with `.trim()` only |
| `ActivityLog.changes` typed as `any` | Weak typing | Changed to `Record<string, unknown>` |
| Migration re-run safety | No `DROP TRIGGER IF EXISTS` guard | Added manually |
| Entrypoint missing migration step | App would start before schema existed | Added `node dist/config/migrate.js` to entrypoint |
| Redis Pub/Sub not initialised | Claude's first `index.ts` called `EventService.init()` before Redis connected | Reordered: `connectRedis()` → `EventService.init()` |

---

## Reflection

AI was genuinely useful for reducing time on boilerplate and for explaining subtle infrastructure concerns (Redis connection modes, Postgres trigger syntax). It was not useful as a rubber stamp — every generated snippet needed review, and several had subtle bugs or style choices that didn't fit the codebase.

The right mental model: AI is a fast first-draft machine. You still need to read the output, understand it, and own it. I wouldn't submit anything I couldn't explain line-by-line in a review.
