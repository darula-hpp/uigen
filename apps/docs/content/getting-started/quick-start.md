---
title: Quick Start
description: Run UIGen against your OpenAPI spec in under a minute.
---

# Quick Start

The fastest way to try UIGen is with `npx` (no installation required).

## Step 1: Run the CLI

Point UIGen at any OpenAPI 3.x or Swagger 2.0 spec file:

```bash
npx @uigen-dev/cli serve ./openapi.yaml
```

You should see output like:

```
🚀 UIGen starting...

Reading spec: ./openapi.yaml
✓ Parsed spec: Petstore API v1.0.0
  Resources: pets, users

API proxy target: http://localhost:3000

✓ Server running at http://localhost:4400

Press Ctrl+C to stop
```

## Step 2: Open the browser

Navigate to [http://localhost:4400](http://localhost:4400). UIGen serves a complete React SPA with:

- A sidebar listing all resources detected from your spec
- A dashboard overview with resource counts
- Fully functional list, detail, create, edit, and delete views

## Step 3: Navigate the generated UI

Click any resource in the sidebar to open its list view. From there you can:

- Browse records fetched live from your API
- Click a row to open the detail view
- Use the **New** button to open the create form
- Edit or delete records inline

## Using a remote spec

UIGen also accepts a URL:

```bash
npx @uigen-dev/cli serve https://petstore3.swagger.io/api/v3/openapi.json
```

## Custom port

```bash
npx @uigen-dev/cli serve ./openapi.yaml --port 8080
```

## Custom proxy base

If your API runs on a different host than what's declared in the spec's `servers` field:

```bash
npx @uigen-dev/cli serve ./openapi.yaml --proxy-base http://localhost:3001
```

## Next steps

- [Installation](/docs/getting-started/installation): install packages for programmatic use
- [CLI Reference](/docs/cli-reference/serve): all available flags
- [Authentication](/docs/authentication/overview): how UIGen handles auth
