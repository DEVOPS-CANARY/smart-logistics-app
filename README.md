# Smart Logistics Platform

The Smart Logistics Platform is a modern, production grade web application that reimagines how logistics operations are managed from end to end. Designed around a role based architecture, it delivers three distinct experiences an **Admin Panel** for operational oversight and courier dispatch, a **User Dashboard** for shipment creation and package tracking, and a **Courier Workspace** for managing assigned deliveries in the field. Every status change is broadcast instantly through real time WebSocket channels, giving all stakeholders immediate visibility into the delivery pipeline. Built with Next.js, NestJS, PostgreSQL and Socket.IO, the platform combines enterprise level security practices JWT authentication with token rotation, ownership enforced access control and comprehensive audit logging with a clean, responsive interface that works seamlessly across devices.

![Pipeline](https://github.com/DEVOPS-CANARY/smart-logistics-app/actions/workflows/pipeline.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

---

![Image](https://github.com/user-attachments/assets/588ad818-0b28-4907-96e5-30ad72eb0540)

![Image](https://github.com/user-attachments/assets/bfadab6a-67f0-49ec-9465-fac084e4eb54)

![Image](https://github.com/user-attachments/assets/0185431e-5e0b-4a58-9d15-d3a06c741afd)

![Image](https://github.com/user-attachments/assets/85a00282-ff35-4d13-8100-0e3742e5dec9)

![Image](https://github.com/user-attachments/assets/16db5167-8e9c-444c-a7ee-ccf68e619e7a)

![Image](https://github.com/user-attachments/assets/e44c008e-be3c-491f-81b4-bc59857b7a3a)


---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Security & Access Control](#security--access-control)
- [Real Time Tracking](#real-time-tracking)
- [Testing & Quality](#testing--quality)
- [Demo Flow](#demo-flow)
- [Contributing](#contributing)
- [Links](#links)
- [License](#license)

---

## Features

**Role Based Dashboards**

- Three distinct dashboards tailored for Admin, User, and Courier roles
- Automatic role detection and dashboard routing after login
- Profile management with password and email change functionality

**Admin Panel**

- Shipment metrics overview with status distribution
- Courier assignment workflow with availability tracking
- User role management  promote users to couriers on the fly
- Comprehensive audit log viewer with filtering by action, target, and actor
- Shipment filtering and sorting controls

**User Experience**

- Create and manage shipments with pickup/delivery addresses
- View only owned shipments enforced at both API and UI level
- Search, filter, and segment shipments by status (Active, Completed, Cancelled)
- Real-time shipment tracking page with live status updates

**Courier Workspace**

- View only assigned deliveries with segmented filters (Ready Now, In Transit, Completed)
- Update tracking status with notes and optional GPS coordinates
- Toggle availability status for dispatch readiness
- Delivery note requirement for completed shipments

**Security**

- JWT authentication with refresh token rotation and SHA-256 hashing
- Role based access control (RBAC) with ownership enforcement
- Rate limiting (per-endpoint throttling for auth routes)
- Helmet.js security headers and CORS configuration
- Global exception filter no stack traces or internal errors leak to clients
- Input validation with `class-validator` and `forbidNonWhitelisted` rejection
- UUID validation on all route parameters

**Real-Time Tracking**

- Socket.IO WebSocket gateway with JWT-authenticated connections
- Per shipment rooms (`shipment:<id>`) for targeted event broadcasting
- Live tracking event streaming on shipment detail pages
- Automatic room join/leave lifecycle management

**Infrastructure**

- Multi stage Docker builds for optimized production images
- Docker Compose orchestration (production + dev configurations)
- GitHub Actions CI pipeline (format, lint, typecheck, test, build)
- Health check and readiness endpoints for container orchestrators
- Graceful shutdown hooks for clean database disconnection

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **NestJS 10** | Backend framework with modular architecture |
| **Prisma 5** | Type safe ORM with migrations and seeding |
| **PostgreSQL 16** | Primary relational database |
| **Passport JWT** | Stateless authentication with access + refresh tokens |
| **Socket.IO** | Real time bidirectional event-based communication |
| **class-validator** | DTO validation with decorators |
| **@nestjs/throttler** | Rate limiting and brute-force protection |
| **@nestjs/cache-manager** | Response caching for metrics and analytics |
| **Helmet** | HTTP security headers |
| **Swagger** | Auto generated API documentation (dev only) |
| **Jest** | Unit and integration testing (71+ tests) |

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 14** | React framework with App Router |
| **React 18** | Component based UI library |
| **TypeScript** | End to end type safety |
| **Tailwind CSS** | Utility first responsive styling |
| **Socket.IO Client** | Real time WebSocket integration |
| **Jest + RTL** | Component and hook testing (27+ tests) |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker** | Multi stage containerization (Node 20 Alpine) |
| **Docker Compose** | Multi service orchestration |
| **GitHub Actions** | Automated CI pipeline |
| **ESLint + Prettier** | Code quality and formatting enforcement |

---

## Architecture

### Project Structure

```text
Smart-Logistic-Platform/
├── backend/
│   ├── prisma/                  # Schema, migrations, seed script
│   └── src/
│       ├── auth/                # JWT, guards, login/register, password/email change
│       ├── shipments/           # CRUD, metrics, analytics, assignment
│       ├── tracking/            # Events, Socket.IO gateway
│       ├── couriers/            # Profiles, availability, performance
│       ├── users/               # Role management
│       ├── audit/               # Action logging and query
│       ├── health/              # Liveness and readiness checks
│       ├── common/              # Filters, guards, interceptors, pipes
│       └── prisma/              # Database service
├── frontend/
│   └── src/
│       ├── app/                 # Next.js pages (admin, user, courier, profile, tracking)
│       ├── components/          # UI components organized by domain
│       ├── hooks/               # Custom hooks for state management
│       ├── lib/                 # API client, auth helpers, types
│       └── types/               # Shared TypeScript definitions
├── docker/                      # Dockerfiles (backend + frontend)
├── .github/workflows/           # CI pipeline configuration
├── docker-compose.yml           # Production stack
├── docker-compose.dev.yml       # Development database
└── .env.example                 # Environment variable template
```

### Real Time Tracking Flow

```
  Courier updates status          Backend processes event
  via REST API            ──►     and saves to database
                                          │
                                          ▼
                                  Socket.IO emits to
                                  room: shipment:<id>
                                          │
                                          ▼
                                  Tracking page receives
                                  live update instantly
```

---

## Getting Started

### Prerequisites

- **Node.js** 20 or higher
- **Docker** and **Docker Compose** (for PostgreSQL)
- **npm** (included with Node.js)

### Quick Start (Recommended)

A single command starts PostgreSQL, the backend, and the frontend:

```bash
npm run dev
```

This launches:
- **PostgreSQL** on port `5432` (via Docker)
- **Backend** on port `3001` (NestJS with hot-reload)
- **Frontend** on port `3000` (Next.js dev server)

Press `Ctrl+C` to stop. Then clean up:

```bash
npm run dev:stop
```

### Docker Compose (Full Stack)

Run everything in containers (no hot-reload):

```bash
docker compose up --build
```

### Manual Setup

1. **Start PostgreSQL**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. **Backend**
   ```bash
   cd backend
   npm install
   npm run prisma:migrate
   npm run prisma:seed       # optional: load demo data
   npm run start:dev
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgres://logistics:logistics@localhost:5432/logistics
JWT_SECRET=
ALLOWED_ORIGINS=http://localhost:3000
JWT_ISSUER=
JWT_AUDIENCE=
PORT=3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login with credentials | Public |
| POST | `/auth/refresh` | Refresh access token | Token |
| POST | `/auth/logout` | Revoke refresh token | JWT |
| GET | `/auth/me` | Get current user profile | JWT |
| PATCH | `/auth/change-password` | Change password | JWT |
| PATCH | `/auth/change-email` | Change email address | JWT |

### Shipments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/shipments` | Create shipment | USER, ADMIN |
| GET | `/shipments` | List shipments (role filtered) | JWT |
| GET | `/shipments/metrics` | Shipment metrics | ADMIN |
| GET | `/shipments/analytics` | Analytics data | ADMIN |
| GET | `/shipments/:id` | Shipment details | JWT |
| PATCH | `/shipments/:id` | Update shipment | USER, ADMIN |
| POST | `/shipments/:id/assign-courier` | Assign courier | ADMIN |
| POST | `/shipments/:id/cancel` | Cancel shipment | USER, ADMIN |
| POST | `/shipments/:id/delay` | Mark as delayed | ADMIN |
| DELETE | `/shipments/:id` | Delete shipment | ADMIN |

### Tracking

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/shipments/:id/tracking` | Create tracking event | COURIER, ADMIN |
| GET | `/shipments/:id/tracking` | Get tracking history | JWT |

### Couriers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/couriers` | Create courier profile | ADMIN |
| GET | `/couriers` | List all couriers | ADMIN |
| GET | `/couriers/me` | Get own courier profile | COURIER |
| PATCH | `/couriers/me/availability` | Toggle availability | COURIER |
| PATCH | `/couriers/me/profile` | Update profile | COURIER |
| GET | `/couriers/performance` | Performance metrics | ADMIN |

### Users & Audit

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | List all users | ADMIN |
| PATCH | `/users/:id/role` | Update user role | ADMIN |
| GET | `/audit-logs` | Query audit logs | ADMIN |

### Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Liveness check | Public |
| GET | `/health/readiness` | Database readiness | Public |

> Swagger documentation is available at `/api` in development mode.

---

## Security & Access Control

The backend enforces role aware and ownership aware access at every layer:

- **ADMIN:** Full access to all shipments, users, couriers, and audit logs
- **USER:** Can only access shipments they created
- **COURIER:** Can only access shipments assigned to their courier record
- **Tracking events:** Restricted to the assigned courier or admins

The UI is role specific, but the **real security boundary is enforced in the backend**. Even if the frontend were bypassed, unauthorized API calls would be rejected.

Additional protections:
- Rate limiting on authentication endpoints (5 requests/minute)
- Global rate limiting (60 requests/minute)
- Request payload validation with unknown field rejection
- UUID format validation on all route parameters
- Bcrypt password hashing with configurable salt rounds
- Refresh token rotation with SHA-256 hashing

---

## Real Time Tracking

Shipment tracking uses Socket.IO for instant status updates:

1. **Connection:** Client connects with JWT token for authentication
2. **Room join:** Client joins `shipment:<id>` room (authorized access only)
3. **Event broadcast:** When a courier updates tracking, the event is emitted to the room
4. **Live update:** All clients viewing that shipment receive the update instantly

This architecture ensures each tracking page only receives events for the relevant shipment, with no unnecessary data transfer.

---

## Testing & Quality

### Running Tests

```bash
# Run all tests (from project root)
npm run test

# Backend only (71+ tests)
cd backend && npm run test

# Frontend only (27+ tests)
cd frontend && npm run test
```

### Quality Checks

```bash
npm run format:check    # Prettier formatting
npm run lint            # ESLint rules
npm run typecheck       # TypeScript compilation
```

### CI Pipeline

This repo keeps one short workflow, `.github/workflows/pipeline.yml`, which calls the
platform's shared pipeline ([golden-path](https://github.com/DEVOPS-CANARY/golden-path)).
It runs on every pull request to `develop`, `staging` and `main`:

| Gate | Tool |
|------|------|
| Secret scan (whole history) | Gitleaks |
| SAST | Semgrep |
| Dependency vulnerabilities | Trivy (fs) |
| Dockerfile lint | hadolint |
| Format, lint, types, tests, build (backend and frontend) | Prettier, ESLint, `tsc`, Jest, Nest/Next build |

On a merge to `develop` it also builds both images, scans them with Trivy, pushes
them to GHCR tagged `sha-<commit>` and `tree-<content hash>`, and deploys them to UAT.

### Delivery: UAT → Staging → Production

The same images move through the environments; they are built once, on `develop`,
and never rebuilt. CI never touches the cluster: each deploy is a commit of image
digests to [GitOps-Repo](https://github.com/DEVOPS-CANARY/GitOps-Repo), and Argo CD
rolls it out.

| Environment | How it is deployed | Workflow |
|---|---|---|
| UAT | Merge a PR into `develop` | push to `develop` |
| Staging | Merge the PR `develop` → `staging` | push to `staging` |
| Production | Merge the PR `staging` → `main`, then **Actions → Pipeline → Run workflow** on `main`, and an approver approves the `production` deployment | manual run on `main` |

- Staging and production find the images by their `tree-` tag, so promotion PRs
  must bring **exactly** what was built: use **Create a merge commit**, with no
  other changes in the PR. Otherwise the workflow stops: *"No image …"*.
- Production only accepts the digests Staging runs.
- **Hotfix** (an urgent fix without the unreleased work in `develop`/`staging`):
  1. `git checkout -b hotfix/<name> origin/main`, fix, push, and open a PR to `main`.
  2. CI runs every gate and deploys the hotfix to the **staging environment** (not the
     `staging` branch) for testing.
  3. Merge the PR, then **Release → Run workflow** on `main`, then approve. Prod gets
     the image staging tested.
  4. Merge `main` back into `develop` (PR), so the next release keeps the fix.
     Forgetting this makes the next release fail with *"No image …"* rather than
     silently undoing the fix.
- Rollback: `git revert` the deploy commit in GitOps-Repo.

---

## Demo Flow

A suggested walkthrough for showcasing the platform:

1. **Start the stack**
   ```bash
   docker compose up --build
   ```

2. **Seed demo data**
   ```bash
   cd backend && npm run prisma:seed
   ```

3. **Admin:** Log in as `admin@example.com` / `Admin12345!`
   - View metrics dashboard and shipment overview
   - Promote `user1@example.com` to `COURIER` via role management
   - Assign the new courier to `Demo Shipment 2`

4. **Courier:** Log in as `courier@example.com` / `Courier12345!`
   - View assigned deliveries
   - Update tracking status with a delivery note

5. **Real Time:** Open a shipment tracking page
   - Watch live updates appear as the courier posts tracking events

6. **User:** Log in as `user2@example.com` / `User12345!`
   - Verify they can only see their own shipments
   - Create a new shipment and track it

---

## Contributing

Contributions are welcome! If you find issues or have ideas for improvements, feel free to open an issue or submit a pull request.

1. **Fork the repository**
2. **Create your feature branch**
   ```bash
   git checkout -b feature/YourFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add YourFeature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/YourFeature
   ```
5. **Open a pull request**

Please ensure your code passes all quality checks (`npm run format:check && npm run lint && npm run typecheck && npm run test`) before submitting.

---

## Links

[![Gmail](https://img.shields.io/badge/ismailsariarslan7@gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:ismailsariarslan7@gmail.com)

[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/ismailsariarslan/)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ismailsariarslan/)

---

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/).
