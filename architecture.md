# Architecture: Secure Offers Call Management System

**Project**: Development of a Secure Web Application for Managing Offers Calls
**Company**: N+ONE DATACENTERS, Casablanca
**Intern**: MADANI Anas — ENSIAS 2nd year (GL)
**Duration**: 1 month — Aug 6 to Sep 6, 2025

---

## 1. Tech Stack Decision

| Layer | Choice | Rejected Alternatives |
|-------|--------|-----------------------|
| Backend | **Django (Python)** | Node.js, Spring Boot |
| Frontend | **React.js** | Angular, Vue.js |
| Database | **PostgreSQL** | MySQL |
| Auth | **JWT + Django REST Framework** | Sessions, OAuth |
| Containerization | **Docker Compose** | Kubernetes, bare metal |
| Reverse proxy | **Nginx (HTTPS)** | Caddy, bare Gunicorn |
| Scheduled tasks | **Docker service + polling loop** | cron, Celery Beat |

### Rationale

**Django** — comes with admin panel (saves 3-4 days), ORM migrations, DRF for serialization/permissions/filtering, built-in password hashing. Spring Boot is too verbose; Node.js requires assembling too many libraries.

**React** — largest ecosystem for tables, date pickers, PDF generation. Angular's learning curve is a time sink; Vue's ecosystem is less mature for these needs.

**PostgreSQL** — native JSON columns, better full-text search, superior `TIMESTAMPTZ` support for deadline tracking.

**Docker Compose, not Jenkins** — Jenkins in 1 month is scope creep. Docker Compose gives reproducible environments. A GitHub Actions pipeline (lint + test) runs on every push to `main`.

**Scheduler as a separate Docker service** — Django management command `check_deadlines` is run every 3600 seconds inside a dedicated `scheduler` container using a shell polling loop. This avoids installing a cron daemon inside the backend container and keeps the concern visible in `docker-compose.yml`.

---

## 2. System Architecture — Modular Monolith

```
                         ┌──────────────────────────────────────┐
                         │          External Companies          │
                         │     (no account, no login)           │
                         └──────────────┬───────────────────────┘
                                        │ HTTPS /portal
                                        │
┌───────────────────────────────────────▼──────────────────────────────────────┐
│                           Nginx  (port 443)                                  │
│               Self-signed SSL  —  HTTP 80 redirects to HTTPS                 │
│                    nginx/certs/cert.pem  +  key.pem                          │
│                                                                              │
│   /portal/*    ──────► React SPA (static build)                              │
│   /api/portal/* ─────► Django  (portal app, AllowAny)                        │
│   /*           ──────► React SPA (static build)                              │
│   /api/*       ──────► Django  (authenticated apps)                          │
└──────────────────────┬──────────────────────────────┬───────────────────────┘
                       │                              │
        ┌──────────────▼───────────────┐  ┌───────────▼──────────────────────┐
        │       Django Application     │  │     React SPA                    │
        │          (port 8000)         │  │   Internal staff interface        │
        │                              │  │   /portal — public portal pages  │
        │  ┌──────────┐ ┌──────────┐   │  └──────────────────────────────────┘
        │  │  Auth    │ │  Offers  │   │
        │  └──────────┘ └──────────┘   │
        │  ┌──────────┐ ┌──────────┐   │
        │  │ Candidates│ │Documents│   │
        │  └──────────┘ └──────────┘   │
        │  ┌──────────┐ ┌──────────┐   │
        │  │ Notifs   │ │ Reports  │   │
        │  └──────────┘ └──────────┘   │
        │  ┌──────────┐ ┌──────────┐   │
        │  │  Audit   │ │  Portal  │   │  ← public submission app
        │  └──────────┘ └──────────┘   │
        │                              │
        │     Django ORM │ DRF         │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼───────────────┐
        │     PostgreSQL (port 5432)   │
        └──────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         Docker Compose Network                               │
│   [frontend]  [backend]  [postgres]  [nginx]  [scheduler]                    │
│                                                                              │
│   scheduler — runs: check_deadlines every 3600 s (polling loop)              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Why Modular Monolith

Microservices would require: API gateway, service discovery, inter-service auth, distributed tracing — unbuildable solo in a month. The modular monolith achieves separation of concerns through Django app boundaries. Each module is a Django app with its own `models.py`, `views.py`, `serializers.py`, and `urls.py`. Boundaries make future extraction to services feasible.

### Public Portal Layer

The `apps/portal/` Django app is mounted separately under `/api/portal/` and uses `AllowAny` permission — no JWT, no session. It exposes read-only offer data and a single write endpoint for external submissions. This keeps the unauthenticated surface area explicit and isolated from the authenticated API.

---

## 3. Data Model

### Core Entities

```
Users
├── id (UUID)
├── email (unique)
├── password_hash
├── full_name
├── role (ADMIN | MANAGER | ANALYST | VIEWER)
├── department
├── is_active
├── created_at
└── last_login

OfferCalls (central entity)
├── id (UUID)
├── reference_number (generated, e.g. AO-2025-0042)
├── title
├── description (text)
├── status (DRAFT | PUBLISHED | EVALUATION | AWARDED | CANCELLED)
├── category (IT_INFRASTRUCTURE | SERVICES | WORKS | SUPPLIES)
├── budget_estimate (decimal, nullable)
├── published_at
├── submission_deadline (timestamptz)
├── evaluation_deadline (timestamptz)
├── created_by (FK → Users)
├── assigned_to (FK → Users)
├── created_at
└── updated_at

Candidates
├── id (UUID)
├── company_name
├── contact_email
├── contact_phone
├── address
├── registration_number
└── created_at

Submissions
├── id (UUID)
├── offer_call (FK → OfferCalls)
├── candidate (FK → Candidates)
├── submitted_at
├── technical_score (decimal, nullable)
├── financial_score (decimal, nullable)
├── final_score (computed or stored)
├── status (RECEIVED | UNDER_REVIEW | ACCEPTED | REJECTED)
├── notes (text)
└── evaluated_by (FK → Users, nullable)

Documents
├── id (UUID)
├── offer_call (FK → OfferCalls, nullable)
├── submission (FK → Submissions, nullable)
├── uploaded_by (FK → Users, nullable)      ← nullable: portal submissions have no user
├── file_name
├── file_path
├── file_size
├── mime_type
├── is_encrypted (boolean)
├── uploaded_at
└── checksum (SHA-256)

Notifications
├── id (UUID)
├── recipient (FK → Users)
├── offer_call (FK → OfferCalls, nullable)
├── type (DEADLINE_APPROACHING | STATUS_CHANGED | ASSIGNED | SUBMISSION_RECEIVED)
├── message (text)
├── is_read (boolean)
├── created_at
└── read_at

AuditLog
├── id (UUID)
├── user (FK → Users, nullable)
├── action (CREATE | UPDATE | DELETE | LOGIN | EXPORT | DOWNLOAD)
├── resource_type (OfferCall | Submission | Document | User)
├── resource_id (UUID)
├── changes (JSON)
├── ip_address
└── timestamp
```

### Relationships

```
Users        ──< OfferCalls    (created_by, assigned_to)
OfferCalls   ──< Submissions
OfferCalls   ──< Documents
Candidates   ──< Submissions
Submissions  ──< Documents
Users        ──< Notifications
Users        ──< AuditLog entries
```

### Portal Submission Flow

When an external company submits through the public portal, a single `POST /api/portal/offers/{id}/submit/` call atomically creates three records:

```
POST /api/portal/offers/{id}/submit/   (multipart/form-data)
  └─► Candidate (upsert or new)
  └─► Submission (status=RECEIVED)
  └─► Document(s) (uploaded_by=NULL)
```

No user account exists for the submitter. `Documents.uploaded_by` is `NULL` for portal-originated files and populated only for staff-uploaded files.

### Key Design Choices

- UUIDs as primary keys — avoids enumeration attacks (`/offers/1`, `/offers/2`)
- `submission_deadline` and `evaluation_deadline` are separate — deadline monitor checks both
- `AuditLog.changes` uses JSON to avoid a bloated schema
- Documents table supports offer-level, submission-level, and portal-submitted files via nullable FKs
- Category enum uses exactly four values: `IT_INFRASTRUCTURE`, `SERVICES`, `WORKS`, `SUPPLIES`

---

## 4. Week-by-Week Plan

### Week 1 (Aug 6–12) — Foundation
**Goal**: Working backend skeleton with auth, running in Docker

- Day 1–2: Project setup — Django, PostgreSQL in Docker Compose, React app with Vite, Git repo
- Day 3–4: Auth module — User model, JWT login/logout/refresh endpoints, role enum, Django admin
- Day 5–7: Offers CRUD — OfferCalls model, REST endpoints (list, create, retrieve, update), status state machine

**Deliverable**: Login works, can create and list offers via Postman/curl

---

### Week 2 (Aug 13–19) — Core Features
**Goal**: Offers lifecycle fully functional, React frontend connected

- Day 8–9: Frontend auth — Login page, JWT in memory, axios interceptor for token refresh, route guards
- Day 10–11: Offers dashboard — Table with filters (status, category, deadline), offer detail, create/edit form
- Day 12–13: Candidates and Submissions — Models, API endpoints, submission status tracking, scoring fields
- Day 14: Document upload — Multipart upload, stored on disk (Docker volume), size limit, mime-type whitelist

**Deliverable**: A manager can create an offer, add candidates, record submissions

---

### Week 3 (Aug 20–26) — Security and Notifications
**Goal**: Security hardened, notifications working

- Day 15–16: RBAC enforcement — DRF permission classes per endpoint, object-level permissions
- Day 17: Audit logging — Django signals on `post_save`/`post_delete`, audit log endpoint for admins
- Day 18: Deadline monitoring — `check_deadlines` management command, scheduler Docker service runs it every 3600 s
- Day 19–20: Notifications API and frontend — Notification bell in navbar, polling `GET /api/notifications/unread-count/`, mark-as-read
- Day 21: AES encryption — `cryptography` library, encrypt sensitive docs on upload, decrypt on download, key in env var

**Deliverable**: Roles enforced, deadline alerts working, sensitive files encrypted at rest

---

### Week 4 (Aug 27 – Sep 6) — Portal, Reports, Polish, Documentation
**Goal**: Demo-ready and documented

- Day 22–23: Public portal — `apps/portal/` Django app, React portal pages (`/portal`, `/portal/:id`), separate axios instance with no auth, rate limiting on submit endpoint
- Day 24: Nginx HTTPS — self-signed cert, HTTP → HTTPS redirect, nginx routes `/api/portal/` to portal app
- Day 25: Report generation — PDF export via `reportlab` (offer summaries, submission scoring tables)
- Day 26–27: Frontend polish — Error boundaries, loading states, empty states, responsive layout, brand colors and logo
- Day 28–29: Testing — Critical path integration tests (auth, offer create, submission, document download, portal submit)
- Day 30–31: Documentation — README, API docs via `drf-spectacular`, final Docker Compose for demo

---

## 5. Security Architecture

### Authentication Flow

```
Client                          Django Backend
  │                                   │
  │  POST /api/auth/login             │
  │  { email, password }  ──────────► │
  │                                   │  Verify password_hash (bcrypt)
  │                                   │  Check is_active
  │                                   │  Write AuditLog: LOGIN
  │  ◄──────────────────────────────  │
  │  { access_token (15m),            │
  │    refresh_token (7d) }           │
  │                                   │
  │  access_token → React memory      │
  │  refresh_token → httpOnly cookie  │
  │                                   │
  │  GET /api/offers/                 │
  │  Authorization: Bearer <access>   │
  │  ──────────────────────────────►  │
  │                                   │  Validate JWT, extract user_id + role
  │  ◄──────────────────────────────  │
  │  200 OK { offers: [...] }         │
```

**Why not localStorage**: XSS attacks can steal tokens from localStorage. Access token in React memory + refresh token in `httpOnly + Secure + SameSite=Lax` cookie is the standard mitigation.

**Cookie path isolation**: The refresh token cookie is scoped to `path=/api/auth/` so it is never sent on portal requests (`/api/portal/*`) or any other endpoint — only `/api/auth/refresh/` and `/api/auth/logout/` receive it.

### Portal Authentication (None)

The public portal endpoints use `AllowAny`. There is no login, no token, no session. The only writable portal endpoint (`POST /api/portal/offers/{id}/submit/`) creates records atomically and returns a confirmation.

**Portal rate limiting**: `PublicSubmitView` is decorated with `@ratelimit(key='ip', rate='5/h', method='POST', block=True)` (django-ratelimit). Exceeding the limit returns HTTP 429. This prevents DB flooding from automated scripts.

**Deadline enforcement**: `PublicSubmitView` checks `timezone.now() > offer.submission_deadline` and returns HTTP 400 if the deadline has passed. Submissions to expired offers are rejected server-side regardless of what the portal UI shows.

### Role-Based Access Control

| Role | Create Offer | Edit Offer | View All | Score Submissions | Export | Manage Users |
|------|-------------|------------|----------|-------------------|--------|--------------|
| ADMIN | YES | YES | YES | YES | YES | YES |
| MANAGER | YES | Own only | YES | Assigned only | YES | NO |
| ANALYST | NO | NO | YES | YES | YES | NO |
| VIEWER | NO | NO | Published only | NO | NO | NO |
| (Portal) | — | — | Published only | — | — | — |

### Encryption Strategy

| Data | Encryption | Key Storage |
|------|------------|-------------|
| Passwords | bcrypt (Django default) | Not stored — hashed |
| JWT | HMAC-SHA256 | Django `SECRET_KEY` in env var |
| Sensitive documents | AES-256-GCM | `DOCUMENT_ENCRYPTION_KEY` env var |
| Transport | HTTPS via nginx | Self-signed cert (demo), nginx/certs/ |

AES encryption is applied selectively to sensitive documents (financial proposals, contracts) — not all uploads.

### Security Checklist

- `DEBUG=False` in production config
- `ALLOWED_HOSTS` restricted
- CORS whitelist (React app origin only; portal origin same domain)
- Rate limiting on `/api/auth/login/` (5 attempts/min/IP)
- File upload: mime-type whitelist (PDF, DOCX, XLSX), max 10MB
- SQL injection: prevented by Django ORM (no raw queries)
- UUID primary keys prevent enumeration
- Audit log on all write operations
- HTTP → HTTPS redirect enforced at nginx level

---

## 6. API Design

### Auth
```
POST   /api/auth/login/
POST   /api/auth/refresh/
POST   /api/auth/logout/
GET    /api/auth/me/
PATCH  /api/auth/me/
```

### Offers
```
GET    /api/offers/
POST   /api/offers/
GET    /api/offers/{id}/
PATCH  /api/offers/{id}/
POST   /api/offers/{id}/publish/  — DRAFT → PUBLISHED
POST   /api/offers/{id}/close/    — PUBLISHED → EVALUATION
POST   /api/offers/{id}/award/    — EVALUATION → AWARDED
POST   /api/offers/{id}/cancel/   — any non-terminal status → CANCELLED
```

### Submissions
```
GET    /api/candidates/offers/{id}/submissions/
POST   /api/candidates/offers/{id}/submissions/
PATCH  /api/candidates/offers/{id}/submissions/{sub_id}/
```

### Documents
```
POST   /api/documents/upload/
GET    /api/documents/{id}/download/
DELETE /api/documents/{id}/delete/
GET    /api/documents/              — filter: ?offer_call={id} or ?submission={id}
```

### Notifications
```
GET    /api/notifications/
GET    /api/notifications/unread-count/
POST   /api/notifications/mark-all-read/
```

### Admin & Reports
```
GET    /api/auth/users/
POST   /api/auth/users/
PATCH  /api/auth/users/{id}/
GET    /api/reports/offers/export/
GET    /api/reports/offers/{id}/export/
GET    /api/audit/logs/
```

### Public Portal (AllowAny — no authentication required)
```
GET    /api/portal/offers/             — PublicOfferListView
                                         returns only PUBLISHED offers
                                         (title, category, deadline, reference)

GET    /api/portal/offers/{id}/        — PublicOfferDetailView
                                         full description; excludes internal fields
                                         (budget_estimate, assigned_to, scores)

POST   /api/portal/offers/{id}/submit/ — PublicSubmitView
                                         multipart/form-data
                                         body: company_name, contact_email,
                                               contact_phone, address,
                                               registration_number, files[]
                                         creates: Candidate + Submission + Document(s)
                                         uploaded_by is set to NULL
```

### Design Notes

- All list endpoints return `{ count, next, previous, results }` (DRF pagination)
- Status transitions are explicit endpoints — enforces state machine server-side
- Soft deletes only — offers are never hard-deleted
- File downloads stream through Django, never expose filesystem paths directly
- Portal list endpoint filters `status=PUBLISHED` server-side; internal fields are excluded from portal serializers

---

## 7. Architectural Decision Records

### ADR-001: Modular Monolith Over Microservices

**Status**: Accepted

**Context**: The project has multiple domains (auth, offers, documents, notifications, reports). All could theoretically be separate services. The team is one developer with one month.

**Decision**: Single Django application with internal module boundaries. All modules share one database. Docker Compose runs one backend container.

**Consequences**:
- Easier: One `docker-compose up`, cross-module transactions work, debugging is straightforward
- Harder: Future extraction to services requires splitting the database
- Mitigated by: Keeping each Django app's models self-contained, avoiding cross-app ORM joins

---

### ADR-002: JWT in Memory + httpOnly Cookie

**Status**: Accepted

**Context**: JWT tokens must be stored client-side. localStorage is vulnerable to XSS. Storing in httpOnly cookies prevents XSS theft but needs CSRF protection.

**Decision**: Access token in React memory (context/state), refresh token in `httpOnly + Secure + SameSite=Lax + path=/api/auth/` cookie. On page load, silently call `/api/auth/refresh/` to restore the access token. Cookie path `/api/auth/` ensures the cookie is not sent on portal requests or any other API endpoint.

**Consequences**:
- Easier: XSS cannot steal the refresh token; no CSRF risk (access token in Authorization header)
- Harder: React auth context needs a loading state on initial mount for silent refresh
- Acceptable: Security is a stated requirement; complexity is manageable

---

### ADR-003: Selective AES Encryption for Sensitive Documents Only

**Status**: Accepted

**Context**: Requirements mention AES encryption. Encrypting every file adds overhead and key management complexity. Not all documents are equally sensitive.

**Decision**: `is_encrypted` boolean on Document model. Sensitive documents (financial proposals, contracts) are AES-256-GCM encrypted on upload and decrypted on download. Key stored in `DOCUMENT_ENCRYPTION_KEY` env var.

**Consequences**:
- Easier: Regular attachments are fast; feature is demonstrably implemented
- Harder: Two code paths for download; key rotation requires re-encrypting all sensitive files
- Not addressed: HSM or KMS — documented as future improvement

---

### ADR-004: Public Portal Added Back In

**Status**: Accepted

**Context**: The public portal (external companies submitting proposals directly) was initially cut from scope because of time constraints and the added complexity of an unauthenticated write path. The planned workaround was for staff to record submissions manually on behalf of candidates.

During week 4, the remaining scope was manageable enough to revisit this decision. The business case is strong: manual data entry by staff is error-prone and creates a bottleneck at deadline time when multiple companies submit at once.

**Decision**: Add `apps/portal/` as an isolated Django app with three endpoints (`PublicOfferListView`, `PublicOfferDetailView`, `PublicSubmitView`). Use `AllowAny` permission exclusively in this app. Add two React pages under `src/pages/portal/` with a dedicated `portalApi.js` axios instance that carries no Authorization header. The portal is reachable at `/portal` and `/portal/:id` without login.

To support unauthenticated uploads, `Documents.uploaded_by` is made nullable with a Django migration. Portal-submitted documents have `uploaded_by=NULL`; staff-uploaded documents remain unchanged.

**Consequences**:
- Easier: External companies submit directly; staff load at deadline time is reduced; the flow is auditable (Submission + Document records are created atomically)
- Harder: `uploaded_by=NULL` must be handled in every query and serializer that previously assumed a user always exists; the portal surface is unauthenticated and must be rate-limited
- Kept isolated: The portal app imports only the model classes (`OfferCalls`, `Candidates`, `Submissions`, `Documents`) from authenticated apps — it shares no permission classes, no serializers, and no views with the internal API

---

## 8. What Was Cut

Explicitly out of scope. Documented as "future work" in the internship report.

| Feature | What Was Used Instead |
|---------|----------------------|
| Jenkins CI/CD | GitHub Actions pipeline runs on push — flake8 lint + pytest |
| WebSocket real-time notifications | 30-second polling — invisible to users |
| Email notifications | In-app only |
| Elasticsearch full-text search | PostgreSQL `ILIKE` (trigram index for performance) |
| Multi-language (Arabic/French) | User chooses input language; UI is in French |
| File preview in browser | Download link (browser handles PDF natively) |
| Kubernetes | Docker Compose with resource limits |

### Known Gaps — Document in Report

- Key rotation for AES-encrypted documents (re-encrypt all sensitive files on key change)
- PostgreSQL encryption at rest (TDE)
- Concurrent edit conflict resolution (optimistic locking)
- Password reset flow via email
- Production-grade SSL certificate (self-signed used for demo)
- DOCUMENT_ENCRYPTION_KEY in docker-compose.yml env block is demo-only; production should use Docker secrets or a secrets manager
- Scheduler does not acquire a DB advisory lock — if check_deadlines takes longer than 3600 s, runs could overlap (not realistic for this dataset, documented as future work)

---

## 9. Project Structure

```
appels-offres/
├── docker-compose.yml            — defines: frontend, backend, postgres, nginx, scheduler
├── nginx/
│   ├── nginx.conf                — HTTPS on 443, HTTP 80 redirect, proxy rules
│   └── certs/
│       ├── cert.pem              — self-signed SSL certificate
│       └── key.pem               — private key
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/                   — Django settings, urls, wsgi
│   └── apps/
│       ├── authentication/       — User model, JWT views, permissions
│       │   └── management/commands/seed_demo.py  — populates DB with demo scenario
│       ├── offers/               — OfferCall, state machine, CRUD
│       ├── candidates/           — Candidate, Submission models
│       ├── documents/            — Upload, download, AES layer
│       ├── notifications/        — Notification model, check_deadlines command
│       ├── reports/              — PDF generation (reportlab)
│       ├── audit/                — AuditLog model, signals
│       └── portal/               — PublicOfferListView, PublicOfferDetailView,
│                                    PublicSubmitView (AllowAny)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── assets/               — company logo PNG, pattern.svg
│       ├── contexts/             — AuthContext (token management)
│       ├── pages/
│       │   ├── portal/
│       │   │   ├── PortalOfferList.jsx    — /portal
│       │   │   └── PortalOfferSubmit.jsx  — /portal/:id
│       │   └── ...               — Login, Dashboard, OfferDetail, etc.
│       ├── components/           — Shared UI components
│       ├── services/
│       │   ├── portalApi.js      — axios instance, no Authorization header
│       │   └── ...               — authenticated API wrappers per domain
│       └── hooks/                — useAuth, useNotifications
└── .github/
    └── workflows/
        └── ci.yml                — flake8 lint + pytest on push to main
```

### Brand Identity

Company logo (PNG) appears in the sidebar, login page, and portal page headers. Brand colors:

| Name | Hex |
|------|-----|
| Navy | `#003049` |
| Orange | `#F77F00` |
| Red | `#D62828` |
| Yellow | `#FCBF49` |

### Docker Compose Services

| Service | Description |
|---------|-------------|
| `frontend` | React build served by nginx (or dev server in development) |
| `backend` | Django + Gunicorn on port 8000 |
| `postgres` | PostgreSQL on port 5432, data persisted in a named volume |
| `nginx` | Reverse proxy on ports 80 and 443; terminates SSL |
| `scheduler` | Runs `check_deadlines && sleep 3600` in a loop; retries after 60 s on failure |

All services have Docker health checks. `db` and `backend` use `condition: service_healthy` in `depends_on` so startup order is enforced.

### Database Migrations

Migrations run automatically at backend container startup:

```
python manage.py migrate --noinput
```

This is part of the `command:` block in docker-compose.yml. To run manually:

```bash
docker-compose exec backend python manage.py migrate
```

### Logging Strategy

All services log to **stdout/stderr**. Docker captures these as container logs. To view:

```bash
docker-compose logs -f backend      # Django application logs
docker-compose logs -f scheduler    # Deadline check output
docker-compose logs -f nginx        # Access and error logs
```

Log format: Django's default (timestamp + level + message). No log volume mounts — logs are ephemeral per container lifecycle. Production would add a log driver (e.g., `json-file` with rotation, or forward to a centralized system).
