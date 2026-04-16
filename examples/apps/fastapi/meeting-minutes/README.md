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
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── exceptions.py        # Custom exceptions
│   ├── core/                # Core components
│   │   ├── template_parser.py    # Jinja2 variable extraction
│   │   ├── ai_service.py          # Mocked AI data generation
│   │   ├── document_generator.py  # Template rendering
│   │   ├── pdf_converter.py       # PDF conversion
│   │   └── pdf_merger.py          # PDF merging
│   ├── repositories/        # Data access layer
│   │   ├── template_repository.py
│   │   ├── meeting_repository.py
│   │   └── document_repository.py
│   ├── services/            # Business logic layer
│   │   ├── template_service.py
│   │   ├── meeting_service.py
│   │   └── document_service.py
│   ├── routers/             # API route handlers
│   │   ├── templates.py
│   │   ├── meetings.py
│   │   └── documents.py
│   └── utils/               # Utility functions
│       └── validation.py
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
├── .env.example             # Example environment variables
└── IMPLEMENTATION_STATUS.md # Current implementation status
```

## Installation

### Prerequisites

- Python 3.12+
- PostgreSQL 16+
- LibreOffice (for PDF conversion)
- Docker and Docker Compose (for containerized deployment)

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

3. **Install LibreOffice** (required for PDF conversion):
   ```bash
   # macOS
   brew install --cask libreoffice
   
   # Ubuntu/Debian
   sudo apt-get install libreoffice
   
   # Windows
   # Download from https://www.libreoffice.org/download/
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start PostgreSQL** (if not using Docker):
   ```bash
   # Using Docker
   docker run -d \
     --name meeting-minutes-db \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=meeting_minutes \
     -p 5432:5432 \
     postgres:16
   ```

6. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

7. **Create upload directories**:
   ```bash
   mkdir -p /data/uploads/{templates,meetings,documents}
   # Or use a local path and update UPLOAD_DIR in .env
   ```

8. **Start the development server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

9. **Access the API**:
   - API: http://localhost:8000
   - Interactive docs: http://localhost:8000/docs
   - Alternative docs: http://localhost:8000/redoc

### Docker Deployment

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Check service status**:
   ```bash
   docker-compose ps
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f app
   ```

4. **Run migrations** (first time only):
   ```bash
   docker-compose exec app alembic upgrade head
   ```

5. **Stop services**:
   ```bash
   docker-compose down
   ```

6. **Stop and remove volumes**:
   ```bash
   docker-compose down -v
   ```

## Configuration

Environment variables can be set in `.env` file:

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql+asyncpg://postgres:postgres@localhost:5432/meeting_minutes`)
- `UPLOAD_DIR`: Directory for file uploads (default: `/data/uploads`)
- `MAX_UPLOAD_SIZE`: Maximum file upload size in bytes (default: 52428800 = 50MB)
- `LIBREOFFICE_PATH`: Path to LibreOffice executable (default: `soffice`)

For Docker deployment, additional variables in `docker-compose.yml`:
- `DB_PASSWORD`: Database password (default: `postgres`)
- `API_PORT`: API port (default: `8000`)

## API Documentation

Once the server is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### API Endpoints

#### Templates
- `POST /api/v1/templates` - Upload a new template
- `GET /api/v1/templates` - List all templates
- `GET /api/v1/templates/{template_id}` - Get template by ID
- `DELETE /api/v1/templates/{template_id}` - Delete a template

#### Meetings
- `POST /api/v1/meetings` - Create a new meeting
- `GET /api/v1/meetings` - List all meetings
- `GET /api/v1/meetings/{meeting_id}` - Get meeting by ID
- `PUT /api/v1/meetings/{meeting_id}` - Update meeting
- `DELETE /api/v1/meetings/{meeting_id}` - Delete a meeting

#### Template Associations
- `POST /api/v1/meetings/{meeting_id}/templates` - Associate template with meeting
- `GET /api/v1/meetings/{meeting_id}/templates` - Get all associations
- `DELETE /api/v1/meetings/{meeting_id}/templates/{template_id}` - Remove association

#### Data Generation
- `POST /api/v1/meetings/{meeting_id}/generate-ai-data` - Generate AI data
- `POST /api/v1/meetings/{meeting_id}/templates/{template_id}/data` - Submit manual data
- `GET /api/v1/meetings/{meeting_id}/templates/{template_id}/data` - Get filled data

#### Document Generation
- `POST /api/v1/meetings/{meeting_id}/generate-documents` - Generate Word documents
- `POST /api/v1/meetings/{meeting_id}/convert-to-pdf` - Convert to PDFs
- `GET /api/v1/meetings/{meeting_id}/download-pdf` - Download merged PDF

## Usage Example

### Complete Workflow

1. **Upload a template**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/templates" \
     -F "file=@template.docx" \
     -F "name=Meeting Minutes Template" \
     -F "population_type=manual"
   ```

2. **Create a meeting**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/meetings" \
     -F "title=Q1 Planning Meeting" \
     -F "datetime=2024-01-15T10:00:00Z"
   ```

3. **Associate template with meeting**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/meetings/1/templates" \
     -H "Content-Type: application/json" \
     -d '{"template_id": 1, "order_index": 0}'
   ```

4. **Submit data for template**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/meetings/1/templates/1/data" \
     -H "Content-Type: application/json" \
     -d '{"filled_data": {"title": "Q1 Planning", "date": "2024-01-15"}}'
   ```

5. **Generate documents**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/meetings/1/generate-documents"
   ```

6. **Convert to PDF**:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/meetings/1/convert-to-pdf"
   ```

7. **Download merged PDF**:
   ```bash
   curl -X GET "http://localhost:8000/api/v1/meetings/1/download-pdf" \
     -o meeting_minutes.pdf
   ```

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

✅ **Core Implementation Complete**

All required functionality has been implemented:
- ✅ Template management with Jinja2 variable extraction
- ✅ Meeting management with recording support
- ✅ Template associations with AI constraint validation
- ✅ AI data generation (mocked with Faker)
- ✅ Manual data submission with validation
- ✅ Document generation from templates
- ✅ PDF conversion using LibreOffice
- ✅ PDF merging in specified order
- ✅ Complete REST API with error handling
- ✅ Async-first architecture throughout

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for detailed task completion status.

## Architecture

The application follows a layered architecture:

1. **Routes Layer**: FastAPI route handlers (HTTP interface)
2. **Service Layer**: Business logic orchestration
3. **Repository Layer**: Data access abstraction
4. **Core Components**: Specialized processing (parsing, generation, conversion)
5. **Infrastructure**: Database and file storage

All layers use async patterns for non-blocking I/O operations.

## Troubleshooting

### LibreOffice conversion fails
- Ensure LibreOffice is installed and accessible in PATH
- Check that `soffice` command works: `soffice --version`
- In Docker, LibreOffice is pre-installed in the image

### Database connection errors
- Verify PostgreSQL is running
- Check DATABASE_URL in .env matches your database configuration
- Ensure database `meeting_minutes` exists

### File upload errors
- Check UPLOAD_DIR exists and has write permissions
- Verify MAX_UPLOAD_SIZE is sufficient for your files
- Ensure uploaded files are valid .docx format

### Template parsing errors
- Verify template contains Jinja2 variables (e.g., `{{variable}}`)
- Check template is a valid .docx file (not .doc)
- Ensure variables use valid Jinja2 syntax

## License

This is an example application for demonstration purposes.
