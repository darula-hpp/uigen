# UIGen

> Turn your API into an application. Automatically.

![UIGen Demo](https://github.com/darula-hpp/uigen/raw/main/examples/output.gif)

**⚠️ Disclaimer:** Project not ready for production yet, but we're fast approaching v1.

---

## Getting Started

### Quick Start

```bash
# Initialize a new UIGen project
npx @uigen-dev/cli@latest init my-app

# Navigate to your project
cd my-app

# Start the development server
npx @uigen-dev/cli@latest serve openapi.yaml
```

Visit `http://localhost:4400` to see your app.

UIGen scaffolds a complete project with configuration files (`.uigen/config.yaml`, `.uigen/theme.css`), AI agent skills (`.agents/skills/`), and an example spec if needed. The serve command renders a complete UI from your OpenAPI spec at runtime. When your API changes, the UI updates automatically with no regeneration or code maintenance required.

### Configuration Options

**Option 1: AI-Powered (Recommended)**

Use AI agent skills with your favorite coding assistant (Cursor, Windsurf, Cline, etc.):

```
Ask your AI: "Use the auto-annotate skill to configure my OpenAPI spec"
Ask your AI: "Use the applying-styles skill to create a modern dark theme"
```

Skills are located in `.agents/skills/` and automate pattern detection, annotation generation, and styling.

**Option 2: Visual Config GUI**

```bash
npx @uigen-dev/cli@latest config openapi.yaml
```

Define relationships, customize labels, configure charts and file uploads, edit theme CSS visually. All changes saved to `.uigen/config.yaml`.

### Try the Example App

```bash
git clone https://github.com/darula-hpp/uigen
cd uigen/examples/apps/fastapi/meeting-minutes

# Setup backend (FastAPI + PostgreSQL)
docker compose up -d
docker compose exec app alembic upgrade head

# Initialize and start
npx @uigen-dev/cli@latest init --spec openapi.yaml
npx @uigen-dev/cli@latest serve openapi.yaml --proxy-base http://localhost:8000
```

Visit `http://localhost:4400` to explore a full meeting minutes application with CRUD operations, authentication, file uploads, and relationships.

---

## AI Agent Skills

UIGen includes AI agent skills that automate configuration through intelligent analysis of your OpenAPI spec.

### Available Skills

**Auto-Annotate** (`auto-annotate.md`)
- Detects auth endpoints (login, signup, password reset)
- Configures file uploads (types, size limits)
- Links relationships (foreign keys to resources)
- Hides internal endpoints (debug, health checks)
- Adds chart visualizations for array data
- Applies smart labels (technical names to human-readable)

**Applying Styles** (`applying-styles-to-react-spa.md`)
- Brand colors and dark mode support
- Component styling (buttons, forms, tables, cards)
- Animations and transitions
- Responsive design (mobile, tablet, desktop)

### Usage

Skills work with any AI coding assistant that can read files:

- **Cursor**: Reference with `@.agents/skills/auto-annotate.md`
- **Windsurf**: Ask "Use the auto-annotate skill"
- **Cline**: Provide skill file path in context
- **GitHub Copilot Chat**: Reference skill files in prompts

Example workflow:
```bash
npx @uigen-dev/cli@latest init my-app --spec openapi.yaml
# Ask AI: "Use the auto-annotate skill to configure my spec"
# Ask AI: "Use the applying-styles skill to create a professional theme"
npx @uigen-dev/cli@latest serve openapi.yaml
```

---

## How It Works

UIGen uses **runtime rendering** to transform your OpenAPI spec into a complete, interactive frontend. Unlike code generators, UIGen interprets your spec at runtime, keeping your UI automatically in sync with API changes.

```
CLI Command
    |
    v
+----------------+     +----------------+     +----------+     +------+     +--------+     +--------------+
| API Document   |---->| Reconciler     |---->| Adapter  |---->|  IR  |---->| Engine |---->|  React SPA   |
| (YAML/JSON)    |     | (Config Merge) |     | (Parser) |     |      |     |        |     | (served)     |
+----------------+     +----------------+     +----------+     +------+     +--------+     +--------------+
       |                      ^                                                                    |
       |                      |                                                          +---------+
       |               +----------------+                                                v
       |               | Config File    |                                          +-----------+
       |               | (.uigen/       |                                          | API Proxy |---> Real API
       |               |  config.yaml)  |                                          +-----------+
       |               +----------------+
       |
       +---> (Source spec unchanged on disk)
```

UIGen reconciles your config with the spec, then parses it into a framework-agnostic Intermediate Representation (IR) containing resources, operations, schemas, authentication flows, and pagination strategies.

The React renderer interprets this IR at runtime and creates:
- Table views with sorting, filtering, pagination
- Create & edit forms with validation
- Detail views with related resource links
- Search interfaces from query parameters
- Authentication flows (Bearer, API Key, HTTP Basic, credential-based login)
- Multi-step wizards for complex forms
- Custom action buttons for non-CRUD endpoints
- Dashboard with resource overview
- Dark/light theme toggle

**Key advantage:** Runtime rendering means no regeneration step, no code to maintain, no drift between spec and UI. Because the IR is framework-agnostic, you can swap renderers. The same spec works with `@uigen-dev/react`, `@uigen-dev/svelte`, or `@uigen-dev/vue` (coming soon).

---

## Read More

- **[Full Documentation](https://uigen-docs.vercel.app)** - Complete guides, API reference, and examples
- **[Architecture](./ARCHITECTURE.md)** - Deep dive into the IR, adapters, and rendering pipeline

---

## Current Priorities
- Better handling of resources and their relationships
- Layout Config

## License

MIT
