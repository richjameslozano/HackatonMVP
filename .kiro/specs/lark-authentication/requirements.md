# Requirements Document

## Introduction

This specification defines the authentication and identity layer for the SP Madrid Gamified Tracker. The system uses Lark OAuth to authenticate users via a "Sign in with Lark" button, resolves their identity from the Members table, and handles onboarding for new users with role selection. On the backend side, the app uses a tenant access token (app-level credentials) to authorize Lark Base API calls. This spec covers the user-facing login flow, tenant token lifecycle management, new-user onboarding, credential security, and the dev-mode CORS proxy configuration.

## Glossary

- **Auth_Service**: The module responsible for obtaining, caching, and refreshing the Lark tenant access token used for all API calls.
- **Login_Page**: The UI screen shown to unauthenticated users, containing the "Sign in with Lark" button.
- **Identity_Resolver**: The module responsible for determining the current user's identity (open_id) from the OAuth flow and resolving their Member record from Lark Base.
- **Onboarding_Flow**: The UI flow shown to new users (those without a Member record) that prompts them to select their role.
- **Tenant_Access_Token**: A short-lived bearer token issued by Lark Open Platform in exchange for app_id and app_secret. Used to authorize all Bitable API requests.
- **User_Access_Token**: A token obtained via Lark OAuth that represents an authenticated user session and provides the user's open_id.
- **Open_ID**: A unique, app-scoped identifier assigned by Lark to each user. Used to look up the corresponding Member record.
- **Token_Cache**: An in-memory store that holds the current tenant access token and its expiration timestamp to avoid redundant token requests.
- **Credential_Store**: The mechanism (environment variables) used to store app_id and app_secret securely outside of source code.
- **CORS_Proxy**: A Vite dev-server proxy that forwards Lark API requests to avoid browser CORS restrictions during local development.
- **Member**: A domain object representing a user in the system, resolved from the Members table in Lark Base.
- **Role_Selector**: A UI component that allows a new user to choose their primary role (agent or developer) during onboarding.

## Requirements

### Requirement 1: Tenant Access Token Acquisition

**User Story:** As the application, I want to obtain a tenant access token from Lark Open Platform, so that I can authorize API calls to Lark Base.

#### Acceptance Criteria

1. WHEN the application needs to make an API call and no valid token exists in the Token_Cache (token is null or its expiration timestamp is less than or equal to the current time), THE Auth_Service SHALL request a new Tenant_Access_Token from the Lark Open Platform by sending a POST request to the tenant_access_token/internal endpoint with the configured app_id and app_secret.
2. WHEN the Lark Open Platform returns a successful token response (code equals 0), THE Auth_Service SHALL extract the tenant_access_token and expire fields from the response and store the token in the Token_Cache with an expiration set to (expire minus 60) seconds from the current time, so the token is refreshed before it actually expires at the platform.
3. WHEN the Lark Open Platform returns an error response (non-zero code), THE Auth_Service SHALL throw an error containing the error message and error code from the response.
4. IF the token request fails due to a network error, THEN THE Auth_Service SHALL propagate the error to the caller without retrying at the token-fetch level.
5. WHEN the Auth_Service sends a token request to the Lark Open Platform, THE Auth_Service SHALL abort the request if no response is received within 10,000 milliseconds and treat the abort as a network error.

### Requirement 2: Token Caching and Expiry Management

**User Story:** As the application, I want to cache the tenant access token and refresh it before expiry, so that I avoid unnecessary token requests and prevent authentication failures.

#### Acceptance Criteria

1. WHEN a new Tenant_Access_Token is obtained, THE Auth_Service SHALL store the token string and its calculated expiration timestamp in the Token_Cache.
2. WHEN a new Tenant_Access_Token is obtained, THE Auth_Service SHALL calculate the expiration timestamp as the current time plus the `expire` value (provided in seconds by the Lark API) converted to milliseconds, minus a 60-second safety margin (60,000 ms).
3. WHEN a cached token exists and the current time is before the expiration timestamp, THE Auth_Service SHALL return the cached token without making a new request.
4. WHEN a cached token exists and the current time is at or past the expiration timestamp, THE Auth_Service SHALL request a new token and update the Token_Cache.
5. WHEN an API call fails with an HTTP 401 or 403 response status, THE Auth_Service SHALL invalidate the Token_Cache by clearing the stored token and expiration, and obtain a fresh token on the next retry attempt.
6. WHEN the Token_Cache is invalidated, THE Auth_Service SHALL set the cache to empty (null) so that the next token request triggers a full acquisition from the Lark Open Platform.

### Requirement 3: User Login Flow

**User Story:** As a user, I want to sign in with my Lark account via a "Sign in with Lark" button, so that the application knows who I am and shows my personalized data.

#### Acceptance Criteria

1. WHEN the user is not authenticated, THE Login_Page SHALL display a "Sign in with Lark" button.
2. WHEN the user clicks the "Sign in with Lark" button, THE Login_Page SHALL redirect the user to the Lark OAuth authorization endpoint with the configured app_id, redirect_uri, and the scope required to obtain the user's open_id.
3. WHEN Lark redirects back to the application with an authorization code, THE Identity_Resolver SHALL exchange the authorization code for a User_Access_Token within 10 seconds.
4. WHEN a valid User_Access_Token is obtained, THE Identity_Resolver SHALL extract the user's open_id from the token response.
5. WHILE the user is authenticated, THE application SHALL display the user's display_name from the Member record in the navigation bar instead of a hardcoded default name.
6. WHEN a User_Access_Token is successfully obtained, THE application SHALL persist the User_Access_Token and the user's open_id in browser session storage so that page refreshes do not require re-login.
7. WHEN the user clicks a logout action, THE application SHALL remove all authentication data from session storage and redirect to the Login_Page.
8. IF the authorization code exchange fails or Lark returns an error response, THEN THE Identity_Resolver SHALL redirect the user back to the Login_Page and display an error message indicating that sign-in failed.
9. IF the session storage contains a previously stored User_Access_Token on page load, THEN THE Identity_Resolver SHALL use the stored token to resolve the user's identity without initiating a new OAuth flow.

### Requirement 4: User Identity Resolution

**User Story:** As an authenticated user, I want the application to resolve my profile from the Members table, so that I see my personalized quests, badges, and leaderboard position.

#### Acceptance Criteria

1. WHEN the user's open_id is obtained from the OAuth flow and the open_id is a non-empty string, THE Identity_Resolver SHALL query the Members table in Lark Base using the open_id as an exact-match filter.
2. WHEN the Members table contains a record matching the open_id, THE Identity_Resolver SHALL return a Member object containing memberId, displayName, openId, roles, primaryRole, and scrumMasterId.
3. IF no record matches the open_id, THEN THE Identity_Resolver SHALL redirect the user to the Onboarding_Flow without discarding the authenticated session.
4. IF the open_id obtained from the OAuth flow is empty or not a string, THEN THE Identity_Resolver SHALL redirect the user to the login screen and display an error message indicating the identity could not be determined.
5. IF the Members table query fails after exhausting the configured retry attempts (3 attempts, 10-second timeout per attempt), THEN THE Identity_Resolver SHALL display an error message indicating the profile could not be loaded and provide a retry action.

### Requirement 5: New User Onboarding and Role Selection

**User Story:** As a new user, I want to select my role (agent or developer) when I first log in, so that the application tailors my experience to my position.

#### Acceptance Criteria

1. WHEN a user authenticates for the first time and no Member record exists for their open_id, THE Onboarding_Flow SHALL display the Role_Selector screen.
2. THE Role_Selector SHALL present exactly two options: "Agent" and "Developer".
3. THE Role_Selector SHALL keep the confirm action disabled until the user has selected one of the two role options.
4. WHEN the user selects a role and confirms, THE Onboarding_Flow SHALL disable the confirm action to prevent duplicate submissions, and create a new Member record in the Members table with the user's open_id, display_name (from Lark profile), selected role as primaryRole, the selected role in the roles array, and scrumMasterId set to null.
5. WHEN the Member record is created successfully, THE Onboarding_Flow SHALL store the resolved Member object in application state and navigate the user to the main application view within 2 seconds of receiving the success response.
6. IF the Member record creation fails, THEN THE Onboarding_Flow SHALL display an error message indicating the record could not be created, re-enable the confirm action, and allow the user to retry without re-selecting their role.

### Requirement 6: Credential Security

**User Story:** As a developer, I want application credentials stored securely outside source code, so that secrets are not exposed in version control.

#### Acceptance Criteria

1. THE Credential_Store SHALL read app_id and app_secret from environment variables (VITE_LARK_APP_ID, VITE_LARK_APP_SECRET).
2. THE Credential_Store SHALL read the base app token from the environment variable VITE_LARK_APP_TOKEN.
3. IF any of the environment variables VITE_LARK_APP_ID, VITE_LARK_APP_SECRET, or VITE_LARK_APP_TOKEN is not set or is set to an empty string, THEN THE Credential_Store SHALL fall back to the corresponding value defined in the checked-in config.example.ts file for local development.
4. THE application SHALL include a .env.example file listing all required environment variables (VITE_LARK_APP_ID, VITE_LARK_APP_SECRET, VITE_LARK_APP_TOKEN) with placeholder values that do not contain actual secrets and each variable annotated with a single-line comment describing its purpose.
5. THE application SHALL list the .env file in .gitignore to prevent accidental commit of credentials.
6. IF the Credential_Store resolves a credential value that is empty or still matches the placeholder pattern from .env.example, THEN THE Credential_Store SHALL log a warning message to the browser console indicating which variable is missing before any API call is attempted.

### Requirement 7: Development CORS Proxy

**User Story:** As a developer, I want API requests proxied during local development, so that browser CORS restrictions do not block Lark API calls.

#### Acceptance Criteria

1. WHILE the application is running in development mode (import.meta.env.DEV is true), THE Auth_Service SHALL route all API requests through the Vite dev-server proxy path (/lark-api) instead of the direct Lark API URL.
2. WHILE the application is running in production mode (import.meta.env.DEV is false), THE Auth_Service SHALL route API requests directly to the Lark Open Platform base URL (https://open.larksuite.com/open-apis).
3. THE CORS_Proxy SHALL rewrite the URL path by stripping the /lark-api prefix and forwarding requests to https://open.larksuite.com/open-apis, setting the Host header to match the target origin (changeOrigin).
4. THE CORS_Proxy SHALL preserve the original request method, request headers (except Host), URL path suffix after /lark-api, query parameters, and body when forwarding requests.
5. IF the CORS_Proxy cannot reach the target host (https://open.larksuite.com), THEN THE CORS_Proxy SHALL respond with an HTTP 502 status code indicating a proxy connection failure.

### Requirement 8: Retry and Timeout for Authenticated Requests

**User Story:** As a user, I want the application to handle transient network failures gracefully, so that temporary issues do not break my experience.

#### Acceptance Criteria

1. WHEN an authenticated API call fails with a transient error (network failure, HTTP 5xx response, or request timeout), THE Auth_Service SHALL retry the request up to a maximum of 3 total attempts (1 initial attempt plus 2 retries).
2. THE Auth_Service SHALL apply a 10-second timeout to each individual request attempt and abort the request if no response is received within that duration.
3. WHEN a request times out, THE Auth_Service SHALL treat the timeout as a retryable transient failure and proceed to the next retry attempt if attempts remain.
4. WHEN an API call fails and a retry is attempted, THE Auth_Service SHALL invalidate the Token_Cache before retrying to ensure a fresh token is used.
5. IF all 3 retry attempts are exhausted without a successful response, THEN THE Auth_Service SHALL throw the last encountered error to the caller.
6. IF an error is a token fetch failure (error during Tenant_Access_Token acquisition) or a record-not-found error (Lark API indicates the requested record does not exist), THEN THE Auth_Service SHALL treat the error as non-retryable and throw it immediately without consuming further retry attempts.
7. WHEN the Auth_Service retries a failed request, THE Auth_Service SHALL execute the retry immediately without introducing an additional delay between attempts.

### Requirement 9: Token Injection into API Requests

**User Story:** As the application, I want the tenant access token automatically included in all Lark API requests, so that services do not need to manage authorization headers individually.

#### Acceptance Criteria

1. WHEN making any request to a Lark API endpoint (Bitable or Bot IM), THE Auth_Service SHALL include the Tenant_Access_Token in the Authorization header in the format "Bearer {token}".
2. THE Auth_Service SHALL set the Content-Type header to application/json for all Lark API requests.
3. WHEN the Auth_Service prepares a request and the Token_Cache contains a non-expired token, THE Auth_Service SHALL use the cached token without requesting a new one.
4. WHEN the Auth_Service prepares a request and the Token_Cache is empty or contains an expired token, THE Auth_Service SHALL obtain a fresh Tenant_Access_Token before attaching it to the request.
5. IF the Auth_Service cannot obtain a valid token during injection (due to a failed token refresh), THEN THE Auth_Service SHALL propagate the token error to the caller without sending the API request.
