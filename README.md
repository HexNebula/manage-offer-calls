# Secure Tender Response Management System

Full-stack web application used by N+ONE DATACENTERS to manage its **answers to calls for tenders**
(appels d'offres) on the Moroccan market: spotting a tender, deciding Go / No-Go, preparing the bid,
tracking its submission on the buyer's portal, and recording the result.

## Tech Stack

- **Backend**: Django 4.2 + Django REST Framework
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL 15
- **Auth**: JWT (SimpleJWT) with refresh rotation and blacklisting
- **Deployment**: Docker Compose + nginx (reverse proxy, TLS)
- **CI**: GitHub Actions (flake8 + pytest on PostgreSQL)

## Features

- Tender lifecycle: `DETECTED → PREPARING → REVIEW → SUBMITTED → WON / LOST`, plus `NO_GO` and `CANCELLED`,
  enforced server-side through a single transition endpoint
- Buyers (public bodies and private companies), N+ONE's bid amount and the final result
  (winner, winning amount, rank, reason)
- Role-based access control (ADMIN, MANAGER, ANALYST, VIEWER); N+ONE's price is visible to managers only
- Documents by category (tender file, administrative, technical, financial) with expiry dates;
  financial documents are always encrypted with AES-256-GCM
- Scheduled reminders: submission deadline (J-7 / J-3 / J-1), site visit, bid opening, expiring attestations
- Login rate limiting per real client IP (nginx + Django)
- Dashboard (win rate, pipeline), PDF reports, full audit log

## Quick Start

```bash
git clone https://github.com/HexNebula/manage-offer-calls.git
cd manage-offer-calls
cp .env.example .env

# Start services
docker compose up --build

# Load demo data (users, buyers, tenders)
docker compose exec backend python manage.py seed_demo
```

Access at:
- App (through nginx): https://localhost (self-signed certificate)
- Frontend dev server: http://localhost:3000
- API Docs: https://localhost/api/docs/

## Project Structure

```
manage-offer-calls/
├── backend/
│   ├── apps/
│   │   ├── authentication/   # users, JWT, roles, login rate limit
│   │   ├── buyers/           # organisations that publish tenders
│   │   ├── offers/           # tenders, bid, result, lifecycle
│   │   ├── documents/        # upload/download, encryption
│   │   ├── notifications/    # reminders (check_deadlines)
│   │   ├── reports/          # PDF exports
│   │   └── audit/            # audit log
│   ├── config/
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── hooks/
├── nginx/
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login/ | Login (rate limited) |
| POST | /api/auth/refresh/ | Refresh token |
| GET / POST | /api/offers/ | List / create tenders |
| GET / PATCH | /api/offers/{id}/ | Tender detail / update |
| POST | /api/offers/{id}/transition/ | Change status (Go, No-Go, submit, won, lost...) |
| GET / POST | /api/buyers/ | List / create buyers |
| POST | /api/documents/upload/ | Upload document |
| GET | /api/documents/{id}/download/ | Download (decrypted on the fly) |
| GET | /api/reports/offers/{id}/export/ | Tender PDF report |

## Testing

```bash
docker compose exec backend pytest --tb=short -v
```

## Acknowledgments

Internship project at N+ONE DATACENTERS, Casablanca  
MADANI Anas — ENSIAS 2nd year (Génie Logiciel)  
August 6 – September 6, 2025
