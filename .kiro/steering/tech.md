---
inclusion: always
---

# Tech Stack & Build System

## Core Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript (strict mode) | ~6.0 |
| UI Framework | React | 19.x |
| Build | Vite | 8.x |
| Styling | TailwindCSS | 3.x |
| Routing | react-router-dom | 7.x |
| State | Zustand | 5.x |
| HTTP | Native `fetch` (no axios in service layer) | — |
| Testing | Vitest + fast-check | 4.x / 4.x |

## External Services

- **Lark Base (Bitable) REST API** — All CRUD via `lark-api.service.ts`. Never call Lark endpoints directly from components or stores.
- **Lark Bot IM v1 API** — Notifications via `notification.service.ts` and `lark-bot.service.ts`.
- **Auth** — `tenant_access_token` obtained via app credentials (`app_id` + `app_secret`). Token is cached in-memory with expiry buffer of 60 seconds.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (uses proxy for /lark-api)
npm run build        # tsc -b && vite build
npm run lint         # ESLint (flat config, TS + React rules)
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run (CI-friendly)
```

## Code Style Rules

- Named exports only — no default exports.
- `import type { ... }` for type-only imports.
- Section separators: `// ─── Section Name ───` (full-width box-drawing lines).
- Functions over classes for services. Each service file exports standalone functions.
- `as const` assertions on config objects for literal type narrowing.
- Avoid `any`. Use `unknown` for untyped Lark field values, then narrow with extractor helpers (`extractTextValue`, `extractNumberValue`).

## API & Service Layer Patterns

- All Lark HTTP calls route through `lark-api.service.ts` which provides `listRecords`, `getRecord`, `createRecord`, `updateRecord`.
- Retry: 3 attempts via `withRetry()`. Token cache invalidated between retries.
- Timeout: 10 000 ms per request via `AbortController` + `setTimeout`.
- Non-retryable errors (token fetch failures, "record not found") throw immediately without retry.
- Dev proxy: Vite proxies `/lark-api` → `https://open.larksuite.com/open-apis` so browser CORS is bypassed during development.
- Lark text fields are arrays (`[{text: "value", type: "text"}]`). Always use `extractTextValue()` to read them.

## State Management (Zustand)

- One store per domain: `useAppStore`, `useAuthStore`.
- Store created with `create<StateInterface>()`.
- Actions are inline in the store creator and call service functions.
- Use selectors `useAppStore((s) => s.field)` to minimise re-renders.
- Optimistic updates with rollback on failure (see `completeQuest` pattern).
- Parallel background data fetches with `void state.fetchX()` (fire-and-forget).
- Session state persisted to `sessionStorage` only — never `localStorage`.

## Routing

- React Router v6 declarative routes in `App.tsx`.
- Public: `/login`, `/auth/callback`, `/onboarding`.
- Protected: wrapped in `<AuthGuard>` → `<AppShell>` layout.
- Default redirect: `/` → `/quests`.

## Testing Conventions

- Tests live in `__tests__/` directories alongside source.
- Property-based tests use `fast-check` with **minimum 100 iterations** (`{ numRuns: 100 }`).
- Mock external dependencies with `vi.fn()` and `vi.mock()`.
- Mock `fetch` with `vi.stubGlobal('fetch', mockFetch)`.
- Use `describe` / `it` / `expect` from Vitest.
- Naming: `{source-file}.test.ts` or `{source-file}.test.tsx`.

## Error Handling

- Service functions throw on failure — stores catch and handle.
- Notifications are non-blocking: failures set a `notificationWarning` state rather than throwing.
- Lark API responses always check `data.code !== 0` as a business-logic error independent of HTTP status.

## Environment & Credentials

- `src/services/config.ts` is **gitignored** — use `config.example.ts` as template.
- Env vars via `import.meta.env` (Vite convention); `.env` at project root.
- Credential resolution order: env vars → `config.ts` fallback (handled by `credential-store.ts`).
- Never log or expose `appSecret` or `tenant_access_token` values.
