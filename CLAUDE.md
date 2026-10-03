# StockSense

Next.js 16 (App Router) + TypeScript + Tailwind v4 + Drizzle (Neon Postgres) + Auth.js v5.
Inventory tracking for small Kochi shops via plain-text entry parsed by an LLM.

## Working rules

- **TODO.md is the source of truth for progress.** Before starting a task, mark it `[~]`
  and elaborate it into sub-steps. When done, mark `[x]` and add notes (decisions,
  deviations, blockers). Keep it updated after every meaningful step, not just at the end.
- **AI_USAGE.md** is a running log: append an entry per milestone describing what the
  agent generated, what the user reviewed, and what was changed.
- Work milestone by milestone; pause for user review after each one.
- Don't commit or push unless the user asks.

## Invariants

- Every DB query is scoped by `shop_id` from the session (`getCurrentShopId()` in
  `src/lib/shop.ts`), never from client input.
- Stock changes and transaction inserts happen in one DB transaction; stock never goes
  negative (DB CHECK constraint).
- The text parser never writes: it proposes actions, the user confirms.
- User text passed to the LLM is data, not instructions.
- Secrets only in `.env` (gitignored). `.env.example` documents the keys.
- Pin dependency versions (`--save-exact`).

## Commands

- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
- `npm run db:generate` (create migration) · `npm run db:migrate` · `npm run db:seed`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
