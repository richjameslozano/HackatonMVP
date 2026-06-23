# Requirements Document

## Introduction

This feature defines the deployment of the HackatonMVP application to Render. The application is a monorepo composed of two independently-running parts, and both are hosted on Render (https://render.com) and declared together in a single `render.yaml` Blueprint:

1. **Frontend**: A Vite + React 19 + TypeScript single-page application (SPA) at the repository root. It is built with `npm ci && tsc -b && vite build` into the `dist` directory and uses TailwindCSS, react-router-dom, zustand, and axios. Per the project architecture, the SPA calls the Lark Base REST API directly for all CRUD operations and connects to the backend only for real-time updates over WebSocket. The frontend is deployed as a **Render Static Site**, which serves the prebuilt static assets in `dist`, supports SPA rewrite rules, build-time environment variables, and custom domains.
2. **Backend**: A Python FastAPI service in `backend/` that acts as a WebSocket relay. It receives Lark/Feishu webhooks, subscribes to Lark Base document events on startup, runs a long-lived heartbeat loop, runs a background flush scheduler, and maintains in-memory WebSocket connection state in a single process. The backend is deployed as a **Render Web Service** built from the existing `backend/Dockerfile`, because it requires a continuously-running process, inbound WebSocket connections, persistent in-memory state, HTTPS, and WSS.

A central constraint shapes this spec: the frontend is a static artifact best served by a static host, while the backend requires a persistent process. Render supports both models, so the frontend runs as a Render Static Site and the backend runs as a Render Web Service, with both services declared in one `render.yaml` Blueprint. This document captures the requirements for deploying the frontend as a Render Static Site production deployment, configuring its build and routing, hosting the backend as a Render Web Service, and wiring the two together with correct environment configuration.

The scope of this spec is **deployment configuration and process**, not changes to application business logic.

## Glossary

- **Render**: The hosting platform used to build and serve both the frontend and the backend.
- **Frontend_Static_Site**: The Render Static Site that builds and serves the Frontend_SPA static assets from the `dist` directory.
- **Frontend_SPA**: The Vite + React single-page application built into the `dist` directory and served by the Frontend_Static_Site.
- **Backend_Service**: The FastAPI WebSocket-relay application located in `backend/`, hosted as a Render Web Service.
- **Backend_Host**: Render — the platform hosting the Backend_Service, deployed as a Render Web Service from the existing `backend/Dockerfile`.
- **Render_Blueprint**: The `render.yaml` infrastructure-as-code file committed to the repository that declares BOTH the Frontend_Static_Site and the Backend_Service configurations.
- **Build_Pipeline**: The Render Static Site build process that compiles and bundles the Frontend_SPA.
- **Environment_Config**: The set of environment variables and secrets configured for the Production environment in the Render Static Site settings for the frontend and in the Render Web Service environment variable and secret settings for the backend.
- **Production_Environment**: The Render deployment serving the production domain.
- **SPA_Rewrite**: The Render Static Site rewrite rule that serves `index.html` for client-side routes so react-router-dom handles navigation.
- **Build_Output_Directory**: The `dist` directory produced by the Vite build and used as the Render Static Site publish directory.
- **Lark_Webhook**: An HTTP callback sent by Lark/Feishu to the Backend_Service.
- **VITE_ Variable**: A frontend environment variable prefixed with `VITE_` that Vite inlines into the client bundle at build time.

## Requirements

### Requirement 1: Frontend Build Configuration on Render Static Site

**User Story:** As a developer, I want the frontend to build correctly on the Render Static Site, so that the production SPA is generated from source on each deployment.

#### Acceptance Criteria

1. THE Build_Pipeline SHALL execute the command `npm ci && tsc -b && vite build` to produce the production bundle.
2. THE Build_Pipeline SHALL publish the contents of the `dist` directory as the Build_Output_Directory.
3. THE Build_Pipeline SHALL install dependencies from `package-lock.json` using `npm ci` before building.
4. WHEN the `npm ci && tsc -b && vite build` command exits with a non-zero status, THE Build_Pipeline SHALL fail the deployment and SHALL retain the previous successful deployment as the active deployment.
5. WHERE the repository root contains both the frontend and the `backend/` directory, THE Render_Blueprint SHALL scope the Frontend_Static_Site build to the frontend so that the `backend/` directory is excluded from the Build_Pipeline.

### Requirement 2: SPA Client-Side Routing

**User Story:** As a user, I want deep links and page refreshes to load the correct view, so that client-side routing works on the deployed site.

#### Acceptance Criteria

1. WHEN a request targets a path that does not match a static asset in the Build_Output_Directory, THE Frontend_Static_Site SHALL apply the SPA_Rewrite to serve `index.html` with HTTP status 200.
2. WHEN a request targets an existing static asset in the Build_Output_Directory, THE Frontend_Static_Site SHALL serve that asset directly without applying the SPA_Rewrite.
3. WHEN a user refreshes the browser on a client-side route, THE Frontend_SPA SHALL load and render the view corresponding to the requested route.

### Requirement 3: Frontend Environment Variable Configuration

**User Story:** As a developer, I want frontend environment variables configured in the Render Static Site settings, so that the SPA targets the correct backend and Lark endpoints without committing secrets to the repository.

#### Acceptance Criteria

1. THE Environment_Config SHALL define `VITE_BACKEND_URL`, `VITE_WS_URL`, `VITE_LARK_APP_ID`, `VITE_LARK_APP_TOKEN`, `VITE_LARK_REDIRECT_URI`, and `VITE_API_SHARED_SECRET` for the Frontend_SPA in the Render Static Site environment settings.
2. WHEN the Build_Pipeline runs, THE Build_Pipeline SHALL read each VITE_ Variable from the Environment_Config for the Production_Environment and inline the value into the produced bundle.
3. THE Environment_Config SHALL store all frontend secret values in the Render Static Site environment settings rather than in repository-tracked files.
4. WHERE a deployment targets the Production_Environment, THE Environment_Config SHALL supply production values for every VITE_ Variable listed in Acceptance Criterion 1.
5. IF a required VITE_ Variable is absent from the Environment_Config at build time, THEN THE Build_Pipeline SHALL fail the deployment and SHALL report the name of the missing variable.

### Requirement 4: Backend Hosting on Render

**User Story:** As a developer, I want the FastAPI WebSocket-relay backend hosted as a Render Web Service, so that WebSockets, the heartbeat loop, and the flush scheduler keep running on a platform that supports persistent processes.

#### Acceptance Criteria

1. THE Backend_Service SHALL run on Render as a Render Web Service that supports a continuously-running process, inbound WebSocket connections, and persistent in-memory state.
2. THE Backend_Host SHALL build the Backend_Service from the existing `backend/Dockerfile`.
3. WHILE the Backend_Service is running, THE Backend_Service SHALL maintain the heartbeat loop, the flush scheduler, and the active WebSocket connection registry within a single process.
4. THE Backend_Host SHALL expose the Backend_Service over HTTPS for HTTP endpoints and over WSS for the WebSocket endpoint at a stable `*.onrender.com` or custom Render hostname.
5. THE Backend_Service SHALL remain reachable at the stable Render hostname that is referenced by the Frontend_SPA `VITE_BACKEND_URL` and `VITE_WS_URL` values.

### Requirement 5: Backend Environment and Secrets Configuration

**User Story:** As a developer, I want backend secrets configured in the Render Web Service environment variable and secret settings, so that the backend authenticates with Lark and validates webhooks without committing secrets to the repository.

#### Acceptance Criteria

1. THE Environment_Config SHALL define `LARK_VERIFICATION_TOKEN`, `LARK_APP_ID`, `LARK_APP_SECRET`, `LARK_BASE_APP_TOKEN`, `LARK_BASE_URL`, `CONFIGURED_TABLES`, `API_SHARED_SECRET`, `CORS_ORIGINS`, `MAX_CONNECTIONS`, `CACHE_TTL_SECONDS`, and `BATCH_FLUSH_INTERVAL_SECONDS` for the Backend_Service in the Render Web Service environment variable settings.
2. THE Environment_Config SHALL store backend secret values in the Render Web Service environment variable and secret settings rather than in repository-tracked files.
3. THE Environment_Config SHALL set `API_SHARED_SECRET` in the Render Web Service to the same value as the `VITE_API_SHARED_SECRET` configured for the Frontend_SPA Production_Environment.

### Requirement 6: Cross-Origin Access Between Frontend and Backend

**User Story:** As a user, I want the deployed SPA to communicate with the backend without being blocked, so that real-time updates and authenticated requests succeed.

#### Acceptance Criteria

1. THE Environment_Config SHALL set the Backend_Service `CORS_ORIGINS` to include the deployed Frontend_Static_Site production origin.
2. WHEN the Frontend_SPA opens a WebSocket connection to `VITE_WS_URL`, THE Backend_Service SHALL accept the connection from the configured Frontend_Static_Site origin.
3. IF a request to the Backend_Service originates from an origin absent from `CORS_ORIGINS`, THEN THE Backend_Service SHALL omit the cross-origin access headers for that origin.

### Requirement 7: Lark Webhook and OAuth Endpoint Configuration

**User Story:** As a developer, I want Lark to deliver webhooks and OAuth redirects to the deployed endpoints, so that real-time events and authentication work in the deployed environment.

#### Acceptance Criteria

1. THE Backend_Service SHALL expose the Lark_Webhook endpoint at the Backend_Host Render Web Service HTTPS hostname.
2. WHEN the Backend_Service starts, THE Backend_Service SHALL subscribe to Lark Base document events using the configured `LARK_BASE_APP_TOKEN`.
3. THE Environment_Config SHALL set `VITE_LARK_REDIRECT_URI` to a URI served by the deployed Frontend_Static_Site Production_Environment origin.
4. WHEN a Lark_Webhook is received, THE Backend_Service SHALL validate the request using the configured `LARK_VERIFICATION_TOKEN` before processing.

### Requirement 8: Production Deployment

**User Story:** As a developer, I want commits to the production branch deployed to production on Render, so that the live site reflects the latest released code.

#### Acceptance Criteria

1. WHEN a commit is pushed to the production branch, THE Render SHALL build and deploy the Frontend_Static_Site and the Backend_Service to the Production_Environment.
2. THE Production_Environment SHALL use the Environment_Config values designated for production for both the Frontend_Static_Site and the Backend_Service.
3. WHEN a Production_Environment build fails for either service, THE Render SHALL keep the previous successful Production_Environment deployment of that service active.

### Requirement 9: Repository Deployment Configuration Artifacts

**User Story:** As a developer, I want the deployment configuration committed to the repository, so that deployments are reproducible and reviewable.

#### Acceptance Criteria

1. THE Render_Blueprint SHALL be committed to the repository as a `render.yaml` file at the repository root that declares BOTH the Frontend_Static_Site and the Backend_Service.
2. THE Render_Blueprint SHALL declare for the Frontend_Static_Site the build command `npm ci && tsc -b && vite build`, the Build_Output_Directory `dist`, and the SPA_Rewrite rule.
3. THE Render_Blueprint SHALL declare the Backend_Service as a Render Web Service built from `backend/Dockerfile`, so that the backend deployment is reproducible.
4. THE repository SHALL provide an example environment file that lists every required VITE_ Variable name without secret values.
5. THE repository SHALL exclude `.env` files containing secrets from version control.
