# Implementation Plan: Lark Authentication

## Overview

This plan implements the Lark OAuth authentication layer by extracting existing inline token logic from `lark-api.service.ts`, creating new credential/OAuth/identity services, adding auth state management, and wiring up login/onboarding/callback UI pages with route guards. Tasks are ordered so each step builds on the previous and nothing is left orphaned.

## Tasks

- [x] 1. Create credential store and environment configuration
  - [x] 1.1 Create `src/services/credential-store.ts`
    - Implement `getCredentials()` that reads `VITE_LARK_APP_ID`, `VITE_LARK_APP_SECRET`, `VITE_LARK_APP_TOKEN` from `import.meta.env`
    - Fall back to values from `config.example.ts` when env vars are empty/unset
    - Implement `validateCredentials(creds)` that returns false if any value matches placeholder patterns (e.g. `'YOUR_LARK_APP_ID'`)
    - Implement `warnIfPlaceholder(creds)` that logs a console warning for each placeholder credential
    - Export a `Credentials` interface with `appId`, `appSecret`, `baseAppToken`
    - Note: This supersedes the unused `src/services/lark-config.ts` — that file can be deleted after migration
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [x] 1.2 Create `.env.example` at project root
    - List `VITE_LARK_APP_ID`, `VITE_LARK_APP_SECRET`, `VITE_LARK_APP_TOKEN`, `VITE_LARK_REDIRECT_URI`
    - Use placeholder values like `your_app_id_here` with single-line comments describing each variable's purpose
    - Note: `.env` is already in `.gitignore` — no change needed there
    - _Requirements: 6.4, 6.5_

  - [ ]* 1.3 Write property tests for credential-store
    - **Property 8: Credential resolution with fallback**
    - **Property 9: Placeholder credential detection**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.6**
    - Test file: `src/services/__tests__/credential-store.property.test.ts`

- [x] 2. Extract and refactor auth service from lark-api.service.ts
  - [x] 2.1 Create `src/services/auth.service.ts` by extracting token logic
    - Move `TokenCache` interface, `tokenCache` variable, `fetchTenantToken()`, `createTimeoutSignal()`, and `withRetry()` from `lark-api.service.ts` into this new module
    - Refactor `fetchTenantToken()` to source credentials from `credential-store.ts` via `getCredentials()` instead of importing `LARK_CONFIG` directly
    - Keep the existing `expiresAt = now + (expire - 60) * 1000` calculation
    - Keep the existing `isTokenValid` logic (cache non-null and `expiresAt > now`)
    - Export public API: `getTenantToken()`, `invalidateTokenCache()`, `resetTokenCache()`, `withRetry()`
    - Preserve the dev/prod URL switching logic: `import.meta.env.DEV ? '/lark-api' : 'https://open.larksuite.com/open-apis'`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 2.2 Refactor `src/services/lark-api.service.ts` to consume auth.service.ts
    - Remove all inline token logic (TokenCache, tokenCache, fetchTenantToken, createTimeoutSignal, withRetry, _resetTokenCache)
    - Import `getTenantToken`, `withRetry`, and timeout utilities from `auth.service.ts`
    - Keep all public API functions (`listRecords`, `getRecord`, `createRecord`, `updateRecord`, `extractTextValue`, `extractNumberValue`) — they now delegate to auth.service for token/retry
    - Verify existing service consumers (`member.service.ts`, `app.store.ts`, etc.) still import from `lark-api.service.ts` unchanged
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 2.3 Write property tests for auth.service.ts
    - **Property 1: Token cache validity decision**
    - **Property 2: Expiration timestamp calculation**
    - **Property 3: Error response propagation**
    - **Property 10: Retry with cache invalidation**
    - **Property 11: Non-retryable error short-circuit**
    - **Property 12: Bearer token header format**
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1–2.4, 8.1, 8.4–8.6, 9.1, 9.3, 9.4**
    - Test file: `src/services/__tests__/auth.service.property.test.ts`

- [x] 3. Checkpoint - Ensure token extraction works
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npx vitest --run` to verify existing tests still pass after the extraction refactor.

- [x] 4. Implement OAuth service
  - [x] 4.1 Create `src/services/oauth.service.ts`
    - Implement `buildAuthorizationUrl(config: OAuthConfig): string` — constructs the Lark OAuth URL with `app_id`, `redirect_uri`, `scope` as query params
    - Implement `exchangeCodeForToken(code: string): Promise<UserTokenResponse>` — POSTs to Lark's token endpoint, returns `{ accessToken, openId, expiresIn }`
    - Implement `getStoredSession(): StoredSession | null` — reads from sessionStorage key `sp-tracker-user-token`, parses JSON, validates expiration
    - Implement `storeSession(session: StoredSession): void` — serializes and stores in sessionStorage
    - Implement `clearSession(): void` — removes session from sessionStorage
    - Source `appId` from `credential-store.ts`, `redirectUri` from `VITE_LARK_REDIRECT_URI` env var (default `http://localhost:5173/auth/callback`)
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 4.2 Write property tests for oauth.service.ts
    - **Property 4: OAuth authorization URL construction**
    - **Property 5: Session storage round-trip**
    - **Validates: Requirements 3.2, 3.6, 3.9**
    - Test file: `src/services/__tests__/oauth.service.property.test.ts`

- [x] 5. Implement identity service
  - [x] 5.1 Create `src/services/identity.service.ts`
    - Implement `resolveIdentity(openId: string): Promise<IdentityResult>` — calls existing `getCurrentMember(openId)` from `member.service.ts`; if throws "Member not found" returns `{ status: 'new_user', openId }`; if success returns `{ status: 'resolved', member }`
    - Implement `createMemberRecord(openId, displayName, role): Promise<Member>` — calls `createRecord` on the Members table with fields: `open_id`, `display_name`, `primary_role`, `roles` (array), `scrum_master_id` (null)
    - Leverage existing `mapRecordToMember` pattern from `member.service.ts` (may need to export it)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4_

  - [ ]* 5.2 Write property tests for identity.service.ts
    - **Property 6: Member record mapping**
    - **Property 7: Onboarding record creation structure**
    - **Validates: Requirements 4.1, 4.2, 5.4**
    - Test file: `src/services/__tests__/identity.service.property.test.ts`

- [x] 6. Implement auth store (Zustand)
  - [x] 6.1 Create `src/store/auth.store.ts`
    - Define `AuthState` interface: `isAuthenticated`, `currentMember`, `openId`, `isLoading`, `error`, `isOnboarding`
    - Implement `login()` — calls `buildAuthorizationUrl()` and redirects via `window.location.href`
    - Implement `handleCallback(code: string)` — exchanges code, extracts openId, calls `resolveIdentity()`, sets state accordingly
    - Implement `restoreSession()` — reads session from `getStoredSession()`, if valid resolves identity without OAuth redirect
    - Implement `logout()` — calls `clearSession()`, resets state, triggers navigation to `/login`
    - Implement `completeOnboarding(role: Role)` — calls `createMemberRecord()`, stores member, navigates to main app
    - Implement `clearError()` — clears error state
    - _Requirements: 3.1, 3.5, 3.6, 3.7, 3.9, 4.3, 5.1, 5.4, 5.5, 5.6_

  - [ ]* 6.2 Write unit tests for auth.store.ts
    - Test login initiates redirect
    - Test handleCallback success resolves member
    - Test handleCallback with new user triggers onboarding state
    - Test restoreSession with valid/expired/missing session
    - Test logout clears session and resets state
    - Test completeOnboarding creates record and sets authenticated
    - _Requirements: 3.1, 3.6, 3.7, 3.9, 5.5, 5.6_

- [x] 7. Checkpoint - Ensure all services and store pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UI pages and route guard
  - [x] 8.1 Create `src/pages/LoginPage.tsx`
    - Render "Sign in with Lark" button
    - On click, call `useAuthStore().login()`
    - Show error message if `auth.store.error` is set (from failed OAuth callback)
    - Display loading state during any pending auth operation
    - _Requirements: 3.1, 3.8_

  - [x] 8.2 Create `src/pages/AuthCallbackPage.tsx`
    - Extract `code` from URL query params on mount
    - Call `useAuthStore().handleCallback(code)`
    - Show loading spinner while processing
    - On success (resolved member), navigate to `/quests`
    - On new_user status, navigate to `/onboarding`
    - On error, navigate to `/login` (error message stored in auth store)
    - _Requirements: 3.3, 3.4, 3.8, 4.3_

  - [x] 8.3 Create `src/pages/OnboardingPage.tsx`
    - Render Role_Selector with "Agent" and "Developer" options
    - Confirm button disabled until a role is selected
    - On confirm, disable button (prevent double-submit), call `useAuthStore().completeOnboarding(role)`
    - On success, navigate to main app
    - On failure, show error, re-enable button, preserve selected role
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 8.4 Create `src/components/auth/AuthGuard.tsx`
    - Wrap protected routes
    - On mount, call `restoreSession()` if not already authenticated
    - If `isAuthenticated` is false and not loading, redirect to `/login`
    - If `isOnboarding` is true, redirect to `/onboarding`
    - Render children (via `<Outlet />`) when authenticated
    - _Requirements: 3.9, 4.3_

  - [ ]* 8.5 Write unit tests for LoginPage, OnboardingPage, and AuthGuard
    - Test LoginPage renders button and handles click
    - Test OnboardingPage role selection and confirm flow
    - Test AuthGuard redirects when unauthenticated
    - Test AuthGuard renders children when authenticated
    - _Requirements: 3.1, 5.2, 5.3_

- [x] 9. Wire authentication into App.tsx and app.store.ts
  - [x] 9.1 Update `src/App.tsx` routing
    - Add routes: `/login` → LoginPage, `/auth/callback` → AuthCallbackPage, `/onboarding` → OnboardingPage
    - Wrap existing routes (`/quests`, `/leaderboard`, `/badges`) with `<AuthGuard>`
    - Remove the hardcoded `void initializeApp('ou_diana101')` call
    - The authenticated member is now sourced from `auth.store` → passed to `app.store.initializeApp(openId)` after successful auth
    - _Requirements: 3.1, 3.5, 4.2_

  - [x] 9.2 Update `src/store/app.store.ts` integration
    - Remove or gate the hardcoded openId usage
    - `initializeApp` now receives the real openId from `auth.store.currentMember.openId`
    - The auth store drives when `initializeApp` is called (after login/session restore)
    - Display `currentMember.displayName` in the navigation bar instead of a hardcoded name
    - _Requirements: 3.5, 4.2_

  - [ ]* 9.3 Write integration tests for the full auth flow
    - Test: unauthenticated user → redirected to /login
    - Test: OAuth callback with valid code → member resolved → main app
    - Test: OAuth callback with new user → onboarding → member created → main app
    - Test: page refresh with valid session → session restored → main app
    - Test: page refresh with expired session → redirected to /login
    - _Requirements: 3.1, 3.9, 4.3, 5.5_

- [x] 10. Cleanup and final wiring
  - [x] 10.1 Remove unused `src/services/lark-config.ts`
    - This file is currently not imported anywhere (lark-api.service.ts uses config.ts)
    - Its functionality is now fully replaced by `credential-store.ts`
    - Verify no imports reference it before deletion
    - _Requirements: 6.1_

  - [ ]* 10.2 Write a smoke test verifying credential-store → auth.service → lark-api.service chain
    - Mock env vars, verify getCredentials flows through to token fetch
    - Verify placeholder detection triggers console warning
    - _Requirements: 6.3, 6.6, 9.3, 9.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npx vitest --run` for full test suite.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- **Extraction vs net-new**: Tasks 2.1 and 2.2 are refactoring existing code out of `lark-api.service.ts`. Tasks 1.1, 4.1, 5.1, 6.1, 8.1–8.4 are net-new files.
- The Vite proxy (`/lark-api`) is already configured — no proxy task is needed
- `.gitignore` already lists `.env` and `src/services/config.ts` — no changes needed
- `member.service.ts` already has `getCurrentMember` and `mapRecordToMember` — identity.service.ts wraps these, it does not reimplement them
- `lark-config.ts` is currently unused (lark-api.service.ts imports from config.ts) — it gets deleted in task 10.1 after credential-store.ts replaces its intent
- Each property test uses `fc.assert(fc.property(...))` with `{ numRuns: 100 }` minimum
- Checkpoints ensure incremental validation between major phases

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["8.5", "9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3", "10.1"] },
    { "id": 8, "tasks": ["10.2"] }
  ]
}
```
