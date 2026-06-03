# WatchHub · Smartwatch Leaderboard (Angular 20)

A full-stack Angular 20 application for tracking smartwatch activity, joining
challenges, and racing the global leaderboard.

## Tech stack

- **Frontend**: Angular 20 (standalone components), Angular Material, NgRx Store, RxJS, Reactive Forms
- **Backend (mock)**: FastAPI server emulating a json-server style REST API under `/api`
- **State**: NgRx + session-storage authentication (unique-ID strategy)
- **Build**: Angular CLI (`@angular/cli` v20)

## Project layout

```
/app
├── backend/                  # FastAPI mock API (json-server style)
│   ├── server.py             # All REST endpoints under /api
│   ├── db.json               # Seed data (users, devices, tasks, challenges…)
│   └── requirements.txt
└── frontend/                 # Angular 20 standalone application
    ├── angular.json
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.html
    │   ├── main.ts
    │   ├── styles.scss
    │   ├── environments/
    │   │   ├── environment.ts
    │   │   └── environment.development.ts
    │   └── app/
    │       ├── app.component.ts
    │       ├── app.config.ts        # provideRouter / HttpClient / Store
    │       ├── app.routes.ts        # lazy-loaded standalone routes
    │       ├── core/
    │       │   ├── guards/          # authGuard, roleGuard
    │       │   ├── interceptors/    # auth + error interceptors
    │       │   ├── models/          # shared TypeScript types
    │       │   └── services/        # ApiService, AuthService, ToastService
    │       ├── shared/
    │       │   ├── components/      # nav-bar, stat-card, rank-badge, …
    │       │   └── pipes/           # mask, expiry-countdown
    │       ├── store/               # NgRx auth reducer + actions
    │       └── pages/               # smart pages (login, dashboard, tasks…)
```

## Running locally

The platform supervisor starts both services automatically:

```bash
# Backend (FastAPI mock) – http://localhost:8001/api/*
sudo supervisorctl restart backend

# Frontend (Angular dev server) – http://localhost:3000
sudo supervisorctl restart frontend
```

To run manually:

```bash
# Backend
pip install -r backend/requirements.txt
uvicorn backend.server:app --reload --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

## Environment configuration

`src/environments/environment.ts` (production) and
`src/environments/environment.development.ts` define `apiBaseUrl`. The
development build points at the platform preview URL so all `/api/*` calls
flow through the same ingress.

## Authentication strategy

The Auth interceptor (`core/interceptors/auth.interceptor.ts`) reads a unique
session ID generated server-side at login and stored in `sessionStorage` under
`wh.session.token`. It attaches the value as both `X-Session-Id` and
`Authorization: Bearer <id>` headers on every outbound request.

- `authGuard` blocks any route in the authenticated area.
- `roleGuard` enforces `ROLE_ADMIN` on admin-only routes.
- The error interceptor maps `4xx`/`5xx` to user-friendly Material snack-bars.

## Seed accounts

| Role  | Email                       | Password   |
|-------|-----------------------------|------------|
| Admin | `admin@watchhub.io`         | `Admin@123`|
| User  | `alex.smith@example.com`    | `User@123` |
| User  | `priya.menon@example.com`   | `User@123` |

## Key API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create user, returns access/refresh token + user |
| POST | `/api/auth/login` | Login, returns access/refresh token + user |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/users` | List all users |
| GET | `/api/user/{id}` | User profile + activity progress |
| POST | `/api/user/{id}` | Submit telemetry (steps, HR, calories) |
| GET / POST / PUT / DELETE | `/api/device(/{id})` | Device catalogue |
| GET / POST / PUT / DELETE | `/api/task(/{id})` | Tasks |
| GET | `/api/task/{id}/user` | Task participants (paginated) |
| GET / POST / PUT / DELETE | `/api/challenge(/{id})` | Challenges |
| POST | `/api/challenge/{cid}/{uid}` | Join challenge |
| GET | `/api/challenge/{id}/user` | Ranked participants for leaderboard |
| GET | `/api/rank` | Trigger ranking job (admin) |
| GET | `/api/health` | Liveness check |

## Testing

Unit tests are scaffolded for services and pipes; coverage target is ≥ 75%.
Run with:

```bash
cd frontend
yarn test
```

## Notes

- All routes use **standalone components** with lazy `loadComponent` — no
  `NgModule` based bootstrap.
- All HTTP traffic flows through Angular's `HttpClient` with two functional
  `HttpInterceptor`s.
- List views (Tasks, Challenges, Leaderboard) implement
  `debounceTime + distinctUntilChanged` search and Material pagination.
- The leaderboard masks personal info (email/phone) using `MaskPipe`.
