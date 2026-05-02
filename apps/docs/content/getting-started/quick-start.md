---
title: Quick Start
description: Create a UIGen project and run it in under a minute.
---

# Quick Start

The fastest way to get started with UIGen is using the `init` command (no installation required).

## Step 1: Initialize a project

Create a new UIGen project with a single command:

```bash
npx @uigen-dev/cli init my-admin-ui
```

You'll be prompted for:
- Path to your existing OpenAPI spec (optional)
- Whether to initialize a git repository

Or skip prompts with the `-y` flag:

```bash
npx @uigen-dev/cli init my-admin-ui -y
```

You should see output like:

```
✨ UIGen Project Initialization

Creating project: my-admin-ui

✓ Created directory structure
✓ Copied AI agent skills
✓ Copied base styles
✓ Created configuration files
✓ Git repository initialized

✨ Created UIGen project: my-admin-ui

📁 Project structure:
   ├── .git/
   ├── .gitignore
   ├── .agents/skills/
   ├── .uigen/
   │   ├── config.yaml
   │   ├── base-styles.css
   │   └── theme.css
   ├── openapi.yaml
   ├── annotations.json
   └── README.md

✓ Git repository initialized
✓ AI agent skills installed
✓ Base styles copied
✓ Configuration scaffolded

🚀 Next steps:

   cd my-admin-ui
   uigen serve openapi.yaml
```

## Step 2: Start the development server

Navigate to your project and start the server:

```bash
cd my-admin-ui
npx @uigen-dev/cli serve openapi.yaml
```

The server will start at [http://localhost:4400](http://localhost:4400).

## Step 3: Open the browser

Navigate to [http://localhost:4400](http://localhost:4400). UIGen serves a complete React SPA with:

- A sidebar listing all resources detected from your spec
- A dashboard overview with resource counts
- Fully functional list, detail, create, edit, and delete views

## Step 4: Navigate the generated UI

Click any resource in the sidebar to open its list view. From there you can:

- Browse records fetched live from your API
- Click a row to open the detail view
- Use the **New** button to open the create form
- Edit or delete records inline

## Alternative: Quick test without init

If you just want to quickly test UIGen with an existing spec:

```bash
npx @uigen-dev/cli serve ./openapi.yaml
```

Or with a remote spec:

```bash
npx @uigen-dev/cli serve https://petstore3.swagger.io/api/v3/openapi.json
```

## Customization

### Open the config GUI

Visually configure annotations and settings:

```bash
npx @uigen-dev/cli config openapi.yaml
```

Opens at [http://localhost:4401](http://localhost:4401) with a drag-and-drop interface.

### Auto-annotate with AI

Use the included AI agent skill to automatically add UIGen annotations:

1. Open your AI agent (Kiro, Claude, ChatGPT, etc.)
2. Ask: "Use the auto-annotate skill to add UIGen annotations to my OpenAPI spec"
3. The agent will read `.agents/skills/auto-annotate.md` and intelligently annotate your spec

### Customize the theme

Edit `.uigen/theme.css` to match your brand:

```css
:root {
  --primary-color: #your-brand-color;
  --font-family: 'Your Font', sans-serif;
}
```

## Custom options

### Custom port

```bash
npx @uigen-dev/cli serve openapi.yaml --port 8080
```

### Custom proxy base

If your API runs on a different host than what's declared in the spec's `servers` field:

```bash
npx @uigen-dev/cli serve openapi.yaml --proxy-base http://localhost:3001
```

### Verbose logging

```bash
npx @uigen-dev/cli serve openapi.yaml --verbose
```

## Next steps

- [CLI Reference: init](/docs/cli-reference/init): all init command options
- [CLI Reference: serve](/docs/cli-reference/serve): all serve command flags
- [CLI Reference: config](/docs/cli-reference/config): visual configuration GUI
- [Authentication](/docs/authentication/overview): how UIGen handles auth
- [Annotations](/docs/spec-annotations/overview): customize the generated UI
