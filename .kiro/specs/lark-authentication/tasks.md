# Implementation Plan: Lark Authentication

## Overview

This plan implements the Lark OAuth authentication layer for the SP Madrid Gamified Tracker. It replaces the hardcoded `open_id` initialization with a real login flow, adds tenant token management via a dedicated service, user identity resolution, new-user onboarding with role selection, and credential security via environment variables. The implementation builds incrementally: credential store → auth service → OAuth service → identity service → auth store → UI components → integration wiring.

## Tasks

- [ ] 1. Set up credential store and environment configuration
  - [ ] 1.1 Create `src/services/credential-store.ts` with `getCredentials()`, `validateCredentials()`, and `warnIfPlaceholder()` functions
    - Read `VITE_LARK_APP_ID`, `VITE_LARK_APP_SECRET`, `VITE_LARK_APP_TOKEN` from `import.meta.env`
    - Fall back to values from `config.example.ts` when env vars are empty or unset
    - Define placeholder patterns (e.g. `"your_app_id_here"`) and log console warnings for unresolved credentials
    - Export the `Credentials` interface
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ] 1.2 Create `.env.example` file listing all required environment variables with placeholder values and comments
    - Include `VITE_LARK_APP_ID`, `VITE_LARK_APP_SECRET`, `VITE_LARK_APP_TOKEN`, `VITE_LARK_REDIRECT_URI`
    - Annotate each variable with a single-line comment describing its purpose
    - Verify `.env` is listed in `.gitignore`
    - _Requirements: 6.4, 6.5_

  - [ ]* 1.3 Write property tests for credential store (Properties 8 and 9)
    - **Property 8: Credential resolution with fallback** — for any env var state, `getCredentials()` returns env var value when set and non-empty, fallback otherwise
    - **Property 9: Placeholder credential detection** — `validateCredentials()` returns false and `warnIfPlaceholder()` logs a warning if and only if the credential matches the placeholder pattern
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.6**

- [ ] 2. Implement auth service (tenant token management)
  - [ ] 2.1 Create `src/services/auth.service.ts` with `getTenantToken()`, `invalidateTokenCache()`, `resetTokenCache()`, and internal `fetchTenantToken()`
    - Import credentials from `credential-store.ts`
    - Use `LARK_CONFIG.baseUrl` for dev/prod URL switching (respects `/lark-api` proxy in dev, direct URL in prod)
    - Implement in-memory `TokenCache` with `token` and `expiresAt` fields
    - POST to `/auth/v3/tenant_access_token/internal` with `app_id` and `app_secret`
    - Calculate `expiresAt = now + (expire - 60) * 1000` for 60-second safety margin
    - Throw error with code and message for non-zero response codes
    - Apply 10-second abort timeout via `AbortController`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_

  - [ ] 2.2 Implement `withRetry()` wrapper and `authenticatedFetch()` in `auth.service.ts`
    - Retry up to 3 total attempts for transient errors (network failures, HTTP 5xx, timeouts)
    - Invalidate token cache before each retry attempt
    - Short-circuit immediately for non-retryable errors (token fetch failures, record-not-found)
    - Execute retries immediately without delay
    - Invalidate cache on HTTP 401/403 responses
    - Inject `Authorization: Bearer {token}` and `Content-Type: application/json` headers
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5, 2.5, 2.6_

  - [ ] 2.3 Refactor `src/services/lark-api.service.ts` to consume `auth.service.ts`
    - Remove inline `tokenCache`, `fetchTenantToken()`, `withRetry()`, and `createTimeoutSignal()` from `lark-api.service.ts`
    - Replace with imports from `auth.service.ts` (`getTenantToken`, `authenticatedFetch` or equivalent)
    - Ensure all existing public API functions (`listRecords`, `getRecord`, `createRecord`, `updateRecord`) continue to work unchanged
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 7.1, 7.2_

  - [ ]* 2.4 Write property tests for auth service (Properties 1, 2, 3, 10, 11, 12)
    - **Property 1: Token cache validity decision** — getTenantToken fetches a new token iff cache is null or expired
    - **Property 2: Expiration timestamp calculation** — expiresAt = now + (expire - 60) * 1000
    - **Property 3: Error response propagation** — non-zero codes throw error with code and message
    - **Property 10: Retry with cache invalidation** — exactly 3 attempts, cache invalidated before retries 2 and 3
    - **Property 11: Non-retryable error short-circuit** — token fetch / record-not-found errors throw immediately
    - **Property 12: Bearer token header format** — Authorization header is exactly "Bearer " + token
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 8.1, 8.4, 8.5, 8.6, 9.1**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement OAuth service (user login flow)
  - [ ] 4.1 Create `src/services/oauth.service.ts` with `buildAuthorizationUrl()`, `exchangeCodeForToken()`, `storeSession()`, `getStoredSession()`, and `clearSession()`
    - Build Lark OAuth authorization URL with `app_id`, `redirect_uri`, and `scope` query parameters
    - Exchange authorization code for user access token via POST to `/authen/v1/oidc/access_token`
    - Extract `open_id` and `access_token` from the token response
    - Store/retrieve/clear session in `sessionStorage` under key `sp-tracker-user-token`
    - Session contains `userAccessToken`, `openId`, `expiresAt`
    - Use 10-second timeout for code exchange request
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 3.9_

  - [ ]* 4.2 Write property tests for OAuth service (Properties 4 and 5)
    - **Property 4: OAuth authorization URL construction** — URL contains app_id, redirect_uri (encoded), and scope as query params
    - **Property 5: Session storage round-trip** — storeSession followed by getStoredSession returns identical values
    - **Validates: Requirements 3.2, 3.6, 3.9**

- [ ] 5. Implement identity service (user resolution and onboarding)
  - [ ] 5.1 Create `src/services/identity.service.ts` with `resolveIdentity()` and `createMemberRecord()`
    - `resolveIdentity(openId)` queries Members table using `getCurrentMember()` from `member.service.ts`
    - Return `{ status: 'resolved', member }` when member found
    - Return `{ status: 'new_user', openId, displayName }` when no member record exists (catch the "Member not found" error)
    - Return `{ status: 'error', error }` when open_id is empty or query fails after retries
    - `createMemberRecord(openId, displayName, role)` calls `createRecord()` with proper field structure
    - Set `open_id`, `display_name`, `primary_role`, `roles: [role]`, `scrum_master_id: null`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4_

  - [ ]* 5.2 Write property tests for identity service (Properties 6 and 7)
    - **Property 6: Member record mapping** — valid Lark records produce Member with correct openId, displayName, primaryRole, and non-empty roles
    - **Property 7: Onboarding record creation structure** — createMemberRecord payload contains correct fields for any valid openId/displayName/role combo
    - **Validates: Requirements 4.1, 4.2, 5.4**

- [ ] 6. Implement auth store (Zustand state management)
  - [ ] 6.1 Create `src/store/auth.store.ts` with auth state and actions
    - State: `isAuthenticated`, `currentMember`, `openId`, `isLoading`, `error`, `isOnboarding`
    - `login()` action: builds OAuth URL and redirects via `window.location.href`
    - `handleCallback(code)` action: exchanges code, extracts open_id, resolves identity, updates state
    - `restoreSession()` action: checks sessionStorage for existing session, resolves identity if valid
    - `logout()` action: clears sessionStorage, resets state
    - `completeOnboarding(role)` action: creates Member record, stores member in state, navigates to main app
    - `clearError()` action: clears error state
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8, 3.9, 4.3, 4.4, 5.1, 5.5, 5.6_

  - [ ]* 6.2 Write unit tests for auth store
    - Test login initiates redirect
    - Test handleCallback with successful flow sets isAuthenticated and currentMember
    - Test handleCallback with failed code exchange sets error and redirects to login
    - Test restoreSession with valid session resolves identity
    - Test restoreSession with no session keeps unauthenticated state
    - Test logout clears all auth state and sessionStorage
    - Test completeOnboarding success navigates within 2 seconds
    - Test completeOnboarding failure re-enables confirm without losing role selection
    - _Requirements: 3.1, 3.5, 3.6, 3.7, 3.8, 3.9, 5.5, 5.6_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement UI components (LoginPage, OnboardingPage, AuthGuard)
  - [ ] 8.1 Create `src/pages/LoginPage.tsx` with "Sign in with Lark" button
    - Display centered login button when user is not authenticated
    - On click, call `auth.store.login()` to initiate OAuth redirect
    - Display error message if redirected back with sign-in failure
    - _Requirements: 3.1, 3.8_

  - [ ] 8.2 Create `src/pages/OnboardingPage.tsx` with role selector
    - Display exactly two role options: "Agent" and "Developer"
    - Keep confirm button disabled until a role is selected
    - On confirm, disable button and call `auth.store.completeOnboarding(role)`
    - Show loading state during record creation
    - On failure, show error message, re-enable confirm button, preserve role selection
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 8.3 Create `src/components/auth/AuthGuard.tsx` route wrapper
    - Check `auth.store.isAuthenticated` and `isOnboarding` state
    - Redirect to `/login` if not authenticated
    - Redirect to `/onboarding` if `isOnboarding` is true
    - Render children if authenticated and not onboarding
    - _Requirements: 3.1, 4.3, 5.1_

  - [ ]* 8.4 Write unit tests for LoginPage, OnboardingPage, and AuthGuard
    - Test LoginPage renders "Sign in with Lark" button
    - Test LoginPage displays error message from store
    - Test OnboardingPage renders Agent and Developer options
    - Test OnboardingPage disables confirm until selection
    - Test OnboardingPage shows loading during submission
    - Test AuthGuard redirects unauthenticated users to /login
    - Test AuthGuard redirects onboarding users to /onboarding
    - _Requirements: 3.1, 3.8, 5.1, 5.2, 5.3, 5.6_

- [ ] 9. Integration and routing wiring
  - [ ] 9.1 Create `src/pages/AuthCallbackPage.tsx` to handle OAuth redirect
    - Extract authorization code from URL query params
    - Call `auth.store.handleCallback(code)` on mount
    - Show loading state while processing
    - Redirect to login on error
    - _Requirements: 3.3, 3.4, 3.8_

  - [ ] 9.2 Update `src/App.tsx` to integrate auth flow with routing
    - Add `/login`, `/onboarding`, and `/auth/callback` routes
    - Wrap existing protected routes with `AuthGuard`
    - Replace hardcoded `initializeApp('ou_diana101')` with `auth.store.restoreSession()` on mount
    - Display user's `display_name` from `auth.store.currentMember` in navigation
    - _Requirements: 3.1, 3.5, 3.9, 4.3, 5.1_

  - [ ] 9.3 Update `src/store/app.store.ts` to consume auth store member instead of hardcoded open_id
    - Remove the `initializeApp(openId)` call with hardcoded `'ou_diana101'`
    - Subscribe to `auth.store.currentMember` or expose an `initializeWithMember(member)` action
    - Ensure quests, leaderboard, and badges load after member is resolved from auth flow
    - _Requirements: 3.5, 4.2_

  - [ ]* 9.4 Write integration tests for full auth flow
    - Test complete OAuth flow with mocked Lark endpoints (login → callback → identity resolution → app)
    - Test session restoration on page refresh with pre-populated sessionStorage
    - Test new-user flow: login → callback → onboarding → role selection → app
    - _Requirements: 3.1, 3.3, 3.6, 3.9, 5.1, 5.5_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (fast-check, 100+ iterations)
- Unit tests validate specific examples and edge cases
- The Vite dev proxy (`/lark-api`) is already configured in `vite.config.ts` — no additional proxy setup needed
- The `VITE_LARK_REDIRECT_URI` should be set to `http://localhost:5173/auth/callback` for local development
- Existing `lark-api.service.ts` token logic is extracted into `auth.service.ts` during task 2.3; all existing service callers remain unchanged

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1"] },
    { "id": 6, "tasks": ["6.2", "8.1", "8.2", "8.3"] },
    { "id": 7, "tasks": ["8.4", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3"] },
    { "id": 9, "tasks": ["9.4"] }
  ]
}
```
