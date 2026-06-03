# PRD · WatchHub Smartwatch Leaderboard (Angular 20)

## Original problem statement

Build a fully functional Angular 20 frontend for the Smartwatch Leaderboard
platform, consuming the APIs from json-webserver with ready-made responses.

## Architecture

- **Frontend**: Angular 20 standalone components, Angular Material UI, NgRx
  Store, RxJS, Reactive Forms, lazy-loaded routes, two `HttpInterceptor`s
  (auth + global error), `authGuard` & `roleGuard`.
- **Backend (mock)**: FastAPI service (`/app/backend/server.py`) emulating a
  json-server style REST API at `/api/*`. Reads/writes `db.json`.
- **Auth strategy**: Login returns a unique session-id; client stores it in
  `sessionStorage` (`wh.session.token`) and the auth interceptor attaches it
  as `X-Session-Id` and `Authorization: Bearer <id>` to every request.

## User personas

- **Anonymous visitor** — can register / sign in / view health.
- **Regular user (ROLE_USER)** — submits telemetry, joins challenges, sees
  dashboard + leaderboard.
- **Admin (ROLE_ADMIN)** — manages tasks, challenges, devices, triggers
  ranking job.

## Core requirements

- Auth (register, login, logout, role selection)
- Tasks CRUD (admin) + browse + detail (user)
- Challenges CRUD (admin) + browse + detail + join (user)
- Devices CRUD (admin)
- Telemetry submission with field-level validation
- Leaderboard per challenge with podium + masked PII
- Dashboard with stats, recent activity, quick actions
- Health check page

## Implemented (Feb 2026)

- ✅ Project scaffolding (angular.json, tsconfig, env files)
- ✅ App shell with sticky nav bar (`shared/components/nav-bar.component.ts`)
- ✅ HttpClient + auth + error interceptors
- ✅ `authGuard`, `roleGuard`
- ✅ Login + Registration (Reactive Forms w/ validation)
- ✅ Dashboard with NgRx-backed user state
- ✅ Tasks list/detail/form (admin)
- ✅ Challenges list/detail/form (admin), join flow
- ✅ Devices list/form (admin)
- ✅ Telemetry submission + history
- ✅ Leaderboard with podium, masked PII, admin "trigger ranking"
- ✅ FastAPI mock backend with full CRUD & paginated responses
- ✅ Seeded `db.json` (5 users, 4 devices, 4 tasks, 3 challenges, 4 progress)

## Backlog / next iteration

- P1: Karma + Jasmine unit tests for services, components, pipes (≥75%)
- P1: Add task/challenge participant pagination controls on detail pages
- P2: Replace inline confirm() with Material dialog
- P2: Add reward badges component variants
- P2: Internationalisation (i18n) shell
- P2: Generate Swagger/OpenAPI definitions for the mock backend

## Next action items

1. Trainees may add Karma unit tests using the provided scaffold.
2. Connect to a real json-server / Spring backend by swapping
   `environment.apiBaseUrl`.
3. Add NgRx slices for tasks/challenges to demonstrate full CQRS-style state.
