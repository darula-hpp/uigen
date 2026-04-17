# Running Meeting Minutes with UIGen

This guide shows you how to run the auto-generated frontend for the Meeting Minutes API using UIGen.

## What is UIGen?

UIGen automatically generates a complete, production-quality frontend from your OpenAPI specification. You get:

- ✅ Sidebar navigation for all resources
- ✅ Table views with sorting, pagination, filtering
- ✅ Create & edit forms with validation
- ✅ Detail views with related resources
- ✅ Delete confirmations
- ✅ Authentication support
- ✅ Dark/light theme toggle
- ✅ Live API calls to your backend

## Prerequisites

1. **FastAPI backend running** on `http://localhost:8000`
2. **UIGen monorepo built** (you're already in it)

## Step 1: Start the FastAPI Backend

In one terminal:

```bash
cd examples/apps/fastapi/meeting-minutes

# Activate virtual environment
source venv/bin/activate

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Verify it's working:
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

## Step 2: Start UIGen Frontend

In another terminal, from the **uigen root directory**:

```bash
# Basic usage
node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml

# With custom port and verbose logging
node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml \
  --port 4400 \
  --proxy-base http://localhost:8000 \
  --verbose
```

You should see:
```
🚀 UIGen starting...
✓ Parsed spec: Meeting Minutes Backend v1.0.0
  Resources: Templates, Meetings, ...
✓ Server running at http://localhost:4400
```

## Step 3: Open the UI

Visit: **http://localhost:4400**

You'll see a fully functional admin interface with:

### Navigation Sidebar
- Templates
- Meetings
- Documents
- Health

### Available Views

#### Templates Resource
- **List View**: See all templates with sorting and pagination
- **Create Form**: Upload new Word templates with Jinja2 variables
- **Detail View**: View template details and extracted schema
- **Delete**: Remove templates with confirmation

#### Meetings Resource
- **List View**: Browse all meetings
- **Create Form**: Create meetings with optional recordings
- **Detail View**: View meeting details
- **Edit Form**: Update meeting metadata
- **Associate Templates**: Link templates to meetings
- **Generate AI Data**: Trigger AI data generation
- **Submit Manual Data**: Fill template variables manually

#### Documents
- **Generate Documents**: Create Word docs from templates
- **Convert to PDF**: Convert documents to PDF
- **Download PDF**: Get merged PDF of all meeting documents

## Command Options

```bash
node packages/cli/dist/index.js serve <spec-path> [options]

Options:
  -p, --port <port>           Port to run on (default: 4400)
  --proxy-base <url>          Backend API URL (default: from spec servers)
  --renderer <renderer>       UI framework: react, vue, svelte (default: react)
  --verbose                   Log detailed request/response info
```

## Examples

### Basic usage (auto-detects backend from spec)
```bash
node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml
```

### Custom port
```bash
node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml --port 3000
```

### Different backend URL
```bash
node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml \
  --proxy-base https://api.production.com
```

### Verbose logging (see all API calls)
```bash
node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml --verbose
```

## How It Works

```
┌─────────────────┐
│   Browser       │
│  localhost:4400 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UIGen Server   │  ← Serves React SPA
│  (Node.js)      │  ← Proxies /api/* to backend
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FastAPI        │
│  localhost:8000 │  ← Your actual API
└─────────────────┘
```

1. **UIGen parses** your `openapi.yaml` into an Intermediate Representation (IR)
2. **React SPA** reads the IR and renders appropriate views
3. **Built-in proxy** forwards API calls from `/api/*` to `http://localhost:8000`
4. **Authentication headers** are automatically injected from the UI

## Updating the OpenAPI Spec

When you make changes to your FastAPI code:

1. **Regenerate the spec**:
   ```bash
   cd examples/apps/fastapi/meeting-minutes
   source venv/bin/activate
   python export_openapi.py
   ```

2. **Restart UIGen** (it will pick up the new spec):
   ```bash
   # Stop with Ctrl+C, then restart
   node packages/cli/dist/index.js serve examples/apps/fastapi/meeting-minutes/openapi.yaml
   ```

## Troubleshooting

### "Proxy error" messages
- **Cause**: FastAPI backend is not running
- **Fix**: Start the backend first (see Step 1)

### "Cannot find module @uigen-dev/react"
- **Cause**: UIGen packages not built
- **Fix**: Run `pnpm install && pnpm build` from the uigen root

### Port already in use
- **Cause**: Another process is using port 4400 or 8000
- **Fix**: Use `--port` flag or kill the other process

### Changes not showing up
- **Cause**: Browser cache or old spec
- **Fix**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or regenerate spec

## Production Deployment

For production, you'd typically:

1. **Export the spec** from your running FastAPI app
2. **Use npx** (no monorepo needed):
   ```bash
   npx @uigen-dev/cli serve openapi.yaml --proxy-base https://api.yourapp.com
   ```

3. Or **generate static build** (coming soon):
   ```bash
   npx @uigen-dev/cli generate openapi.yaml --output ./dist
   ```

## Next Steps

- **Customize the UI**: See UIGen's override system in `packages/react/src/overrides/README.md`
- **Add spec annotations**: Use `x-uigen-label`, `x-uigen-widget` to control rendering
- **Explore authentication**: UIGen supports Bearer, API Key, Basic, and credential-based login

## Resources

- **UIGen Docs**: https://uigen-docs.vercel.app
- **FastAPI Docs**: http://localhost:8000/docs (Swagger UI)
- **FastAPI ReDoc**: http://localhost:8000/redoc
- **OpenAPI Spec**: `examples/apps/fastapi/meeting-minutes/openapi.yaml`
