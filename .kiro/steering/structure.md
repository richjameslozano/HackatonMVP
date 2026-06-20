---
inclusion: always
---

# Project Structure & Architecture

## Directory Layout

```
src/
├── services/                  # Domain and API service layer
│   ├── config.ts              # Lark credentials, table IDs, retry config (gitignored)
│   ├── config.example.ts      # Template for config.ts
│   ├── lark-api.service.ts    # Generic Lark Base CRUD wrapper (retry, timeout, token mgmt)
│   ├── lark-bot.service.ts    # Lark Bot IM messaging wrapper
│   ├── auth.service.ts        # Tenant access token acquisition and caching
│   ├── oauth.service.ts       # Lark OAuth flow (authorization URL, code exchange, sessions)
│   ├── credential-store.ts    # Secure credential storage/retrieval
│   ├── identity.service.ts    # Identity resolution, member record creation
│   ├── member.service.ts      # Member lookup, scrum master resolution
│   ├── quest.service.ts       # Quest CRUD, proposals, approvals, completions
│   ├── badge.service.ts       # Badge evaluation and collection
│   ├── leaderboard.service.ts # Leaderboard ranking logic
│   ├── team-progress.service.ts # Scrum master team progress view
│   ├── notification.service.ts# Notification orchestration via Lark Bot
│   └── __tests__/             # Service tests (unit + property-based)
│
├── store/                     # Zustand state management
│   ├── app.store.ts           # Main app state (quests, badges, leaderboard, actions)
│   └── auth.store.ts          # Authentication state (login, session, onboarding)
│
├── pages/                     # Route-level page components (one per route)
│   ├── QuestBoardPage.tsx
│   ├── LeaderboardPage.tsx
│   ├── BadgeCollectionPage.tsx
│   ├── CommandCenterPage.tsx
│   ├── LoginPage.tsx
│   ├── AuthCallbackPage.tsx
│   └── OnboardingPage.tsx
│
├── components/                # Reusable UI components grouped by domain
│   ├── auth/                  # AuthGuard (route protection)
│   ├── layout/                # AppShell, NavigationBar, Sidebar, TopBar, RoleSwitcher
│   ├── quest/                 # QuestCard, QuestCategory, ProposeTaskForm, PendingTaskCard
│   ├── badge/                 # BadgeGrid, BadgeCard, ProgressBar
│   ├── leaderboard/           # LeaderboardTable, LeaderboardRow, TimePeriodFilter
│   ├── command-center/        # DeveloperProgressTable, BlockersPanel, PendingReviews
│   └── shared/                # LoadingIndicator, ErrorBanner, ConfirmationToast, ValidationError
│
├── types/                     # TypeScript interfaces and domain types
│   └── index.ts               # Single barrel file for all shared types
│
├── utils/                     # Pure utility functions
│   ├── validation.ts          # Input validation helpers
│   ├── permissions.ts         # Role-based permission checks
│   └── __tests__/             # Property-based tests for utils
│
├── App.tsx                    # Root component with route definitions
├── main.tsx                   # Entry point (React DOM render)
├── index.css                  # TailwindCSS imports
├── test-setup.ts              # Vitest global test setup
└── vite-env.d.ts              # Vite type declarations
```

## Architectural Boundaries

- **Services** own all Lark Base API interaction. Components and pages never call APIs directly.
- **Store** bridges services and UI. Components dispatch store actions; stores call services internally.
- **Pages** are thin route-level wrappers that compose components and connect to stores.
- **Components** are presentation-focused. Business logic lives in services and utils.
- **Types** are shared across all layers. All domain interfaces live in `src/types/index.ts`.
- **Utils** contain pure functions (validation, permission checks) that are easy to property-test.

## Naming Conventions

| Artifact | Pattern | Example |
|----------|---------|---------|
| Service file | `{domain}.service.ts` | `quest.service.ts` |
| Store file | `{domain}.store.ts` | `auth.store.ts` |
| Page component | `{Name}Page.tsx` | `QuestBoardPage.tsx` |
| UI component | `{Name}.tsx` (PascalCase) | `BadgeCard.tsx` |
| Test file | `{source-file}.test.ts(x)` | `lark-api.service.test.ts` |
| Test directory | `__tests__/` sibling to source | `services/__tests__/` |
| Barrel export | `index.ts` in component folders | `components/layout/index.ts` |

## Key Patterns

### Service Layer

- Each service exports named functions (not classes).
- `lark-api.service.ts` provides generic CRUD (`listRecords`, `getRecord`, `createRecord`, `updateRecord`) with built-in retry and timeout.
- Token management is handled by `auth.service.ts` with in-memory caching.
- `config.ts` is gitignored — use `config.example.ts` as template.

### State Management (Zustand)

- Stores are created with `create<StateInterface>()`.
- Store hooks are named `use{Domain}Store` (e.g., `useAppStore`, `useAuthStore`).
- Actions are defined inline in the store creator and call service functions.
- State selectors use `useStore((s) => s.field)` pattern for granular re-renders.

### Routing

- React Router v6 with `<Routes>` and `<Route>` in `App.tsx`.
- Public routes: `/login`, `/auth/callback`, `/onboarding`.
- Protected routes wrapped in `<AuthGuard>` with `<AppShell>` layout.
- Default redirect: `/` → `/quests`.

### Component Organization

- Each component domain folder has an `index.ts` barrel file for re-exports.
- Components use named exports (not default exports).
- Colocated test files go in `__tests__/` within the same component folder.

### Testing

- Tests use `describe`/`it`/`expect` from Vitest.
- External dependencies (fetch, services) are mocked with `vi.fn()` and `vi.mock()`.
- `vi.stubGlobal('fetch', mockFetch)` for API service tests.
- Section separators use `// ─── Section Name ───` comment style.

## Import Rules

- Use relative imports within `src/`.
- Import types with `import type { ... }` when only the type is needed.
- Store imports: `import { useAppStore } from '../store/app.store'`.
- Service imports: `import { functionName } from '../services/{domain}.service'`.
- Type imports: `import type { Member, Quest } from '../types'`.
