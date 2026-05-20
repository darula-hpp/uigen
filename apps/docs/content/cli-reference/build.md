---
title: uigen build
description: Package a UIGen project for deployment by copying config, theme, spec, and overrides.
---

# uigen build

The `build` command packages your UIGen project into a self-contained output directory. It copies the `.uigen/` directory, OpenAPI spec, optional `annotations.json`, and bundles any TypeScript override files from `src/overrides/`.

## Usage

```bash
uigen build <spec> [options]
npx @uigen-dev/cli build <spec> [options]
```

Run this from your UIGen project root (the directory that contains `.uigen/`).

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `-o, --output <path>` | `string` | `build` | Output directory |
| `--clean` | `boolean` | `false` | Remove the output directory before building |
| `--verbose` | `boolean` | `false` | Show detailed build output |

## Examples

### Default build

```bash
uigen build openapi.yaml
```

Output is written to `./build/`.

### Custom output directory

```bash
uigen build openapi.yaml --output dist
```

### Clean rebuild

```bash
uigen build openapi.yaml --clean --verbose
```

## Build output

```
build/
├── .uigen/
│   ├── config.yaml
│   ├── base-styles.css
│   ├── theme.css
│   └── assets/
├── openapi.yaml
├── annotations.json          # if present in project root
└── overrides.bundle.js       # if src/overrides/ contains TSX files
```

## Deploying

The build output is not a static HTML site. It is a portable UIGen project folder you can deploy alongside the CLI:

```bash
cd build
uigen serve openapi.yaml --proxy-base https://api.example.com
```

For CI/CD, copy the build folder to your server and run `uigen serve` with the appropriate `--proxy-base` for each environment.

## Notes

- Override transpilation errors are logged as warnings and do not fail the build.
- The spec file is copied as `openapi.yaml` regardless of the source filename.
- Static HTML export (`uigen generate`) is planned for a future release. See [Planned Commands](/docs/cli-reference/planned-commands).

## Related

- [uigen serve](/docs/cli-reference/serve)
- [Override System](/docs/override-system/overview)
