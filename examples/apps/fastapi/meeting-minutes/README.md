# Meeting Minutes Backend

A FastAPI-based REST API service that automates the generation of meeting minutes documents. The system accepts Word document templates containing Jinja2 variables, manages meetings with associated recordings, and generates filled documents through either AI-assisted (mocked with faker) or manual data entry.

## Features

- **Template Management**: Upload, store, and parse Word documents with Jinja2 variables
- **Meeting Management**: Create and manage meeting records with optional audio recordings
- **Data Population**: Support both AI-generated (mocked) and manual data entry workflows
- **Document Generation**: Render Jinja2 templates with filled data to produce Word documents
- **PDF Operations**: Convert Word documents to PDF and merge multiple PDFs in specified order
- **Async-First Architecture**: Leverage FastAPI and SQLAlchemy async patterns for high concurrency

## Technology Stack

- **Framework**: FastAPI (async route handlers)
- **Database**: PostgreSQL 16 with asyncpg driver
- **ORM**: SQLAlchemy 2.0 (async sessions)
- **Migrations**: Alembic
- **Template Engine**: docxtpl (Jinja2 for Word documents)
- **PDF Conversion**: LibreOffice headless mode
- **PDF Merging**: pypdf
- **Deployment**: Docker Compose

## Project Structure

```
meeting-minutes/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Application configuration
│   ├── database.py          # Database connection and session management
│   ├── models.py            # SQLAlchemy models (to be created)
│   ├── schemas.py           # Pydantic schemas (to be created)
│   ├── core/                # Core components (parsers, generators, etc.)
│   ├── repositories/        # Data access layer
│   ├── services/            # Business logic layer
│   └── routers/             # API route handlers
├── alembic/
│   ├── versions/            # Database migration scripts
│   └── env.py               # Alembic environment configuration
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── property/            # Property-based tests
├── requirements.txt         # Python dependencies
├── alembic.ini              # Alembic configuration
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Docker image definition
└── .env.example             # Example environment variables
```

## Installation

### Local Development

1. **Create a virtual environment**:
   ```bash
   python3.12 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations** (requires PostgreSQL running):
   ```bash
   alembic upgrade head
   ```

5. **Start the development server**:
   ```bash
   uvicorn app.main:app --reload
   ```

### Docker Deployment

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **View logs**:
   ```bash
   docker-compose logs -f app
   ```

3. **Stop services**:
   ```bash
   docker-compose down
   ```

## Configuration

Environment variables can be set in `.env` file:

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql+asyncpg://postgres:postgres@localhost:5432/meeting_minutes`)
- `UPLOAD_DIR`: Directory for file uploads (default: `/data/uploads`)
- `MAX_UPLOAD_SIZE`: Maximum file upload size in bytes (default: 52428800 = 50MB)
- `LIBREOFFICE_PATH`: Path to LibreOffice executable (default: `soffice`)
- `DB_PASSWORD`: Database password for Docker deployment (default: `postgres`)
- `API_PORT`: API port for Docker deployment (default: `8000`)

## API Documentation

Once the server is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database Migrations

### Create a new migration

```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations

```bash
alembic upgrade head
```

### Rollback migrations

```bash
alembic downgrade -1  # Rollback one migration
alembic downgrade base  # Rollback all migrations
```

## Testing

Run tests with pytest:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test types
pytest tests/unit/
pytest tests/integration/
pytest tests/property/
```

## Development Status

This project is currently under development. The following tasks have been completed:

- [x] Task 1.1: Initialize FastAPI project structure
- [x] Task 1.2: Configure database connection and session management
- [x] Task 1.3: Set up Alembic for database migrations
- [x] Task 1.4: Create Docker configuration

## License

This is an example application for demonstration purposes.
