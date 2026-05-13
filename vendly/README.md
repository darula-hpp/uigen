# Vendly Platform

A FastAPI-based middleware platform that enables merchants to sell services from third-party vendors.

## Features

- Merchant self-onboarding and JWT authentication
- Float balance management with atomic transactions
- Multiple transaction types (deposits, vending, cashouts)
- Strategy pattern for vendor and payment provider integrations
- Commission calculation and monthly payouts
- Vendor SLA monitoring and enforcement
- Comprehensive audit trails
- Property-based testing with Hypothesis

## Technology Stack

- **Framework**: FastAPI (async Python web framework)
- **Database**: PostgreSQL with SQLAlchemy ORM (async)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Payment Processing**: Stripe (with webhook verification)
- **Background Jobs**: APScheduler for scheduled tasks
- **Database Migrations**: Alembic
- **Testing**: Pytest with Hypothesis for property-based testing

## Project Structure

```
vendly/
├── app/
│   ├── routers/          # API route handlers
│   ├── services/         # Business logic layer
│   ├── strategies/       # Vendor and payment strategies
│   ├── repositories/     # Data access layer
│   ├── models.py         # SQLAlchemy ORM models
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── config.py         # Configuration management
│   ├── database.py       # Database connection setup
│   └── main.py           # FastAPI application entry point
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── property/         # Property-based tests
├── alembic/              # Database migrations
├── requirements.txt      # Python dependencies
├── pytest.ini            # Pytest configuration
└── .env.example          # Example environment variables

```

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Virtual environment tool (venv, virtualenv, or conda)

### Installation

1. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:

```bash
alembic upgrade head
```

### Running the Application

Start the development server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI): `http://localhost:8000/docs`

## Testing

Run all tests:

```bash
pytest
```

Run specific test types:

```bash
pytest -m unit           # Unit tests only
pytest -m integration    # Integration tests only
pytest -m property       # Property-based tests only
```

Run with coverage:

```bash
pytest --cov=app --cov-report=html
```

### Hypothesis Profiles

Configure Hypothesis testing profiles via environment variable:

```bash
# Development (100 examples)
pytest

# CI (1000 examples)
HYPOTHESIS_PROFILE=ci pytest

# Debug (10 examples, verbose)
HYPOTHESIS_PROFILE=debug pytest
```

## Database Migrations

Create a new migration:

```bash
alembic revision --autogenerate -m "Description of changes"
```

Apply migrations:

```bash
alembic upgrade head
```

Rollback migration:

```bash
alembic downgrade -1
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Merchant registration
- `POST /api/v1/auth/login` - Merchant login

### Merchants
- `GET /api/v1/merchants/me` - Get current merchant profile
- `GET /api/v1/merchants/me/balance` - Get float balance
- `GET /api/v1/merchants/me/transactions` - Get transaction history

### Transactions
- `POST /api/v1/transactions/deposit` - Initiate deposit
- `POST /api/v1/transactions/vending` - Process vending transaction
- `POST /api/v1/transactions/cashout` - Process cashout transaction

### Webhooks
- `POST /api/v1/webhooks/stripe` - Stripe webhook handler

### Products
- `GET /api/v1/products` - List available products

### Commissions
- `GET /api/v1/commissions/daily` - Get daily commission aggregates
- `GET /api/v1/commissions/monthly` - Get monthly commission summary

## Development

### Code Style

This project follows PEP 8 style guidelines. Use type hints for all function signatures.

### Architecture

The application follows a layered architecture:

1. **API Layer** (`app/routers/`): FastAPI route handlers
2. **Service Layer** (`app/services/`): Business logic
3. **Strategy Layer** (`app/strategies/`): Pluggable vendor/payment implementations
4. **Repository Layer** (`app/repositories/`): Data access abstraction
5. **Model Layer** (`app/models.py`): SQLAlchemy ORM models
6. **Schema Layer** (`app/schemas.py`): Pydantic validation models

## License

Proprietary - All rights reserved
