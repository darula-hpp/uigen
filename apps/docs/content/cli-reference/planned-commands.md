---
title: Planned Commands
description: CLI commands coming in a future release.
---

# Planned Commands

The following CLI commands are planned for a future release. They are not yet available.

> **Coming Soon**: these commands are not implemented yet.

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

Generate a static production build of the UI.

**Planned usage:**

```bash
uigen generate ./openapi.yaml --out ./dist
```

**Planned output:**

```
✓ Parsed spec: Petstore API v1.0.0
✓ Generated static build → ./dist/
```

The output will be a self-contained directory of static files that can be deployed to any static hosting service (Vercel, Netlify, S3, etc.).

## Timeline

Both commands are part of Phase 3 of the UIGen roadmap. See the [Roadmap](/docs/roadmap/index) for the full plan.
