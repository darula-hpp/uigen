---
title: AI Agent Skills
description: Use built-in AI skills to auto-configure auth, charts, WebSockets, themes, and more from your OpenAPI spec.
---

# AI Agent Skills

UIGen scaffolds AI agent skills into every project at `init` time (`.agents/skills/`). Skills teach coding assistants how to write `.uigen/config.yaml` and `.uigen/theme.css` without manual GUI work.

Skills work with Cursor, Windsurf, Cline, GitHub Copilot, and any assistant that can read project files.

## Quick workflow

```bash
npx @uigen-dev/cli@latest init my-app --spec openapi.yaml
# Ask your AI: "Use the auto-annotate skill to configure my spec"
npx @uigen-dev/cli@latest serve openapi.yaml
```

Refresh the browser after the agent edits config. No regeneration step.

## Available skills

| Skill | Purpose |
|---|---|
| **auto-annotate** | Detect auth endpoints, file uploads, relationships, charts, labels, layouts, and ignore rules |
| **generate-device-openapi** | Draft `openapi.yaml` from curl, Postman, C structs, or route tables (embedded/IoT) |
| **configure-oauth** | Set up OAuth 2.0 social login (Google, GitHub, Facebook, Microsoft) |
| **configure-websockets** | Wire `x-uigen-websocket` for live list, detail, and chart updates |
| **configure-icons** | Integrate Lucide, Heroicons, or React Icons with `library:iconName` syntax |
| **applying-styles-to-react-spa** | Brand colors, dark mode, component styling, animations |
| **configure-payments** | Stripe, PayPal, Square, pricing pages, and payment gates |
| **generate-landing-page-content** | Hero, features, pricing, testimonials, FAQ for `x-uigen-landing-page` |
| **create-overrides** | File-based React overrides with `x-uigen-override` |
| **http-method-override** | Override HTTP methods during config reconciliation |

Skills ship in the monorepo under [`SKILLS/`](https://github.com/darula-hpp/uigen/tree/main/SKILLS). `uigen init` copies them into your project.

## Recommended order

1. **auto-annotate** first for baseline labels, auth, charts, and relationships
2. **configure-oauth** or **configure-payments** when those features are needed (interactive; not auto-detected)
3. **configure-websockets** when your API exposes matching WebSocket paths
4. **applying-styles-to-react-spa** for branding and theme polish
5. **create-overrides** only when you need custom views

## Example prompts

```
Use the auto-annotate skill to configure my OpenAPI spec.
```

```
Use configure-websockets to add live telemetry for GET /api/v1/readings.
The backend exposes /ws/v1/readings with the same JSON shape.
```

```
Use applying-styles-to-react-spa to give this app a dark industrial theme
with teal accents for the hardware demo.
```

## Where skills write

| File | Contents |
|---|---|
| `.uigen/config.yaml` | Annotations, relationships, OAuth, WebSockets, overrides |
| `.uigen/theme.css` | CSS variables, component styles, dark mode |
| `openapi.yaml` | Usually unchanged; device skill may draft initial REST contract |

Keep sensitive values out of config. Use `${ENV_VAR_NAME}` syntax and `.env` files. See [Environment Variables](/docs/guides/environment-variables).

## Environment variables

Skills should reference secrets with `${VAR_NAME}` rather than hardcoding client IDs, API keys, or redirect URIs. UIGen loads `.env` from your spec directory at serve time.

## Next steps

- [Live Data & WebSockets](/docs/guides/live-data-websockets)
- [Environment Variables](/docs/guides/environment-variables)
- [OAuth Login](/docs/guides/oauth-login)
- [Spec Annotations](/docs/spec-annotations/overview)
