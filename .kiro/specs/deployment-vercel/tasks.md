# Implementation Plan: deployment-vercel (Render-only)

## Overview

This plan turns the Render-only deployment design into incremental, code/config-first tasks. The
work covers four repo artifacts and their tests:

1. The single `render.yaml` Blueprint at the repo root declaring BOTH the Render Static Site
   (frontend) and the Render Web Service (backend).
2. A one-line `backend/Dockerfile` CMD change to shell-form so the container binds Render's
   injected `${PORT:-8000}`.
3. The root `.env.example` rewritten to list exactly the six required `VITE_*` variables (dropping
   `VITE_LARK_APP_SECRET`).
4. A prebuild env-validation guard (`validateEnv`) written in TypeScript, wired into the build to
   fail fast and name every missing `VITE_*` variable.

Tests include config-validation tests asserting `render.yaml` structure for both services and the
absence of `vercel.json` / `.vercelignore`, plus the two correctness properties from the design:
Property 1 (env-validation guard) as a fast-check/TypeScript property test, and Property 2 (CORS
origin membership) as a hypothesis/Python property test. Example/smoke checks are added where they
can run as automated code.

External steps (Render dashboard env vars and secrets, Lark Developer Console webhook/OAuth setup)
are NOT executable coding tasks and are captured in the Notes section as documentation.

Languages: TypeScript (Node/Vite build tooling, fast-check, vitest) for the frontend guard and its
tests; Python (pytest, hypothesis) for the backend CORS property; YAML parsing for config-validation
tests runs under vitest/TypeScript.

## Tasks

- [x] 1. Add the `validateEnv` prebuild guard and wire it into the build
  - [x] 1.1 Implement the env-validation guard module
    - Create `scripts/validateEnv.ts` exporting a pure function `validateEnv(env: Record<string, string | undefined>): { ok: boolean; missing: string[] }`
    - Define the canonical list of six required variables: `VITE_BACKEND_URL`, `VITE_WS_URL`, `VITE_LARK_APP_ID`, `VITE_LARK_APP_TOKEN`, `VITE_LARK_REDIRECT_URI`, `VITE_API_SHARED_SECRET`
    - Treat a variable as missing when absent, empty, or whitespace-only; collect ALL missing names (do not stop at the first)
    - Add a CLI entrypoint (run via `tsx`) that calls `validateEnv(process.env)`, prints each missing variable name to stderr, and exits with a non-zero status when any are missing; exits 0 otherwise
    - _Requirements: 3.5_

  - [x]* 1.2 Write property test for the env-validation guard
    - **Feature: deployment-vercel, Property 1: Missing required VITE_ variable fails the build with the variable name**
    - **Validates: Requirements 3.5**
    - Use fast-check (already a devDependency) under vitest; minimum 100 iterations
    - Generate random subsets of the six required variables to remove from a fully-populated env; assert `ok === false` and that `missing` contains exactly the removed names (and only those)
    - Include the empty-subset case implicitly via the generator and assert `ok === true` when none are removed

  - [x]* 1.3 Write unit tests for guard edge cases
    - Single missing variable reports exactly that one name
    - Empty-string and whitespace-only values are treated as missing
    - All six present → `ok === true`, `missing === []`
    - _Requirements: 3.5_

  - [x] 1.4 Wire the guard into the build pipeline
    - Add a `validate-env` npm script invoking the guard via `tsx scripts/validateEnv.ts`
    - Add a `prebuild` npm script that runs `validate-env` so it executes before `tsc -b && vite build`, causing a non-zero guard exit to fail the deployment build before bundling
    - _Requirements: 3.5, 1.4_

- [x] 2. Update `.env.example` to the six required VITE_ variables
  - [x] 2.1 Rewrite the root `.env.example`
    - List exactly: `VITE_BACKEND_URL`, `VITE_WS_URL`, `VITE_LARK_APP_ID`, `VITE_LARK_APP_TOKEN`, `VITE_LARK_REDIRECT_URI`, `VITE_API_SHARED_SECRET` with placeholder (non-secret) values
    - Remove `VITE_LARK_APP_SECRET` (the app secret belongs only on the backend as `LARK_APP_SECRET`)
    - _Requirements: 9.4, 3.1, 3.3_

- [x] 3. Update the backend Dockerfile to bind Render's injected PORT
  - [x] 3.1 Change the Dockerfile CMD to shell-form port binding
    - Replace the exec-form CMD with `CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]` so `${PORT}` expands at runtime and defaults to 8000 for local runs
    - Keep `--host 0.0.0.0` and the single-process invariant; leave `EXPOSE 8000` as documentation
    - _Requirements: 4.2, 4.4, 4.1_

- [x] 4. Create the `render.yaml` Blueprint declaring both services
  - [x] 4.1 Author the Render Static Site service block
    - At the repo root create `render.yaml` with a service `type: web`, `runtime: static`, `name: hackatonmvp-frontend`, `branch: production`, `autoDeploy: true`
    - Set `buildCommand: npm ci && tsc -b && vite build` and `staticPublishPath: dist`
    - Add the SPA rewrite route `{ type: rewrite, source: /*, destination: /index.html }`
    - Declare the six `VITE_*` env vars, all with `sync: false`
    - _Requirements: 9.1, 9.2, 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 3.1, 3.2, 8.1_

  - [x] 4.2 Append the Render Web Service (Docker) service block
    - Add a second service `type: web`, `runtime: docker`, `name: hackatonmvp-backend`, `branch: production`, `autoDeploy: true`
    - Set `dockerfilePath: ./backend/Dockerfile`, `dockerContext: ./backend`, `healthCheckPath: /health`, `numInstances: 1`
    - Declare the 11 backend env vars: secrets (`CORS_ORIGINS`, `LARK_VERIFICATION_TOKEN`, `LARK_APP_ID`, `LARK_APP_SECRET`, `LARK_BASE_APP_TOKEN`, `CONFIGURED_TABLES`, `API_SHARED_SECRET`) with `sync: false`; non-secret defaults (`LARK_BASE_URL`, `MAX_CONNECTIONS`, `CACHE_TTL_SECONDS`, `BATCH_FLUSH_INTERVAL_SECONDS`) with literal `value`
    - _Requirements: 9.1, 9.3, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 8.1_

- [x] 5. Checkpoint - validate artifacts parse and the guard runs
  - Run the env guard with a complete and an incomplete env to confirm pass/fail behavior; confirm `render.yaml` is valid YAML
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add config-validation tests for `render.yaml` and repository artifacts
  - [x] 6.1 Implement the render.yaml structure test suite
    - Create `scripts/__tests__/renderConfig.test.ts` (vitest) that loads and parses the repo-root `render.yaml`
    - Assert exactly one `render.yaml` exists at the repo root and it declares BOTH services
    - Assert the static-site service has `runtime: static`, `buildCommand: npm ci && tsc -b && vite build`, `staticPublishPath: dist`, and the rewrite route `{ type: rewrite, source: /*, destination: /index.html }`
    - Assert the static-site service declares the six `VITE_*` variables
    - Assert the web service has `runtime: docker`, `dockerfilePath: ./backend/Dockerfile`, `dockerContext: ./backend`, `healthCheckPath: /health`, `numInstances: 1`
    - Assert the web service declares the 11 backend variables with secrets using `sync: false`
    - _Requirements: 9.1, 9.2, 9.3, 1.1, 1.2, 2.1, 3.1, 4.2, 4.3, 5.1, 5.2_

  - [x] 6.2 Implement Render-only and env-hygiene assertions
    - Assert NO `vercel.json` and NO `.vercelignore` exist anywhere in the repository
    - Assert `.env.example` lists exactly the six `VITE_` variables and does NOT contain `VITE_LARK_APP_SECRET`
    - Assert `.env` is excluded from version control (present in `.gitignore`)
    - _Requirements: 9.4, 9.5, 3.3_

- [x] 7. Add the backend CORS property test
  - [x]* 7.1 Write property test for CORS origin membership
    - **Feature: deployment-vercel, Property 2: CORS reflects exactly the configured origins**
    - **Validates: Requirements 6.1, 6.3**
    - Create `backend/tests/test_cors_properties.py` using hypothesis + pytest; minimum 100 iterations (`@settings(max_examples=100)`)
    - Generate random request origins and random comma-separated `CORS_ORIGINS` strings; build the app/middleware (or call `Settings(cors_origins=...).cors_origins_list`) and assert cross-origin access headers are emitted for the origin IFF it is a member of `split(CORS_ORIGINS, ",")`
    - Cover that a listed Static Site origin is accepted and any unlisted origin is omitted

  - [x]* 7.2 Write unit tests for CORS edge cases
    - Empty `CORS_ORIGINS`, a single configured origin, and duplicate origins
    - _Requirements: 6.1, 6.3_

- [x] 8. Add post-deploy example/smoke checks (automated, opt-in)
  - [x]* 8.1 Write a smoke-check script for the deployed services
    - Extend or add a script under `scripts/` (TypeScript via `tsx`) that, given backend and frontend base URLs, asserts: `/health` returns healthy over HTTPS, a deep-link path returns `index.html` with HTTP 200, an existing static asset is served directly, and the Lark webhook URL answers a `url_verification` challenge
    - Skip gracefully (no failure) when target URLs are not provided, so the suite stays green pre-deploy
    - _Requirements: 2.1, 2.2, 2.3, 4.4, 7.1_

- [x] 9. Final checkpoint - ensure the full suite passes
  - Run the frontend (vitest) and backend (pytest) test suites including the two property tests
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (tests/smoke checks) and can be skipped for a faster MVP; core
  implementation tasks (1.1, 1.4, 2.1, 3.1, 4.1, 4.2, 6.1, 6.2) are never optional.
- Each task references specific requirements for traceability.
- Property tests run for a minimum of 100 iterations using the ecosystem's property library
  (fast-check for TypeScript, hypothesis for Python) — do not hand-roll a framework.
- **External, non-coding deployment steps (documentation only, NOT executable tasks):**
  - Render dashboard: set the six `VITE_*` build-time values on the Static Site and the 11 runtime
    values/secrets on the Web Service (`sync: false` vars are prompted at deploy). Ensure
    `WebService.API_SHARED_SECRET == StaticSite.VITE_API_SHARED_SECRET` (Req 5.3) and that
    `CORS_ORIGINS` includes the Static Site production origin (Req 6.1).
  - Lark Developer Console: set the webhook/event URL to
    `https://<backend-host>.onrender.com/webhook/lark` (Req 7.1), set the OAuth redirect to
    `VITE_LARK_REDIRECT_URI` on the Static Site origin (Req 7.3), and ensure the console verification
    token equals `LARK_VERIFICATION_TOKEN` (Req 7.4).
  - These are operator actions in third-party dashboards and cannot be performed by a coding agent.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "4.2", "7.1", "7.2", "8.1"] },
    { "id": 2, "tasks": ["6.1", "6.2"] }
  ]
}
```
