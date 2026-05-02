# UIGen

> Turn your API into an application. Automatically.

![UIGen Demo](https://github.com/darula-hpp/uigen/raw/main/examples/output.gif)

**⚠️ Disclaimer:** Project not ready for production yet, but we're fast approaching v1.

---

## Getting Started

### Quick Start

```bash
# 1. Initialize a new UIGen project
npx @uigen-dev/cli@latest init my-app

# 2. Navigate to your project
cd my-app

# 3. Start the development server
npx @uigen-dev/cli@latest serve openapi.yaml
```

Visit `http://localhost:4400` to see your app.

**What just happened?**
1. UIGen scaffolded a complete project with:
   - `.uigen/config.yaml` - Configuration file for annotations
   - `.uigen/theme.css` - Custom styling (Tailwind CSS v4)
   - `.uigen/base-styles.css` - Base styles
   - `.agents/skills/` - AI agent skills for automation
   - `openapi.yaml` - Example API spec (if you didn't provide one)
2. The serve command renders a complete UI from your OpenAPI spec at runtime
3. When your API changes, the UI updates automatically - no regeneration, no code to maintain

### Customize with AI Agents (Recommended)

UIGen includes AI agent skills that automate configuration. Use them with your favorite AI coding assistant (Cursor, Windsurf, Cline, etc.):

**Auto-annotate your API** (detects login, file uploads, relationships, etc.):
```
Ask your AI: "Use the auto-annotate skill to configure my OpenAPI spec"
```

**Apply custom styling**:
```
Ask your AI: "Use the applying-styles skill to create a modern dark theme"
```

The skills are located in `.agents/skills/` and contain detailed instructions for AI agents. They eliminate manual configuration by intelligently analyzing your spec and generating the right annotations and styles.

### Manual Configuration (Optional)

If you prefer manual control, use the visual config GUI:

```bash
npx @uigen-dev/cli@latest config openapi.yaml
```

In the Config GUI you can:
- Define relationships between resources
- Customize labels and visibility
- Configure charts and file uploads
- Edit theme CSS visually
- All changes saved to `.uigen/config.yaml`

### Try the Example App

Want to see UIGen in action with a real backend?

```bash
# Clone the repository
git clone https://github.com/darula-hpp/uigen
cd uigen/examples/apps/fastapi/meeting-minutes

# Setup backend (FastAPI + PostgreSQL)
docker compose up -d
docker compose exec app alembic upgrade head

# Initialize UIGen project
npx @uigen-dev/cli@latest init --spec openapi.yaml

# Start the UI
npx @uigen-dev/cli@latest serve openapi.yaml
```

Visit `http://localhost:4400` to explore the meeting minutes application with full CRUD operations, authentication, file uploads, and relationships.

---

## AI Agent Skills

UIGen includes powerful AI agent skills that automate configuration. When you run `uigen init`, these skills are copied to `.agents/skills/` in your project.

### Available Skills

#### 1. Auto-Annotate (`auto-annotate.md`)
Automatically analyzes your OpenAPI spec and applies intelligent annotations:
- **Detects auth endpoints** → Marks login, signup, password reset
- **Detects file uploads** → Configures file types and size limits
- **Detects relationships** → Links foreign keys to resources
- **Detects internal endpoints** → Hides debug/health check endpoints
- **Detects chart opportunities** → Adds visualizations for array data
- **Applies smart labels** → Converts technical names to human-readable

**Usage with AI assistant:**
```
"Use the auto-annotate skill to configure my OpenAPI spec"
```

The AI will read your spec, detect patterns, and write annotations to `.uigen/config.yaml`.

#### 2. Applying Styles (`applying-styles-to-react-spa.md`)
Generates custom CSS for your application:
- **Brand colors** → Applies your color scheme
- **Dark mode** → Full dark theme support
- **Component styling** → Buttons, forms, tables, cards
- **Animations** → Smooth transitions and effects
- **Responsive design** → Mobile, tablet, desktop layouts

**Usage with AI assistant:**
```
"Use the applying-styles skill to create a modern dark theme with blue accents"
```

The AI will generate CSS and write it to `.uigen/theme.css`.

### How It Works

1. **Skills are markdown files** with detailed instructions for AI agents
2. **AI agents read the skills** and follow the workflows
3. **Skills eliminate manual work** by automating pattern detection and configuration
4. **You stay in control** - review changes before committing

### Using Skills with AI Coding Assistants

UIGen skills work with any AI coding assistant that can read files and execute commands:

- **Cursor** - Reference skills with `@.agents/skills/auto-annotate.md`
- **Windsurf** - Ask "Use the auto-annotate skill"
- **Cline** - Provide skill file path in context
- **GitHub Copilot Chat** - Reference skill files in prompts
- **Any AI assistant** - Copy skill content into your prompt

### Example Workflow

```bash
# 1. Initialize project
npx @uigen-dev/cli@latest init my-app --spec openapi.yaml

# 2. Ask AI to auto-annotate
"Use the auto-annotate skill to configure my spec"

# 3. Ask AI to apply styling
"Use the applying-styles skill to create a professional theme"

# 4. Start the server
npx @uigen-dev/cli@latest serve openapi.yaml

# 5. Iterate with AI
"Make the buttons more rounded and add hover animations"
```

The AI reads the skills, understands your OpenAPI spec, and generates the right configuration automatically.

---

## What Just Happened?

UIGen uses **runtime rendering** to transform your OpenAPI spec into a complete, interactive frontend. Unlike code generators, UIGen interprets your spec at runtime - which means your UI stays in sync with API changes automatically. Here's the flow:

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

UIGen reconciles your config with the spec, then parses it into a framework-agnostic Intermediate Representation containing:
- Resources and their relationships
- Operations (CRUD + custom actions)
- Schemas with validation rules
- Authentication flows
- Pagination strategies

The React renderer interprets this IR at runtime (not code generation) and creates:
- **Table views** with sorting, filtering, pagination
- **Create & edit forms** with validation
- **Detail views** with related resource links
- **Search interfaces** from query parameters
- **Authentication flows** (Bearer, API Key, HTTP Basic, credential-based login)
- **Multi-step wizards** for complex forms
- **Custom action buttons** for non-CRUD endpoints
- **Dashboard** with resource overview
- **Dark/light theme** toggle

**Key advantage:** Because UIGen uses runtime rendering instead of code generation, your UI automatically updates when your API changes. No regeneration step, no code to maintain, no drift between spec and UI.

Because the IR is framework-agnostic, you can swap renderers. The same spec works with `@uigen-dev/react`, `@uigen-dev/svelte`, or `@uigen-dev/vue` (coming soon).

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
