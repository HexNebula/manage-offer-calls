# Secure Offers Call Management System

Full-stack web application for managing tender/offer calls at N+ONE DATACENTERS.

## Tech Stack

- **Backend**: Django 4.2 + Django REST Framework
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL 15
- **Auth**: JWT (SimpleJWT)
- **Deployment**: Docker Compose + nginx

## Features

- Offer lifecycle management (DRAFT → PUBLISHED → EVALUATION → AWARDED)
- Role-based access control (ADMIN, MANAGER, ANALYST, VIEWER)
- AES-256-GCM document encryption
- Deadline monitoring and notifications
- Public portal for external submissions
- PDF report generation
- Full audit logging

## Quick Start

```bash
# Clone and setup
git clone https://github.com/yourusername/appels-offres.git
cd appels-offres
cp .env.example .env

# Start services
docker-compose up --build

# Create admin user
docker exec -it offres_backend python manage.py createsuperuser
```

Access at:
- Frontend: http://localhost:3000
- API: http://localhost:8000/api/
- API Docs: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/admin/

## Project Structure

```
appels-offres/
├── backend/
│   ├── apps/
│   │   ├── authentication/
│   │   ├── offers/
│   │   ├── candidates/
│   │   ├── documents/
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── audit/
│   │   └── portal/
│   └── config/
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
| POST | /api/auth/login/ | Login |
| POST | /api/auth/refresh/ | Refresh token |
| GET | /api/offers/ | List offers |
| POST | /api/offers/ | Create offer |
| GET | /api/offers/{id}/submissions/ | List submissions |
| POST | /api/documents/upload/ | Upload document |
| GET | /api/portal/offers/ | Public offers (no auth) |

## Testing

```bash
docker exec -it offres_backend pytest --tb=short -v
```

## Acknowledgments

Internship project at N+ONE DATACENTERS, Casablanca  
MADANI Anas — ENSIAS 2nd year (Génie Logiciel)  
August 6 – September 6, 2025
