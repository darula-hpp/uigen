# @uigen-dev/config-gui

Visual GUI for managing UIGen annotation configurations.

This package provides a web-based interface for configuring UIGen annotations without manually editing OpenAPI/Swagger spec files.

## Features

- Visual annotation configuration
- Enable/disable annotations
- Set default parameter values
- Live preview of generated UI
- Automatic discovery of registered annotations

## Usage

This package is typically launched via the UIGen CLI:

```bash
uigen config <spec-file>
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## License

MIT
