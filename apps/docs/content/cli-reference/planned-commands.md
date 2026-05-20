---
title: Planned Commands
description: CLI commands coming in a future release.
---

# Planned Commands

The following CLI commands are planned for a future release. They are not yet available.

> **Note:** `uigen build` is already available. It packages your `.uigen/` directory, spec, and overrides for deployment. See [uigen build](/docs/cli-reference/build).

## `uigen validate`

Validate a spec for UIGen compatibility and report actionable errors.

**Planned usage:**

```bash
uigen validate ./openapi.yaml
```

**Planned output:**

```
✓ Parsed spec: Petstore API v1.0.0
  Resources: pets, users

⚠ 2 warnings found:

  1. GET /pets: no response schema defined (line 42)
     UIGen will render a generic key-value table.

  2. POST /pets: requestBody missing 'required' field (line 67)
     All fields will be treated as optional.
```

The `validate` command will exit with a non-zero code if any errors are found, making it suitable for use in CI pipelines.

## `uigen generate`

Generate a static production build of the UI as self-contained HTML/JS/CSS files.

**Planned usage:**

```bash
uigen generate ./openapi.yaml --out ./dist
```

**Planned output:**

```
✓ Parsed spec: Petstore API v1.0.0
✓ Generated static build → ./dist/
```

The output will be a directory of static files deployable to any static hosting service (Vercel, Netlify, S3, etc.) without running the UIGen CLI at runtime.

This differs from [`uigen build`](/docs/cli-reference/build), which copies project assets into a folder you still serve with `uigen serve`.

## Timeline

Both commands are part of Phase 3 of the UIGen roadmap. See the [Roadmap](/docs/roadmap/index) for the full plan.

## Available today

| Command | Description |
|---|---|
| [`uigen init`](/docs/cli-reference/init) | Scaffold a new project |
| [`uigen serve`](/docs/cli-reference/serve) | Start the generated UI |
| [`uigen config`](/docs/cli-reference/config) | Visual annotation GUI |
| [`uigen build`](/docs/cli-reference/build) | Package project for deployment |
