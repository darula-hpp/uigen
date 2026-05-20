---
title: uigen init
description: Scaffold a new UIGen project with config, theme, and AI agent skills.
---

# uigen init

The `init` command scaffolds a complete UIGen project directory with configuration files, base styles, AI agent skills, and an optional OpenAPI spec.

## Usage

```bash
uigen init [project-name] [options]
npx @uigen-dev/cli init [project-name] [options]
```

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--spec <path>` | `string` | — | Copy an existing OpenAPI spec into the project as `openapi.yaml` |
| `--dir <path>` | `string` | Project name | Custom directory path (overrides `project-name`) |
| `--no-git` | `boolean` | `false` | Skip git repository initialization |
| `-y, --yes` | `boolean` | `false` | Skip prompts and use defaults |
| `--verbose` | `boolean` | `false` | Show detailed output |

## Examples

### Interactive init

```bash
npx @uigen-dev/cli init my-admin-ui
```

### Init with an existing spec

```bash
npx @uigen-dev/cli init my-admin-ui --spec ./openapi.yaml
```

### Non-interactive defaults

```bash
npx @uigen-dev/cli init my-admin-ui -y
```

### Custom directory, no git

```bash
npx @uigen-dev/cli init --dir ./custom-path --no-git -y
```

## Project structure

After init, the project contains:

```
my-admin-ui/
├── .agents/skills/       # AI agent skills (auto-annotate, styling, etc.)
├── .uigen/
│   ├── config.yaml       # UIGen annotations and overrides
│   ├── base-styles.css   # Base Tailwind styles (do not edit)
│   └── theme.css         # Your custom theme
├── openapi.yaml          # OpenAPI spec (placeholder or copied from --spec)
├── annotations.json      # Default annotation registry
├── README.md
└── .gitignore
```

## Next steps

From the project directory:

```bash
cd my-admin-ui
npx @uigen-dev/cli serve openapi.yaml
```

If your API runs on a different host than the spec declares:

```bash
npx @uigen-dev/cli serve openapi.yaml --proxy-base http://localhost:8000
```

See also:

- [Quick Start](/docs/getting-started/quick-start)
- [uigen serve](/docs/cli-reference/serve)
- [uigen config](/docs/cli-reference/config)
