# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

Monorepo with three independent packages:

```
backend/          — Express + TypeScript REST API (Node.js)
frontend/         — React 19 + Vite SPA (TypeScript)
mobile-frontend/  — React Native / Expo app (TypeScript)
```

The root `.env` is loaded by the backend. `frontend/.env` and `mobile-frontend/.env` are separate.

## Commands

### Backend
```bash
cd backend
npm run dev          # ts-node-dev with hot reload (port 3001)
npm run build        # tsc → dist/
npm start            # run compiled dist/server.js
npm run prisma:generate   # regenerate Prisma Client after schema changes
npm run prisma:pull       # introspect DB and update schema.prisma
npm run prisma:studio     # Prisma Studio GUI
npm run prisma:seed       # run prisma/seed.ts
npx tsc --noEmit     # type-check without emitting
```

### Frontend
```bash
cd frontend
npm run dev          # Vite dev server (port 5173)
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npm run preview      # preview production build
```

### Mobile
```bash
cd mobile-frontend
npx expo start       # start Expo dev server
```

There are no automated tests; type-checking (`tsc --noEmit`) is the primary correctness gate.

## Architecture

### Authentication

Supabase handles auth (email/password, OTP). JWTs are verified **locally** in the backend using JWKS (`jose` library — no Supabase API call per request). The `authenticate` middleware in `backend/src/middleware/auth.ts` caches user lookups for 30 s. `requireRole(...roles)` in `backend/src/middleware/requireRole.ts` does a live DB role lookup and must follow `authenticate` in route chains.

The frontend (`frontend/src/api/client.ts`) is an Axios instance that reads the Supabase session token via `onAuthStateChange` and attaches it to every request as `Authorization: Bearer <token>`. On 401 it signs the user out and redirects to `/login`.

### Backend Route Layout

All routes are registered in `backend/src/app.ts`. Two path prefixes exist for the same route handlers:

| Prefix | Consumer |
|---|---|
| `/internal-api/*` | Web frontend |
| `/api/*` | Mobile frontend (React Native) |
| `/api/public/*` | Unauthenticated public endpoints |
| `/auth/*` | Auth (Supabase integration + demo login) |

Key route files:
- `staff.routes.ts` — verification, tracking, wigmaker assignment, matching, wig/hair stock
- `request.routes.ts` — recipient hair request CRUD and status updates
- `donation.routes.ts` — donor hair donation CRUD
- `notification.routes.ts` — CRUD for in-app notifications (read, delete, mark-read)
- `wigmaker.routes.ts` — wigmaker task management
- `admin.routes.ts` — admin-only dashboard, announcements, user management

### Database (Prisma + Supabase PostgreSQL)

Schema lives in `backend/prisma/schema.prisma`. Changes require:
1. Edit `schema.prisma`
2. Run `prisma db push` (dev) or write a migration SQL and apply it
3. Run `npm run prisma:generate` to regenerate the client

Key models:
- **User** — `role` field is `donor | recipient | staff | admin | wigmaker`
- **HairRequest** — recipient wig requests; statuses: `Submitted → Approved/Rejected → Validated → In Production → Matched → In Transit → Arrived → Completed`
- **Donation** — donor hair donations; statuses: `Submitted → Approved/Rejected → Received Hair → In Queue → In Progress → Completed → Wig Received`
- **WigProduction** — production tasks assigned to wigmakers; statuses: `assigned → processing → completed → shipped → received`
- **notifications** — in-app notifications for all roles (queried by `user_id`)
- **StatusHistory** — polymorphic audit log keyed by `(trackable_id, trackable_type)`

The `trackable_type` values are Laravel-style strings (legacy): `App\Models\HairRequest`, `App\Models\Donation`, `App\Models\WigProduction`.

### Notification System

All notification logic is in `backend/src/services/notification.service.ts`:
- `createNotification(userId, title, message, type)` — creates a record for **any** user role
- `notifyRequestStatus / notifyDonationStatus` — status-triggered notifications for individual users
- `notifyAllDonorsAndRecipients(title, message)` — broadcast to `donor | recipient | staff`
- `notifyAllUsers(title, message, type)` — same audience, used for event notifications
- `notifyWigmakerAssignment / notifyWigmakerMaterialDelivery` — wigmaker-specific

The frontend `NotificationBell` component polls `/internal-api/notifications` every 3 seconds. Notification types: `general | donation | request | announcement | event | monetary | wigmaker | community`.

### Frontend Structure

- `frontend/src/App.tsx` — all routes with role-based `ProtectedRoute` wrappers
- `frontend/src/contexts/AuthContext.tsx` — `useAuth()` hook exposes `user`, `login`, `logout`, `register`, `loginAs` (demo)
- `frontend/src/api/client.ts` — shared Axios instance; all API calls use this
- `frontend/src/components/layouts/DashboardLayout.tsx` — single layout component that branches on `user.role` to render role-specific sidebar/topbar; `staff` and `wigmaker` get a custom topbar layout; donors/recipients share a navbar layout
- `frontend/src/components/NotificationBell.tsx` — self-contained bell with dropdown, mark-as-read, delete, and announcement modal

### Validation

All backend input is validated with Zod schemas defined in `backend/src/schemas/index.ts`, applied via the `validate(schema)` middleware (`backend/src/middleware/validate.ts`).

### File Storage

Supabase Storage is used for file uploads (medical certificates, photos, documents). Upload logic is in `backend/src/services/storage.service.ts`. The Supabase bucket name is `hairlink`.

### Demo Accounts

Dev-only demo login is available via `loginAs(role)` in `AuthContext`. It calls `POST /auth/demo` which uses the Supabase service-role key to generate a session server-side. Demo credentials are in `AuthContext.tsx` and `backend/src/routes/demo.routes.ts`.

## Environment Variables

Backend reads from the root `.env` (two levels up from `backend/src/`):
- `DATABASE_URL` — Supabase pooler connection string (Prisma runtime)
- `DIRECT_URL` — Supabase direct connection string (Prisma migrations)
- `SUPABASE_URL` — used for JWKS endpoint
- `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGIN` — defaults to `http://localhost:5173`

Frontend (`frontend/.env`):
- `VITE_API_URL` — backend URL, defaults to `http://localhost:3001`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
