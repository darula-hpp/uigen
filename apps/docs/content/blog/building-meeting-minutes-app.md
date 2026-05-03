---
title: "Building a Meeting Minutes App with FastAPI and UIGen"
author: "Olebogeng Mbedzi"
date: "2026-04-19"
excerpt: "Learn how to build a production-ready meeting minutes automation system using FastAPI for the backend and UIGen to auto-generate a complete admin interface from your OpenAPI spec."
tags: ["tutorial", "fastapi", "example-app", "document-generation"]
---

## Introduction

Building admin interfaces is tedious. You write the same CRUD operations over and over: list views with pagination, create forms with validation, edit dialogs, delete confirmations. The backend API is done in a day, but the frontend takes a week.

What if you could skip that week entirely?

This tutorial shows you how to build a complete meeting minutes automation system using FastAPI for the backend and UIGen to auto-generate the frontend. You will build a system that:

- Manages Word document templates with Jinja2 variables
- Creates meetings with optional audio recordings
- Associates templates with meetings in a specific order
- Generates filled documents through AI-assisted or manual data entry
- Converts documents to PDF and merges them into a single file

The backend is ~1500 lines of Python. The frontend is zero lines of code because UIGen generates it automatically from your OpenAPI spec.

By the end of this tutorial, you will have a production-ready application with authentication, file uploads, async processing, database migrations, and a complete admin UI. The full source code is available in the [UIGen repository](https://github.com/uigen-dev/uigen/tree/main/examples/apps/fastapi/meeting-minutes).

---

## What We Are Building

The Meeting Minutes Backend is a REST API that automates document generation workflows. Here is the complete feature set:

### Template Management
- Upload Word documents containing Jinja2 variables like `{{title}}`, `{{date}}`, `{{attendees}}`
- Parse templates to extract variable schemas automatically
- Store templates with metadata: name, description, population type (AI or manual)
- Support for nested variables and complex data structures

### Meeting Management
- Create meetings with title, datetime, and optional audio recordings
- Associate multiple templates with each meeting
- Define template order for final PDF generation
- Track meeting status and generated documents

### Data Population
- **AI-assisted mode**: Generate realistic data using Faker (mocked AI service)
- **Manual mode**: Submit data through validated forms
- Validate data against extracted template schemas
- Support for both simple fields and nested objects

### Document Generation
- Render Jinja2 templates with filled data to produce Word documents
- Convert Word documents to PDF using LibreOffice headless mode
- Merge multiple PDFs in specified order
- Download final merged PDF with all meeting documents

### Architecture Highlights
- **Async-first**: FastAPI async route handlers with SQLAlchemy async sessions
- **Layered design**: Routes → Services → Repositories → Core components
- **Type safety**: Pydantic schemas for request/response validation
- **Database migrations**: Alembic for schema versioning
- **Docker ready**: Complete Docker Compose setup with PostgreSQL

---

## Technology Stack

### Backend
- **FastAPI**: Modern async web framework with automatic OpenAPI generation
- **SQLAlchemy 2.0**: Async ORM with relationship management
- **PostgreSQL 16**: Robust relational database with asyncpg driver
- **Alembic**: Database migration tool
- **docxtpl**: Jinja2 templating for Word documents
- **LibreOffice**: Headless PDF conversion
- **pypdf**: PDF merging

### Frontend (Auto-Generated)
- **UIGen**: Generates complete admin interface from OpenAPI spec
- **React**: Component-based UI framework
- **TanStack Table**: Sortable, paginated data tables
- **React Hook Form**: Form state management
- **Zod**: Runtime validation derived from JSON Schema

---

## Project Structure

The application follows a clean layered architecture:

```
meeting-minutes/
├── app/
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
│   └── routers/             # API route handlers
│       ├── templates.py
│       ├── meetings.py
│       └── documents.py
├── alembic/                 # Database migrations
├── tests/                   # Unit, integration, and property tests
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Docker image definition
├── requirements.txt         # Python dependencies
└── openapi.yaml             # Generated OpenAPI specification
```

Each layer has a clear responsibility:

1. **Routes**: Handle HTTP requests, validate input, return responses
2. **Services**: Orchestrate business logic, coordinate repositories
3. **Repositories**: Abstract database operations, manage transactions
4. **Core**: Specialized processing (parsing, generation, conversion)
5. **Infrastructure**: Database connections, file storage, configuration

---

## Part 1: Setting Up the Backend

### Prerequisites

- Python 3.12+
- PostgreSQL 16+
- LibreOffice (for PDF conversion)
- Docker and Docker Compose (optional)

### Installation

Clone the UIGen repository and navigate to the example app:

```bash
git clone https://github.com/uigen-dev/uigen.git
cd uigen/examples/apps/fastapi/meeting-minutes
```

Create a virtual environment and install dependencies:

```bash
python3.12 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Install LibreOffice for PDF conversion:

```bash
# macOS
brew install --cask libreoffice

# Ubuntu/Debian
sudo apt-get install libreoffice

# Windows
# Download from https://www.libreoffice.org/download/
```

### Database Setup

Start PostgreSQL using Docker:

```bash
docker run -d \
  --name meeting-minutes-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=meeting_minutes \
  -p 5432:5432 \
  postgres:16
```

Or use an existing PostgreSQL installation and create the database:

```sql
CREATE DATABASE meeting_minutes;
```

Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/meeting_minutes
UPLOAD_DIR=/data/uploads
MAX_UPLOAD_SIZE=52428800
LIBREOFFICE_PATH=soffice
```

Run database migrations:

```bash
alembic upgrade head
```

Create upload directories:

```bash
mkdir -p /data/uploads/{templates,meetings,documents}
```

### Start the Backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify it is running:

```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

Access the interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Part 2: Understanding the Data Model

The application uses four main database models with clear relationships:

### Template Model

```python
class Template(Base):
    __tablename__ = "templates"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    population_type: Mapped[str] = mapped_column(String(50), nullable=False)
    schema_json: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    associations: Mapped[List["MeetingTemplateAssociation"]] = relationship(back_populates="template")
```

The `schema_json` field stores the extracted Jinja2 variables as a JSON Schema. This is used for validation and form generation.

### Meeting Model

```python
class Meeting(Base):
    __tablename__ = "meetings"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    datetime: Mapped[datetime] = mapped_column(nullable=False)
    recording_path: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    associations: Mapped[List["MeetingTemplateAssociation"]] = relationship(back_populates="meeting")
    documents: Mapped[List["Document"]] = relationship(back_populates="meeting")
```

### MeetingTemplateAssociation Model

This is the join table that links meetings to templates with additional metadata:

```python
class MeetingTemplateAssociation(Base):
    __tablename__ = "meeting_template_associations"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    template_id: Mapped[int] = mapped_column(ForeignKey("templates.id", ondelete="CASCADE"))
    order_index: Mapped[int] = mapped_column(nullable=False)
    filled_data: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    meeting: Mapped["Meeting"] = relationship(back_populates="associations")
    template: Mapped["Template"] = relationship(back_populates="associations")
```

The `order_index` determines the order of templates in the final merged PDF. The `filled_data` stores the actual values for template variables.

### Document Model

```python
class Document(Base):
    __tablename__ = "documents"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    template_id: Mapped[int] = mapped_column(ForeignKey("templates.id", ondelete="CASCADE"))
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    meeting: Mapped["Meeting"] = relationship(back_populates="documents")
```

---

## Part 3: Core Components

### Template Parser

The template parser extracts Jinja2 variables from Word documents and generates a JSON Schema:

```python
class TemplateParser:
    def parse_template(self, file_path: Path) -> dict:
        """Extract Jinja2 variables from a Word document."""
        doc = DocxTemplate(file_path)
        variables = doc.get_undeclared_template_variables()
        
        schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        for var in variables:
            # Infer type from variable name patterns
            if any(keyword in var.lower() for keyword in ['date', 'time']):
                var_type = "string"
                var_format = "date-time"
            elif any(keyword in var.lower() for keyword in ['email']):
                var_type = "string"
                var_format = "email"
            elif any(keyword in var.lower() for keyword in ['count', 'number', 'total']):
                var_type = "integer"
            else:
                var_type = "string"
            
            schema["properties"][var] = {"type": var_type}
            if var_format:
                schema["properties"][var]["format"] = var_format
        
        return schema
```

This schema is stored in the database and used for validation when users submit data.

### Document Generator

The document generator renders Jinja2 templates with filled data:

```python
class DocumentGenerator:
    async def generate_document(
        self,
        template_path: Path,
        filled_data: dict,
        output_path: Path
    ) -> Path:
        """Render a Jinja2 template with filled data."""
        try:
            doc = DocxTemplate(template_path)
            doc.render(filled_data)
            doc.save(output_path)
            return output_path
        except Exception as e:
            raise RenderError(f"Failed to render template: {str(e)}")
```

### PDF Converter

The PDF converter uses LibreOffice in headless mode:

```python
class PDFConverter:
    async def convert_to_pdf(self, docx_path: Path, output_dir: Path) -> Path:
        """Convert a Word document to PDF using LibreOffice."""
        try:
            process = await asyncio.create_subprocess_exec(
                self.libreoffice_path,
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', str(output_dir),
                str(docx_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise ConversionError(f"LibreOffice conversion failed: {stderr.decode()}")
            
            pdf_path = output_dir / f"{docx_path.stem}.pdf"
            return pdf_path
        except Exception as e:
            raise ConversionError(f"PDF conversion failed: {str(e)}")
```

### PDF Merger

The PDF merger combines multiple PDFs in the specified order:

```python
class PDFMerger:
    async def merge_pdfs(self, pdf_paths: List[Path], output_path: Path) -> Path:
        """Merge multiple PDFs into a single file."""
        try:
            merger = PdfMerger()
            
            for pdf_path in pdf_paths:
                merger.append(str(pdf_path))
            
            merger.write(str(output_path))
            merger.close()
            
            return output_path
        except Exception as e:
            raise MergeError(f"PDF merge failed: {str(e)}")
```

---

## Part 4: API Endpoints

The API is organized into three main routers:

### Templates Router

```python
@router.post("/api/v1/templates", response_model=TemplateResponse)
async def create_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    population_type: str = Form("manual"),
    service: TemplateService = Depends(get_template_service)
):
    """Upload a new template and extract its schema."""
    return await service.create_template(file, name, description, population_type)

@router.get("/api/v1/templates", response_model=List[TemplateResponse])
async def list_templates(
    skip: int = 0,
    limit: int = 100,
    service: TemplateService = Depends(get_template_service)
):
    """List all templates with pagination."""
    return await service.list_templates(skip, limit)

@router.get("/api/v1/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    service: TemplateService = Depends(get_template_service)
):
    """Get a specific template by ID."""
    return await service.get_template(template_id)

@router.delete("/api/v1/templates/{template_id}")
async def delete_template(
    template_id: int,
    service: TemplateService = Depends(get_template_service)
):
    """Delete a template."""
    await service.delete_template(template_id)
    return {"message": "Template deleted successfully"}
```

### Meetings Router

```python
@router.post("/api/v1/meetings", response_model=MeetingResponse)
async def create_meeting(
    title: str = Form(...),
    datetime: datetime = Form(...),
    recording: Optional[UploadFile] = File(None),
    service: MeetingService = Depends(get_meeting_service)
):
    """Create a new meeting."""
    return await service.create_meeting(title, datetime, recording)

@router.post("/api/v1/meetings/{meeting_id}/templates")
async def associate_template(
    meeting_id: int,
    association: AssociationCreate,
    service: MeetingService = Depends(get_meeting_service)
):
    """Associate a template with a meeting."""
    return await service.associate_template(meeting_id, association)

@router.post("/api/v1/meetings/{meeting_id}/generate-ai-data")
async def generate_ai_data(
    meeting_id: int,
    service: MeetingService = Depends(get_meeting_service)
):
    """Generate AI data for all associated templates."""
    return await service.generate_ai_data(meeting_id)

@router.post("/api/v1/meetings/{meeting_id}/templates/{template_id}/data")
async def submit_manual_data(
    meeting_id: int,
    template_id: int,
    data: DataSubmission,
    service: MeetingService = Depends(get_meeting_service)
):
    """Submit manual data for a template."""
    return await service.submit_manual_data(meeting_id, template_id, data.filled_data)
```

### Documents Router

```python
@router.post("/api/v1/meetings/{meeting_id}/generate-documents")
async def generate_documents(
    meeting_id: int,
    service: DocumentService = Depends(get_document_service)
):
    """Generate Word documents for all templates in a meeting."""
    return await service.generate_documents(meeting_id)

@router.post("/api/v1/meetings/{meeting_id}/convert-to-pdf")
async def convert_to_pdf(
    meeting_id: int,
    service: DocumentService = Depends(get_document_service)
):
    """Convert all documents to PDF."""
    return await service.convert_to_pdf(meeting_id)

@router.get("/api/v1/meetings/{meeting_id}/download-pdf")
async def download_pdf(
    meeting_id: int,
    service: DocumentService = Depends(get_document_service)
):
    """Download the merged PDF."""
    pdf_path = await service.get_merged_pdf(meeting_id)
    return FileResponse(pdf_path, media_type="application/pdf", filename="meeting_minutes.pdf")
```

---

## Part 5: Generating the OpenAPI Spec

FastAPI automatically generates an OpenAPI specification from your route definitions. Export it to a file:

```python
# export_openapi.py
import json
import yaml
from app.main import app

if __name__ == "__main__":
    openapi_schema = app.openapi()
    
    # Export as JSON
    with open("openapi.json", "w") as f:
        json.dump(openapi_schema, f, indent=2)
    
    # Export as YAML
    with open("openapi.yaml", "w") as f:
        yaml.dump(openapi_schema, f, sort_keys=False)
    
    print("OpenAPI spec exported to openapi.json and openapi.yaml")
```

Run the export script:

```bash
python export_openapi.py
```

This generates `openapi.yaml` with complete documentation of all endpoints, request/response schemas, and validation rules.

---

## Part 6: Auto-Generating the Frontend with UIGen

Now comes the magic. With your backend running and the OpenAPI spec generated, you can create a complete admin interface with a single command.

### Install UIGen

If you are in the UIGen monorepo:

```bash
# From the uigen root directory
pnpm install
pnpm build
```

If you are using UIGen as a standalone tool:

```bash
npm install -g @uigen-dev/cli
```

### Start the UIGen Frontend

From the UIGen root directory:

```bash
node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml
```

Or if installed globally:

```bash
uigen serve openapi.yaml --proxy-base http://localhost:8000
```

UIGen starts a development server at http://localhost:4400 and opens your browser automatically.

### What You Get

The generated UI includes:

**Navigation Sidebar** with all resources:
- Templates
- Meetings
- Documents
- Health

**Templates Resource:**
- **List View**: Sortable table with all templates, pagination controls
- **Create Form**: File upload for Word documents, text inputs for name and description
- **Detail View**: Template metadata and extracted schema visualization
- **Delete**: Confirmation dialog with cascade warning

**Meetings Resource:**
- **List View**: All meetings with title, datetime, and status
- **Create Form**: Title input, datetime picker, optional recording upload
- **Detail View**: Meeting details with associated templates
- **Edit Form**: Update meeting metadata
- **Associate Templates**: Dropdown to select templates, order index input
- **Generate AI Data**: Button to trigger AI data generation
- **Submit Manual Data**: Dynamic form based on template schema

**Documents:**
- **Generate Documents**: Button to create Word docs from templates
- **Convert to PDF**: Button to convert all documents
- **Download PDF**: Download link for merged PDF

**Authentication:**
- Login form (if auth endpoints are detected)
- Token management
- Automatic token refresh

**Theme Toggle:**
- Dark/light mode switch
- Persisted in local storage

All of this is generated automatically from your OpenAPI spec. No React code. No form definitions. No table configurations. UIGen infers everything from the spec structure.

---

## Part 7: Complete Workflow Example

Let's walk through a complete workflow using the generated UI:

### Step 1: Upload a Template

1. Navigate to **Templates** in the sidebar
2. Click **Create Template**
3. Upload a Word document with Jinja2 variables:
   ```
   Meeting Title: {{title}}
   Date: {{date}}
   Attendees: {{attendees}}
   Agenda: {{agenda}}
   ```
4. Enter name: "Standard Meeting Minutes"
5. Select population type: "manual"
6. Click **Submit**

UIGen automatically:
- Validates the file type
- Shows upload progress
- Displays the created template in the list
- Shows the extracted schema in the detail view

### Step 2: Create a Meeting

1. Navigate to **Meetings**
2. Click **Create Meeting**
3. Enter title: "Q1 Planning Meeting"
4. Select datetime: "2026-04-20 10:00:00"
5. Optionally upload a recording
6. Click **Submit**

### Step 3: Associate Template with Meeting

1. Open the meeting detail view
2. Click **Associate Template**
3. Select "Standard Meeting Minutes" from dropdown
4. Enter order index: 0
5. Click **Associate**

### Step 4: Submit Data

1. In the meeting detail view, find the associated template
2. Click **Submit Data**
3. Fill the dynamic form:
   - Title: "Q1 Planning Meeting"
   - Date: "April 20, 2026"
   - Attendees: "Alice, Bob, Charlie"
   - Agenda: "Budget review, project updates, Q2 planning"
4. Click **Submit**

UIGen validates the data against the template schema before submission.

### Step 5: Generate Documents

1. Click **Generate Documents** in the meeting detail view
2. Wait for processing (shows progress indicator)
3. Documents appear in the documents list

### Step 6: Convert to PDF

1. Click **Convert to PDF**
2. Wait for LibreOffice conversion
3. PDF paths appear in the document list

### Step 7: Download Merged PDF

1. Click **Download PDF**
2. Browser downloads `meeting_minutes.pdf`
3. Open the PDF to see all templates merged in order

All of these interactions are handled by the auto-generated UI. The forms validate input, the tables sort and paginate, the file uploads show progress, and errors are displayed with clear messages.

---

## Part 8: Customizing the Generated UI

UIGen provides several ways to customize the generated interface without modifying your spec file.

### Using AI to Configure (Recommended)

The fastest way to customize UIGen is using AI agents:

```bash
# Start the server
uigen serve openapi.yaml

# Tell an AI agent what you want:
# "Hide User.password field and internal endpoints"
# "Rename template_id to Template, meeting_id to Meeting, order_index to Display Order"
# "Mark POST /auth/login as the login endpoint"
# "MeetingTemplateAssociation.template_id is a foreign key to Template"
# "MeetingTemplateAssociation.meeting_id is a foreign key to Meeting"

# AI writes to .uigen/config.yaml
# Refresh browser to see changes
```

AI understands UIGen's configuration system and can:
- Hide sensitive fields
- Customize labels
- Mark authentication endpoints
- Define relationships between resources
- Generate styling

All in seconds, without clicking through a GUI.

### Visualizing with Config GUI (Optional)

If you want to see what AI generated or make manual adjustments:

```bash
uigen config openapi.yaml
```

This opens a GUI at http://localhost:4401 where you can visualize and adjust AI-generated configuration.

### Adding Spec Annotations

You can also add annotations directly to your FastAPI route definitions:

```python
@router.post(
    "/api/v1/auth/login",
    response_model=TokenResponse,
    openapi_extra={"x-uigen-login": True}
)
async def login(credentials: LoginRequest):
    """Authenticate user and return access token."""
    return await auth_service.login(credentials)
```

Or in the exported OpenAPI spec:

```yaml
paths:
  /api/v1/auth/login:
    post:
      x-uigen-login: true
      summary: User login
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
```

---

## Part 9: Deployment

### Docker Deployment

The application includes a complete Docker Compose setup:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: meeting_minutes
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/meeting_minutes
      UPLOAD_DIR: /data/uploads
    volumes:
      - upload_data:/data/uploads
    depends_on:
      - db

volumes:
  postgres_data:
  upload_data:
```

Deploy with:

```bash
docker-compose up -d
docker-compose exec app alembic upgrade head
```

### Production Considerations

**Environment variables:**
- Use strong database passwords
- Configure `MAX_UPLOAD_SIZE` based on your needs
- Set `LIBREOFFICE_PATH` to the correct binary location

**File storage:**
- Use object storage (S3, GCS) instead of local filesystem
- Implement file cleanup policies for old documents

**Authentication:**
- Add JWT authentication to protect endpoints
- Use `x-uigen-login` annotation to generate login form

**Rate limiting:**
- Add rate limiting middleware to prevent abuse
- Limit file upload frequency per user

**Monitoring:**
- Add health check endpoints
- Log all document generation operations
- Monitor LibreOffice conversion failures

---

## Part 10: Testing

The application includes comprehensive tests:

### Unit Tests

```bash
pytest tests/unit/
```

Tests for individual components:
- Template parser variable extraction
- Document generator rendering
- PDF converter LibreOffice integration
- PDF merger file handling

### Integration Tests

```bash
pytest tests/integration/
```

Tests for complete workflows:
- Template upload and schema extraction
- Meeting creation with associations
- AI data generation
- Manual data submission and validation
- Document generation pipeline
- PDF conversion and merging

### Property-Based Tests

```bash
pytest tests/property/
```

Uses Hypothesis to test edge cases:
- Random Jinja2 variable patterns
- Various data type combinations
- Large file uploads
- Concurrent operations

---

## Conclusion

You have built a complete meeting minutes automation system with:

- **Backend**: ~1500 lines of well-structured Python with FastAPI
- **Frontend**: 0 lines of code, auto-generated by UIGen
- **Database**: PostgreSQL with migrations
- **Document processing**: Template parsing, rendering, PDF conversion, merging
- **Deployment**: Docker Compose setup ready for production

The key insight is that a well-designed API with a good OpenAPI spec contains all the information needed to generate a complete admin interface. UIGen extracts that information and renders it as a functional UI.

This approach has several advantages:

**Faster development**: Skip weeks of frontend work
**Consistency**: The UI always matches the API
**Maintainability**: Update the API, regenerate the UI
**Type safety**: Validation rules flow from spec to forms
**Customization**: Use config files or annotations without forking

The full source code is available in the [UIGen repository](https://github.com/uigen-dev/uigen/tree/main/examples/apps/fastapi/meeting-minutes). Clone it, run it, and adapt it to your needs.

If you want to build your own API with auto-generated UI:

```bash
# Install UIGen
npm install -g @uigen-dev/cli

# Build your FastAPI app
# Export the OpenAPI spec
# Generate the UI
uigen serve openapi.yaml
```

That is it. No frontend code required.

---

## Next Steps

**Extend the application:**
- Add user authentication with JWT
- Implement role-based access control
- Add email notifications when documents are ready
- Support for multiple document formats (Markdown, HTML)
- Real AI integration (OpenAI, Anthropic) instead of Faker

**Customize the UI:**
- Use AI to hide internal fields and customize labels
- Define relationships between resources with natural language
- Generate custom themes with AI styling
- Visualize configuration in the config GUI if needed

**Deploy to production:**
- Set up CI/CD pipeline
- Configure object storage for files
- Add monitoring and logging
- Implement backup strategies

**Contribute to UIGen:**
- Report bugs or request features on GitHub
- Submit PRs for new annotations or renderers
- Share your use cases and feedback

The meeting minutes app demonstrates what is possible when you combine a well-designed API with automatic UI generation. Build your API, export the spec, and let UIGen handle the rest.

```bash
# Try it now
git clone https://github.com/uigen-dev/uigen.git
cd uigen/examples/apps/fastapi/meeting-minutes
source venv/bin/activate
uvicorn app.main:app --reload

# In another terminal
cd uigen
node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml
```

Visit http://localhost:4400 and explore the auto-generated interface.
