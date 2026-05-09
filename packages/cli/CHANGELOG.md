# @uigen-dev/cli

## 0.7.3

### Patch Changes

- Add uigen build command for packaging UIGen projects for production deployment. The build command copies .uigen/ directory, OpenAPI spec, and annotations.json to a self-contained build folder with --output, --clean, and --verbose flags.
- Updated dependencies
  - @uigen-dev/core@0.7.3
  - @uigen-dev/react@0.7.3
  - @uigen-dev/config-gui@0.7.3

## 0.7.2

### Patch Changes

- Updated dependencies
  - @uigen-dev/core@0.7.2
  - @uigen-dev/config-gui@0.7.2
  - @uigen-dev/react@0.7.2

## 0.7.1

### Patch Changes

- Fix breadcrumb navigation and landing page auth protection

  - Fixed breadcrumb "Home" link to navigate to dashboard instead of landing page when landing page is enabled
  - Added auth protection to landing page route to redirect authenticated users to dashboard
  - Prevents authenticated users from accessing the landing page via URL navigation

- Updated dependencies
  - @uigen-dev/react@0.7.1
