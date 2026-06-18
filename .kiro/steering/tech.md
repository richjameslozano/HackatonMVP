# Tech Stack & Build System

## Core Stack

- **Language**: TypeScript
- **Framework**: React 18+
- **Build tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router
- **State management**: Zustand
- **HTTP**: fetch or axios for Lark Base API calls
- **Testing**: Vitest + fast-check (property-based testing)

## External Services

- **Lark Base (Bitable) REST API**: All CRUD operations for data (Members, Quests, Quest_Completions, Badges, Badge_Earned tables)
- **Lark Bot IM v1 API**: Notifications for task proposals and approval/rejection decisions
- **Auth**: tenant_access_token via Lark Open Platform app credentials (app_id + app_secret)

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests once (no watch)
npx vitest --run

# Lint
npm run lint
```

## Key Conventions

- Use TypeScript strict mode
- All API calls go through a service layer (`lark-api.service.ts`)
- Retry configuration: 3 attempts, 10-second timeout per attempt, linear retry
- No local data persistence beyond browser session
- Property-based tests use fast-check with minimum 100 iterations per property
- Test files live alongside their source in `__tests__/` directories
