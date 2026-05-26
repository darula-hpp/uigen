# @uigen-dev/cli

## 0.17.0

### Minor Changes

- Update the docs regarding the targets

### Patch Changes

- Updated dependencies
  - @uigen-dev/config-gui@0.17.0
  - @uigen-dev/react@0.17.0
  - @uigen-dev/core@0.17.0

## 0.16.0

### Minor Changes

- Added the electron Target

### Patch Changes

- Updated dependencies
  - @uigen-dev/config-gui@0.16.0
  - @uigen-dev/react@0.16.0
  - @uigen-dev/core@0.16.0

## 0.15.0

### Minor Changes

- Improved Charting and edge cases handling

### Patch Changes

- Updated dependencies
  - @uigen-dev/config-gui@0.15.0
  - @uigen-dev/react@0.15.0
  - @uigen-dev/core@0.15.0

## 0.14.0

### Minor Changes

- Support loading specs from http(s) urls'

### Patch Changes

- Updated dependencies
  - @uigen-dev/config-gui@0.14.0
  - @uigen-dev/react@0.14.0
  - @uigen-dev/core@0.14.0

## 0.13.0

### Minor Changes

- Added Payments Support

### Patch Changes

- Updated dependencies
  - @uigen-dev/config-gui@0.13.0
  - @uigen-dev/react@0.13.0
  - @uigen-dev/core@0.13.0

## 0.12.0

### Minor Changes

- Add HTTP method override annotations (x-uigen-http-get, x-uigen-http-post, x-uigen-http-put, x-uigen-http-delete, x-uigen-http-patch) to force operations to use specific HTTP methods during reconciliation. This addresses scenarios where OpenAPI specs contain incorrect HTTP methods that don't match actual API implementations.

### Patch Changes

- Updated dependencies
  - @uigen-dev/config-gui@0.12.0
  - @uigen-dev/react@0.12.0
  - @uigen-dev/core@0.12.0

## 0.10.0

### Minor Changes

- Add HTTP method override annotations (x-uigen-http-get, x-uigen-http-post, x-uigen-http-put, x-uigen-http-delete, x-uigen-http-patch) to force operations to use specific HTTP methods during reconciliation. This addresses scenarios where OpenAPI specs contain incorrect HTTP methods that don't match actual API implementations.

### Patch Changes

- Updated dependencies
  - @uigen-dev/config-gui@0.10.0
  - @uigen-dev/react@0.10.0
  - @uigen-dev/core@0.10.0

## 0.9.0

### Minor Changes

- Complete ovveride feature

### Patch Changes

- Updated dependencies
  - @uigen-dev/config-gui@0.9.0
  - @uigen-dev/react@0.9.0
  - @uigen-dev/core@0.9.0

## 0.8.0

### Minor Changes

- # OAuth 2.0 Authentication Support (v0.8.0)

  ## Major Features

  ### OAuth 2.0 Authentication

  - Complete OAuth 2.0 authorization code flow with Google, GitHub, Facebook, and Microsoft providers
  - Token management with automatic refresh on 401 responses
  - CSRF protection with cryptographically secure state parameters (128-bit entropy)
  - Session validation endpoint support for cookie-based auth fallback
  - Production-grade error handling with user-friendly messages
  - 421+ tests passing (369 OAuth + 52 reconciler tests)

  ### Environment Variable Resolution

  - Resolve environment variables in OpenAPI specs using `${ENV_VAR}` syntax
  - Support for default values: `${ENV_VAR:default_value}`
  - Automatic .env file loading from spec directory
  - 80+ property-based tests for comprehensive validation

  ### CLI Improvements

  - Fixed SPA routing to properly handle query parameters (OAuth callback support)
  - Automatic .env file loading from spec directory
  - Improved error messages and logging

  ## New Annotations

  ### x-uigen-auth (OAuth Configuration)

  Configure OAuth providers in OpenAPI specs:

  ```yaml
  info:
    x-uigen-auth:
      providers:
        - provider: google
          clientId: ${GOOGLE_CLIENT_ID}
          redirectUri: http://localhost:8000/api/v1/auth/google/callback
          sessionValidationEndpoint: /api/v1/auth/me
          scopes:
            - openid
            - email
            - profile
  ```

  ## Breaking Changes

  None - fully backward compatible

  ## Documentation

  - New skill: `SKILLS/configure-oauth.md` - Complete OAuth configuration guide
  - Updated CHANGELOG.md with comprehensive v0.8.0 release notes
  - All code fully documented with JSDoc comments

  ## Security

  - CSRF protection with state parameter validation
  - Secure token storage in localStorage/sessionStorage
  - Automatic token cleanup on logout
  - URL parameter cleanup after OAuth callback

### Patch Changes

- Updated dependencies
  - @uigen-dev/core@0.8.0
  - @uigen-dev/react@0.8.0
  - @uigen-dev/config-gui@0.8.0

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
