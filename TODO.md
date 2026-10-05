# StockSense TODO

Living checklist from start to finish. Updated as work happens: tasks get elaborated
when started, checked off (`[x]`) when done, and notes added for decisions or blockers.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (see note)

---

## Milestone 1 — Project setup, DB schema, auth, seed data, CI

### 1.1 Scaffold

- [x] Scaffold Next.js (App Router) + TypeScript + Tailwind + ESLint via create-next-app
  - Note: npm name rules forbid capitals in "Project", so scaffolded into a subfolder and moved up.
  - Note: create-next-app's install failed on npm 11 `--allow-scripts` policy; ran `npm install` manually.
  - Note: got Next.js 16.3.7 / React 19.2 (plan said 15; building against 16).
- [x] Create TODO.md and CLAUDE.md (CLAUDE.md tells the agent to keep TODO.md + AI_USAGE.md current)
- [x] Install pinned deps: drizzle-orm 0.45.3, @neondatabase/serverless 1.1.0, next-auth 5.0.0-beta.32,
      @auth/drizzle-adapter 1.11.3, bcryptjs 3.0.3, zod 4.6.5
- [x] Install pinned dev deps: drizzle-kit, tsx, dotenv, vitest 5, prettier
  - Note: vitest 5 needs @types/node 22+/24+; bumped @types/node 20 → 24.19.0 (matches Node 24).
  - Note: bcryptjs 3 ships its own types, so no @types/bcryptjs.
  - Note: scaffold's caret ranges (`^4`, `^19`, ...) replaced with exact installed versions.
  - Note: `npm audit` reports 4 moderate advisories, all in drizzle-kit's dev-only esbuild
    (dev-server CORS issue). Not shipped to prod; the only "fix" downgrades drizzle-kit. Accepted for now.
- [x] Add npm scripts: typecheck, test, test:watch, format, db:generate, db:migrate, db:seed
- [x] `git init` (no commits unless asked)
- [x] `.env.example` with DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, LLM vars
  - Note: scaffold's `.gitignore` ignored `.env*` including the example; added `!.env.example`.

### 1.2 Database

- [x] `drizzle.config.ts` (migrations output to `src/db/migrations`)
- [x] `src/db/schema.ts`: users, accounts (Auth.js), shops, categories, items, transactions
  - Decision: JWT sessions, so no sessions/verification_tokens tables.
  - [x] numeric(12,3) quantities, numeric(10,2) prices
  - [x] CHECK current_stock >= 0 (also threshold >= 0, price >= 0)
  - [x] CHECK transaction quantity > 0 (adjustments may be negative, never 0)
  - [x] transaction_type enum: sale | restock | adjustment
  - [x] soft delete via items.deleted_at; item name unique per shop among live items only
  - [x] unique (shop_id, lower(name)) on categories; indexes (shop_id, created_at), (item_id, created_at)
  - [x] shops.owner_user_id unique (one shop per owner)
  - Note: first draft used ON DELETE RESTRICT for items→categories and transactions→items;
    that breaks cascading shop deletes (seed re-run). Switched to default NO ACTION.
- [x] `src/db/index.ts` Drizzle client on Neon WebSocket Pool (needed for DB transactions)
- [x] Generate first migration → `src/db/migrations/0000_init.sql`
- [x] Apply migration to Neon (project "store", AWS ap-southeast-1 Singapore, pooled connection)
  - Connection string captured via Playwright straight into `.env`; never printed.

### 1.3 Auth

- [x] `src/auth.ts` Auth.js v5: Credentials (email/password) + Google (only if env set), JWT sessions
  - Drizzle adapter for users/accounts; `events.createUser` creates a shop for Google sign-ups.
  - `session.user.id` comes from the JWT `sub` (typed in `src/types/next-auth.d.ts`).
- [x] `src/app/api/auth/[...nextauth]/route.ts`
- [x] `src/lib/password.ts` bcrypt hash/verify (cost 10)
- [x] Signup server action: Zod-validated, creates user + shop + 6 default categories in one DB transaction
  - Handles duplicate email both by pre-check and unique-violation (23505) race.
- [x] `src/lib/shop.ts` getCurrentShop()/getCurrentShopId() from session, cached per request, `server-only`
- [x] Route protection via `src/proxy.ts`
  - Note: Next 16 renamed middleware → proxy. The proxy only checks for a session cookie
    (optimistic, per Next docs); real auth is enforced by getCurrentShop() on the server.
- [x] Login + signup pages: mobile-first, labelled inputs, 48px touch targets, aria-invalid/describedby errors
  - Decision: light high-contrast theme only (no dark mode), system fonts (no Google Fonts fetch).
- [x] Placeholder protected home page with sign-out
- [x] Smoke-tested in dev: `/` → 307 `/login`; `/login` and `/signup` render 200
- [x] Browser-tested against real DB (Playwright): demo login ✓, sign-out ✓, wrong password → error ✓,
      signup validation errors ✓, valid signup → home with shop name ✓ (6 default categories),
      duplicate email (different case) blocked ✓. Test user deleted afterwards.
  - Bug found + fixed: React 19 resets the form after an action, wiping fields on validation error.
    Actions now echo back non-password values (`FormState.values`) used as `defaultValue`.
  - Note: console hydration warning comes from a browser extension (`bis_skin_checked`), not app code.

### 1.4 Seed

- [x] `scripts/seed.ts`: demo shop "Chettan's Stores, Edappally", 5 categories, 31 Kochi kirana items
- [x] 60 days of sales history (`scripts/seed-sim.ts`, pure + deterministic PRNG):
      Poisson daily demand, weekend uplift, ~5% spike days, restock-on-reorder-point, sales 8am–9pm IST
  - Built-in forecast test cases: new item (Appam Podi, 6 days old), slow mover (Gingelly Oil),
    near-zero demand (Boost), draining items with restocking stopped (Mustard Oil, Banana Chips, Surf Excel)
- [x] Stock values consistent with transaction history (opening stock recorded as a restock); unit-tested
- [x] Idempotent: deletes the previous demo user first (cascades), all in one DB transaction
- [x] Demo login demo@stocksense.local / demo1234
- [x] Seeded Neon: 5 categories, 31 items, 3,399 transactions
  - Verified in DB: every item's current_stock equals its ledger sum; none negative;
    9 items at/below threshold (Appam Podi, Banana Chips, Boost, Coca-Cola, Gingelly Oil,
    Mustard Oil, Parle-G, Surf Excel, Wheat Atta) — good material for M4 alerts.

### 1.5 Quality / CI

- [x] Vitest config (`vitest.config.mts`, `@` alias) + tests: password hashing, seed simulation (8 tests)
  - Note: renamed to `.mts` to silence Vite's ESM-in-CJS warning.
- [x] Prettier config (printWidth 100) + `.prettierignore`
- [x] `.github/workflows/ci.yml`: Node 24, npm ci, lint, typecheck, test
- [x] Verify locally: lint ✓, typecheck ✓, test ✓ (8/8), build ✓
  - Note: `LayoutProps` global only exists after `next build` generates types, so standalone
    `tsc` in CI failed; replaced with an explicit props type.
  - Note: build failed when `src/db/index.ts` threw at import without DATABASE_URL; now the Pool
    is created lazily (connects on first query) and only warns in dev.
- [x] `.env` created locally with a generated AUTH_SECRET (gitignored); DATABASE_URL left empty
- [x] AI_USAGE.md first entry
- [x] README stub
- [x] Lint ✓, typecheck ✓, tests 8/8 ✓, build ✓ after the form fix
- [x] Pause for user review → user said "do 2 to 4" (2026-09-30); running M2–M4 back to back

---

## Milestone 2 — Items and categories CRUD

- [x] Plan
  - Route group `(app)` with shared shell: header + mobile bottom nav (Entry, Items, Alerts, Categories)
  - Data layer takes `shopId` explicitly (`src/lib/data/*`); server actions get it from getCurrentShopId()
  - Client-supplied ids (item, category) are always re-checked against the shop
  - Stock edits go through the ledger: creating with stock → restock tx; editing stock → adjustment tx
- [x] Schema: categories.deleted_at (soft delete) + unique name among live categories → migration 0001 (applied)
- [x] Zod schemas for item + category forms (`src/lib/validation.ts`)
  - Empty number fields give "Enter a price" instead of silently becoming 0 (z.coerce would do that).
- [x] Format helpers (`src/lib/format.ts`): toNum, formatQty (trims zeros), formatINR, round3
- [x] App shell layout + bottom nav; home moved to `src/app/(app)/page.tsx`; `(app)/error.tsx` boundary
  - Fix: fixed bottom nav could cover the last button when scrolled into view → `scroll-pb-24` on html.
- [x] Items list: cards, name search (ILIKE, wildcards escaped), category filter via plain GET form
- [x] New / edit item form: field errors, values kept on error, low-stock badge in list
- [x] Soft delete with two-step inline confirm (`role=alertdialog`)
- [x] Categories page: counts, add, inline rename, delete disabled/blocked while it has live items
- [x] DB errors mapped to field errors (`DataError`, unique violation 23505 → "already have …")
- [x] Tests: `tests/unit/validation.test.ts` + `tests/integration/scoping.test.ts`
      (cross-shop get/list/update/delete/category use all blocked; ledger; duplicates). 21/21 pass.
  - Integration tests auto-skip without DATABASE_URL, so CI stays DB-free.
- [x] Browser check (headless Chromium, 390×844): create w/ validation error, duplicate, edit stock,
      delete, category add/duplicate/rename/delete, delete blocked for non-empty category. No page errors.
  - Note: the Playwright MCP tab was backgrounded (visibilityState hidden) so clicks never fired;
    switched to `@playwright/test` 1.63 headless (needed for M6 E2E anyway).
  - Verified ledger in DB (restock +10, adjustment −8 → stock 2); test rows removed afterwards.
- [x] AI_USAGE entry

## Milestone 3 — Text parser + confirmation flow + transactions

- [x] Plan
  - Pipeline: text → parser (LLM or rules) → Zod-validated actions → resolve against shop items
    (fuzzy match) → drafts with questions → user confirms → one DB transaction applies all.
  - The parser and resolver are pure/read-only; only `applyEntries` writes.
  - Deviation: `LLM_API_KEY` is empty, so a deterministic rules parser is the fallback (also
    used when the LLM fails, with a visible "check carefully" notice).
- [x] `src/lib/parser/schema.ts`: Zod action schema: sale | restock | create_item | update_threshold
- [x] `src/lib/llm/`: provider abstraction (Groq / OpenAI-compatible), JSON mode, timeout, typed errors
      (timeout, network, http, invalid_json, not_configured)
- [x] `src/lib/parser/prompt.ts`: system prompt; user text wrapped in `<entry>` tags as data, tags stripped from input
- [x] `src/lib/parser/rules.ts`: fallback parser (English + common Manglish verbs, "2 rice", "rice x2", multi-item)
- [x] `src/lib/parser/match.ts`: fuzzy matching (case, typos, plurals, pack-size tokens, aliases)
- [x] `src/lib/parser/resolve.ts`: drafts + clarifying questions (unknown, ambiguous, missing qty)
- [x] `src/lib/data/entries.ts`: atomic apply (row locks, oversell check, override → adjustment + sale)
- [x] Entry page UI: text box → cards with Confirm / Edit / Cancel; oversell warning + override checkbox
- [x] Error states: LLM timeout, invalid JSON, network failure, empty/too-long input
- [x] Unit tests: schema, matcher, rules parser, resolver, prompt guard; integration test for apply
  - 27 parser unit tests + 5 apply integration tests (rollback on oversell, override, cross-shop). 53/53 pass.
  - Fix: `loadItemOptions` was exported from a `"use server"` file, which made it a callable action
    taking any shopId. Moved to `listItemOptions` in the data layer.
- [x] Browser check (headless, 390×844, demo shop): ambiguous "rice" + missing qty asks and blocks Confirm;
      answering unblocks; Cancel keeps the text; 2-line save shows stock after; oversell warns and needs
      the checkbox; Edit shows fields; unrelated text gives an unmatched line to remove. No page errors.
  - Bug found + fixed: a card collapsed as soon as its question was answered, so typing "12" stopped
    after "1". Cards that start with a question now stay open.
  - Bug found + fixed: re-seeding failed on a 0-quantity restock (items with reorderQty 0 hitting their
    reorder point; date-dependent). Sim now skips them; fixture added to the seed-sim test.
  - Demo shop re-seeded afterwards to remove test sales.
- [x] AI_USAGE entry
- [x] Pause for review → skipped per "do 2 to 4"; review after M4

## Milestone 4 — Low-stock alerts + forecast

- [x] Plan
  - Pure `src/lib/forecast.ts`: daily series over the last 14 complete IST days (or item age if younger),
    rate = average or EWMA(0.3), days_left = stock / rate; no sales → days_left null (won't run out).
  - Data: `src/lib/data/alerts.ts` loads items + last 15 days of sales for the shop, runs the forecast.
- [x] Pure forecast function: 14-day average and EWMA (alpha 0.3)
  - Decision: backtested on the seed simulation (`scripts/backtest-forecast.ts`, 6 seeds, 9,222 cases,
    vs actual next-7-day mean): MAE average 0.64, EWMA 0.80 units/day → plain average is the default.
    Caveat: simulated demand is stationary + spikes, which favours the average; revisit with real data.
  - Seed catalog moved to `scripts/seed-catalog.ts` so the backtest can import it.
- [x] Tests: zero sales, one sale, spike, new item, IST day bucketing, low-stock rule, threshold crossing (14)
- [x] Low-stock rule: stock <= threshold OR days_left <= 3 (`isLowStock`)
- [x] Alerts page: sorted by days left (out of stock first), reason + pace shown, links to item
  - New items (< 3 days of history) labelled "rough guess"; no-sales items never flagged by forecast.
- [x] Nav badge with the real low-stock count (React `cache()` shares the query with the alerts page)
- [x] Toast after a sale crosses the threshold (entry save)
  - Decision: no auto-hide (WCAG 2.2.1); stays until Dismiss, survives "New entry", links to Alerts.
- [x] Verify: lint ✓, typecheck ✓, tests 67/67 ✓, build ✓, browser check ✓
  - Browser: badge 9 → 10 after selling Sugar down to its alert level; toast shown, survives New entry,
    dismisses; Sugar listed on Alerts. Demo shop re-seeded afterwards.
  - Fix: "About 1 days" → singular.
- [x] AI_USAGE entry
- [x] Pause for review (M2–M4 done, 2026-09-30)
  - Agent self-review 2026-10-03 (user: "review first, if no issue complete the later"): forecast window,
    IST bucketing, shop scoping, urgency sort re-read; lint ✓ typecheck ✓ 77/77 ✓. No issues.

## Milestone 5 — Insights dashboard

- [x] Plan
  - New "Insights" tab (`/insights`); nav becomes 5 tabs.
  - Pure helpers in `src/lib/insights.ts` (range parsing, IST day keys, gap-filling); SQL in
    `src/lib/data/insights.ts`, all scoped by shop_id, days grouped in Asia/Kolkata.
  - Filters are a plain GET form (`?range=7|30|90&category=<id>`), validated server-side.
  - Charts are client components (Recharts) with a visually hidden data table for screen readers.
  - Decision: "Top 5 items" is always this week (last 7 days) per spec; the range filter drives the charts.
  - Revenue = sum(quantity × unit_price) of sales; unit price is captured at sale time.
- [x] Install recharts 3.10.1 (pinned, React 19 peer OK)
  - Fix: npm hoisted react-is 16, which doesn't recognise React 19 elements; pinned react-is 19.2.8 to match React.
- [x] Summary cards: today's sales count, revenue, low-stock count
- [x] Sales over time line chart (Recharts)
- [x] Sales by category chart
- [x] Top 5 items this week
- [x] Low-stock list sorted by days_left
- [x] Filters: 7 / 30 / 90 days, category
  - Invalid `range` falls back to 30; a category id not in this shop is ignored (shows all).
- [x] Tests: pure helpers (unit, 5) + insights queries against the DB (integration, 5: ranges, today,
      category grouping/filter, top items, cross-shop isolation). 77/77 pass.
- [x] Verify: lint ✓, typecheck ✓, tests 77/77 ✓, build ✓, browser check ✓
  - Browser (390×844): cards, 30-day line (30 points), 5 category bars, top 5, 9 low items; 7-day + Oils
    filter narrows everything; bad URL params fall back; 5-tab nav fits; no console errors.
  - Fix: low-stock card was a `<Link>` directly inside `<dl>` (invalid); now a stretched link inside a div.
  - Charts are `aria-hidden` with an equivalent sr-only data table each.
- [x] AI_USAGE entry
- [x] Pause for review (M5 done, 2026-10-01)
  - Agent self-review 2026-10-03: all queries scoped on transactions + items; one fix: "Running low"
    showed "~0 days left" for under a day; now "Under 1 day left" (matches Alerts).

## Milestone 6 — Eval, E2E, docs, deploy

- [x] Parser eval dataset: 44 cases / 52 lines (basic, typo, Manglish, multi, missing qty, ambiguous,
      hard, size, threshold, create) in `scripts/parser-eval-cases.ts`
  - Scored end to end (parse → resolve against the seed catalog). Ambiguous/unknown names must ask, not guess.
  - First 37 cases scored 100%, too easy to be useful; added 7 "hard" cases.
- [x] Eval script (`npm run eval:parser`): rules parser always, LLM too when `LLM_API_KEY` is set
  - Rules parser: 42/44 entries (95.5%), 50/52 lines (96.2%). Misses: "chaya podi" (Malayalam for
    tea powder, no alias) and "customer took 3 …" (unknown verb). Both turn into questions, not
    wrong saves. Left as known limits rather than tuning the parser to the test set.
  - LLM parser not scored: no key in `.env`.
  - `tests/unit/parser-eval.test.ts` keeps a 90% floor and requires all ambiguous cases to pass (CI).
- [x] Playwright E2E (`npm run test:e2e`, `tests/e2e/entry.spec.ts`): signup → sign out → login →
      add item (stock 10) → "sold 3 sugar" → preview "10 → 7" → Confirm → Saved → items list shows 7
  - Uses a throwaway `e2e-*@stocksense.test` shop; global teardown deletes it (verified: 0 left).
  - Pixel 7 viewport, dev server on port 3100. Passes (8s). Not in CI: it needs a database.
- [x] README: setup, env vars, scripts, Mermaid architecture diagram, screenshots, forecast, eval, limitations
  - Screenshots via `scripts/screenshots.ts` (demo login, entry previewed but never confirmed) → `docs/screenshots/`
  - Verify: lint ✓, typecheck ✓, tests 79/79 ✓, build ✓, E2E 1/1 ✓
- [x] Deploy to Vercel (user: "u do the rest", 2026-10-03): https://stocksense-zeta-seven.vercel.app
  - Code on GitHub (public): https://github.com/muhmd-sinan/stocksense, branch `main`; CI green.
  - Vercel project `stocksense` linked to the repo, so pushes to `main` redeploy.
  - Env (production): DATABASE_URL, AUTH_SECRET, LLM_PROVIDER/MODEL/TIMEOUT_MS, copied from `.env`
    over stdin, never printed. Google + LLM keys empty in `.env`, so not set.
  - Note: `stocksense.vercel.app` is someone else's project; ours got `stocksense-zeta-seven`.
  - Note: `vercel link` appended `.vercel` and `.env*` to `.gitignore`; the trailing `.env*` re-ignored
    `.env.example`, so reverted (both were already covered).
  - Smoke test on prod: `/` → 307 `/login`; demo login ✓; entry preview ✓ (not saved); items, alerts (9),
    insights all 200; no page errors.
- [x] Final AI_USAGE.md update

## Milestone 7 — UI/UX redesign (new visual identity)

- [x] Plan (user, 2026-10-05: new visual identity, "bold and punchy", light + dark following the
      phone, expressive motion; use the sites in uihelper.md, /impeccable-uxui and /taste-skill)
  - Direction: "shop signboard + cash-register keys". Cool-tinted ink + paper neutrals, one
    signal-yellow accent used as solid blocks with ink text (never yellow text on light), red only
    for stock danger. Chunky variable grotesk for headings and big numbers, tabular figures.
  - Signature interaction: primary buttons sit on a darker base and press down into it on tap.
  - Supersedes the M1 decisions "light theme only" and "system fonts only".
  - Kept stable: routes, nav labels, form labels, headings and button names (E2E + screenshot
    script select by them).
- [x] Research uihelper sites (Motion, view transitions, loaders, button effects, icons, fonts)
  - Used: Motion, React ViewTransition (Next guide), CodeFronts press/swap ideas, Colorion/CodeFronts
    loader patterns, Magic UI number-ticker approach, Phosphor icons.
  - Skipped: Lenis and GSAP (smooth scroll fights the fixed bottom bar and the on-screen keyboard;
    nothing here needs pinned scroll), AnimateIcons (a second icon family), 3D/WebGL.
  - uiverse.io returned 403; Ripplix/Norrly galleries weren't readable as text.
- [x] Tokens in globals.css: OKLCH colours (light/dark via prefers-color-scheme), type, radii, motion
  - `--color-*: initial` so only project tokens compile; stray `slate-*` classes fail loudly.
  - Contrast computed (OKLCH -> sRGB): body >= 11:1, secondary >= 6.7:1, edges/focus >= 5.6:1 in both themes.
- [x] Font via next/font: Archivo (variable weight + width), tabular numbers on all figures
- [x] Install pinned: motion 14.0.0, @phosphor-icons/react 2.1.10 (`optimizePackageImports` for Phosphor)
- [x] Shared UI: key buttons, fields (+ hints), tags, dots loader, skeletons, number ticker, toast
- [x] App shell: top bar, bottom nav with icons, gliding indicator, badge pop, pending tap state
  - Fix: Alerts tab's accessible name read the badge first ("1 items low on stock Alerts");
    now "Alerts, 1 item low on stock".
- [x] Page transitions (React ViewTransition, `components/screen.tsx`) + loading.tsx per route
  - Tabs slide by direction (nav-forward/nav-back); header and bar are named so they stay put.
- [x] Entry: example chips, reading skeleton, review slips (stagger in, collapse on remove),
      stock bump, Saved stamp, toast slides up; focus moves to each step's heading
- [x] Items list (ledger rows), item form, delete confirm
- [x] Alerts
- [x] Insights: yellow "Today" block with count-up, area + bar charts themed via CSS, scroll reveals
- [x] Categories, auth pages (signboard header), error, (app)/not-found
- [x] Reduced motion: MotionConfig reducedMotion="user", CSS guards, view transitions fade only
- [x] Verify: lint ✓, typecheck ✓, tests 79/79 ✓, build ✓, E2E 1/1 ✓
  - Playwright (Pixel 7) light, dark, reduced motion: all screens, remove line, Edit, Cancel keeps
    text + focus, save stamp, toast + dismiss, 3 tab taps run view transitions. No page errors.
    Throwaway `e2e-*` shops deleted afterwards; demo shop never confirmed.
  - Dev only: Next's dev badge sits over the Entry tab (not in production builds).
- [x] README screenshots + AI_USAGE entry
  - Fix: screenshot script now waits for real headings (pages stream behind skeletons) and uses
    reduced motion so charts and numbers are captured finished.
- [x] Pause for review → user: "all done? then push to github and deploy it" (2026-10-05)
- [x] Deploy: branch + PR, merge to `main` after CI, Vercel redeploys, smoke-test production
  - PR #1 (CI ✓, Vercel preview ✓) merged as `bab58ae`; production deploy succeeded.
  - Production smoke test (read-only, demo login, entry previewed not confirmed), light + dark:
    Archivo loads, themed background, all 5 screens render, 5 nav icons, no page errors.

## Milestone 8 — Entry page rebuilt as Sold / Bought tabs

- [x] Plan (user, 2026-10-05: "straight forward like a tab for sold and bought"; Bought = table of
      name, category, price, quantity; Sold = category, product, quantity; date stored
      automatically; "keep it similar to other pages")
  - Bought: a name that matches an existing item (case-insensitive, exact) restocks it; a new name
    creates the item (unit "pcs", alert level 0, both editable on the item page). Price is the
    selling price; a changed price on a restock updates the item.
  - Sold: category filters the product list; shows stock before → after; oversell needs a tick.
  - Date: the transaction's `created_at`, shown in IST on a "Recent" list under the form.
  - Text parser is no longer used on Entry. `lib/parser` stays (eval script + tests); the
    `parseEntryAction` endpoint is removed so it isn't a dead public server action.
- [x] Pure row helpers + unit tests (`lib/entry-rows.ts`, `tests/unit/entry-rows.test.ts`)
  - Two lines for one item add up; a leftover oversell tick is ignored once the line fits.
- [x] Data: restock can carry a price; recent entries query; IST date formatting
  - `listItemOptions` → `listEntryItems` (adds categoryId). `formatWhen`: Today / Yesterday / 3 Oct.
- [x] Server action: save sold / bought rows (re-validated, shop-scoped, one DB transaction)
  - `saveSoldAction` / `saveBoughtAction`, one schema each, so a tab can't send the other's lines.
  - Removed `parseEntryAction` and the combined `entriesSchema` (no callers left).
- [x] UI: tabs, Sold rows, Bought rows, saved banner, low-stock toast, Recent list, skeleton
  - Files: `entry-form.tsx` (tabs), `sold-panel.tsx`, `bought-panel.tsx`, `entry-parts.tsx`.
  - Phone: lines stack; md+: one row per line like a table. Locked category on a restock.
- [x] Update E2E, screenshot script, README, Items empty-state copy
  - README screenshot renamed `entry-review.png` → `entry.png`.
- [x] Verify: lint ✓, typecheck ✓, tests 100/100 ✓ (incl. DB integration), build ✓, E2E 1/1 ✓
  - Playwright (Pixel 7 + 1280px, light + dark): no page overflow, no wrapped buttons, remove
    button level with inputs, tab indicator on the selected tab, focus goes to the new line /
    first error. Demo shop only filled in, never saved; E2E used a throwaway `e2e-*` shop.
  - Fix: long prices overflowed the desktop Price box; columns rebalanced (no overflow at
    ₹99999.5 / qty 1234.5).
  - `prettier --write` had rewritten line endings on 31 untouched files; restored them.
- [x] AI_USAGE entry
- [x] Pause for review → user: "make it so that it recommends the item if it were already typed
      once earlier" (2026-10-05)
- [x] Bought: suggest existing items while typing a name
  - Custom suggestion list under Name (ARIA combobox), replacing the `<datalist>`: Android Chrome
    shows datalists unreliably and they can't show stock/price or rank by recency.
  - Ranking: name starts with the text → a word starts with it → contains it → fuzzy (typos and
    local names via the parser's `scoreName`). Ties: most recently bought first.
  - Tapping an empty Name box lists recently bought items. Picking one fills name, category and
    price; a price auto-filled from an earlier pick is replaced, a typed price is kept.
  - Keyboard: ↓/↑ move, Enter picks, Esc closes. Max 5 suggestions.
  - Files: `name-combobox.tsx`; `suggestItems` / `withName` in `lib/entry-rows.ts`;
    `listEntryItems` adds each item's latest restock time (`lastBought`).
- [x] Unit tests (ranking, autofill), E2E step, verify
  - Unit 90/90 ✓, typecheck ✓, lint ✓, E2E 1/1 ✓ (types "sug", picks "Sugar 1kg").
  - Playwright on the demo shop (Pixel 7 + 1280px, light + dark, read-only): tap on an empty
    box lists recently bought; "ri" → Matta Rice, Ponni Rice; ↓ + Enter picks and fills the
    price, focus stays in the box; Esc closes; touch tap picks; Add row doesn't pop the list
    open; options ≥ 61px tall; no page overflow or errors.
- [x] Pause for review → user asked for the responsive pass next (M9)

## Milestone 9 — Responsive pass, every page

- [x] Plan (user, 2026-10-05: "make the whole website every page every element responsive to
      various screen sizes"; later: "use sidebar if needed for pc version rather than bottom bar.
      in phone bottom bar is fine")
  - Audit every page at 320, 360, 390, 768, 1024, 1280, 1440px (Playwright): page overflow,
    clipped/overflowing text, wrapped buttons, small tap targets, content under the nav bar.
  - Use the width on bigger screens instead of a phone column in the middle (nav, page layouts).
  - Baseline (prod build on :3101; the dev server's `/items/[id]` worker was stuck): no page
    overflows at any width. Found: auth headline spills at 320px; nav badge spills; header shop
    name truncated (111px at 320px); item names truncated in Items, Insights, Alerts, Recent;
    category names squeezed to 15px by Rename/Delete at 320px; "N items" links 46×15px; Items
    back link under 44px; every page is a 672px column with a phone bottom bar, even at 1920px.
- [x] Fix and re-audit
  - Shell: below lg, sticky header + bottom bar (Sign out is icon-only under sm, the shop name
    wraps to 2 lines). From lg, a sticky left sidebar (15rem) with brand, shop, nav (the yellow
    key slides vertically, alert count as a pill) and Sign out; content gets the rest, up to
    72rem. Landscape phones (`short` variant: height < 30rem, below lg): header scrolls away,
    slimmer bar with icon beside label.
  - `bottom-nav.tsx` → `main-nav.tsx` with `variant="bar" | "side"`. The layout renders both;
    CSS hides one, so only one "Main" nav is ever in the accessibility tree.
  - Entry: line grids switch on the panel's width (`@container`) instead of the viewport (Sold
    at 36rem, Bought at 40rem); from 88rem the form and Recent sit side by side.
  - Items: names wrap; from a 44rem-wide list each row is a table row (item, category, price,
    stock) under a header row. Alerts: names wrap; days left gets its own column.
  - Insights: filters beside the title from xl; Today's three numbers in one row from lg;
    charts left, lists right from xl. Names in Top 5 / Running low wrap.
  - Categories: Rename/Delete drop under the name when the row is narrow; "N items" links 44px.
  - Forms (item new/edit) cap at 36rem, Categories at 48rem (`Screen className`). Back links 44px.
  - Auth: signboard | form side by side from lg; tagline removed (user asked).
  - Low-stock toast: above the bar on phones, bottom-right corner with the sidebar.
  - Skeletons follow the new layouts.
  - Re-audit (prod build, 320-1920px + 844×390 landscape): no page overflow, no clipped or
    truncated text, no wrapped buttons, nothing under the bar. Left on purpose: the nav badge
    overhangs its icon (by design), Insights "Low stock" link is a stretched link (whole cell).
  - Fix found by the re-audit: auth "StockSense" was too wide for the half-width signboard at lg.
- [x] Verify: lint ✓, typecheck ✓, tests 108/108 ✓, build ✓, E2E 1/1 ✓ (dev and prod build)
- [x] README screenshots regenerated (Pixel 7)
- [x] AI_USAGE entry
- [x] No pause: user chained "responsive → optimize → commit, push, deploy" (2026-10-05)

## Milestone 10 — Faster page and tab switches

- [x] Measure (user, 2026-10-05: "switching pages and tabs feels too slow")
  - Production (demo shop, Pixel-sized Chromium from Kochi, tap → real heading shown):
    Items 864ms, Categories 866ms, Entry 1356ms, Alerts 1370ms, Insights 2394ms (medians of 3).
  - Cause 1: functions run in `iad1` (Washington) but Neon is in `ap-southeast-1` (Singapore),
    so every DB round trip crosses the globe (~220ms), and a page makes 3-6 of them in sequence
    (session → shop → queries).
  - Cause 2: nav links only prefetched down to `loading.tsx` (dynamic routes), so every tap
    waited on a full server render; dynamic pages aren't kept in the client cache either.
  - Sold / Bought tabs: 42-46ms locally (client state only), not a problem.
- [x] Fixes
  - `vercel.json` `regions: ["sin1"]`: functions run next to the database.
  - Nav links `prefetch` (full): all five screens load in the background, so a tap renders from
    the client cache. Saves call `revalidatePath("/", "layout")`, which purges that cache, and
    Next re-prefetches visible links after an invalidation (`pingVisibleLinks`), so prefetched
    screens don't go stale after your own saves. Cost: ~5 small renders per page load.
  - Shorter screen transitions (slide 280/320ms → 200/240ms, 32px instead of 48px).
  - Local prod build: page switches 836-890ms → 76-223ms (medians 82-129ms).
  - E2E now opens Items from the nav after saving (not `page.goto`), so in a production build it
    checks a prefetched screen shows the new stock. Passes on dev and on the prod build.
  - Considered, not done: Cache Components / Partial Prefetching (a migration across every
    route, more than this needs); `staleTimes.dynamic` (prefetch already covers the nav).
- [ ] Re-measure on production
- [x] AI_USAGE entry

## Milestone 11 — Ship M8-M10

- [ ] Commit, push branch, PR, CI, merge to `main`, Vercel production deploy, smoke test
