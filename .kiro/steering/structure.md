# Project Structure

```
src/
├── services/                  # Domain and API service layer
│   ├── lark-api.service.ts    # Generic Lark Base API wrapper (CRUD, retry logic)
│   ├── lark-bot.service.ts    # Lark Bot messaging wrapper
│   ├── quest.service.ts       # Quest board logic, task proposals, approvals
│   ├── badge.service.ts       # Badge evaluation and collection
│   ├── leaderboard.service.ts # Leaderboard ranking
│   ├── member.service.ts      # Member resolution and auth
│   ├── notification.service.ts# Notification orchestration
│   └── __tests__/             # Service unit + property + integration tests
│
├── store/                     # Zustand state management
│   └── app.store.ts           # Global app state and actions
│
├── pages/                     # Route-level page components
│   ├── QuestBoardPage.tsx
│   ├── LeaderboardPage.tsx
│   └── BadgeCollectionPage.tsx
│
├── components/                # Reusable UI components
│   ├── layout/                # AppShell, NavigationBar, RoleSwitcher
│   ├── quest/                 # QuestCard, QuestCategory, ProposeTaskForm, PendingTaskCard
│   ├── badge/                 # BadgeGrid, BadgeCard, ProgressBar
│   ├── leaderboard/           # LeaderboardTable, LeaderboardRow
│   └── shared/                # LoadingIndicator, ErrorBanner, ConfirmationToast, ValidationError
│
├── types/                     # TypeScript interfaces and domain types
│   └── index.ts
│
├── utils/                     # Pure utility functions (validation, permissions)
│   ├── validation.ts
│   ├── permissions.ts
│   └── __tests__/             # Property-based tests for utils
│
├── App.tsx                    # Root component with routing
├── main.tsx                   # Entry point
└── index.css                  # TailwindCSS imports
```

## Architectural Boundaries

- **Services** handle all Lark Base API interaction. Components never call APIs directly.
- **Store** bridges services and UI. Components dispatch store actions; store calls services.
- **Components** are presentation-focused. Business logic lives in services and utils.
- **Types** are shared across all layers. Keep domain types in `src/types/`.
- **Utils** contain pure functions (validation, permission checks) that are easy to property-test.
