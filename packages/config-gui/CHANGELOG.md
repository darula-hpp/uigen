# @uigen-dev/config-gui

## 0.10.0

### Minor Changes

- # Icon Library Integration (v0.10.0)

  Professional icon support for landing pages and UI components with dynamic resolution from Lucide, Heroicons, and React Icons.

  ## Features

  - **Icon Resolver** - Dynamic icon resolution with `library:iconName` syntax (e.g., `lucide:FileText`)
  - **Icon Component** - Reusable React component with fallback, theming, and accessibility
  - **Icon Validator** - Config validation with helpful suggestions
  - **Landing Page Icons** - Professional icons in feature sections with theme-aware styling
  - **Configure Icons Skill** - AI-assisted icon configuration guide

  ## Breaking Changes

  None - fully backward compatible

  ## Migration

  Update your landing page config to use icon references:

  ```yaml
  sections:
    features:
      items:
        - icon: "lucide:FileText" # instead of "📄"
          title: "Feature Name"
  ```

### Patch Changes

- Updated dependencies
  - @uigen-dev/core@0.10.0

## 0.9.0

### Minor Changes

- Complete ovveride feature

### Patch Changes

- Updated dependencies
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

## 0.7.3

### Patch Changes

- Add uigen build command for packaging UIGen projects for production deployment. The build command copies .uigen/ directory, OpenAPI spec, and annotations.json to a self-contained build folder with --output, --clean, and --verbose flags.
- Updated dependencies
  - @uigen-dev/core@0.7.3

## 0.7.2

### Patch Changes

- Align all package versions to 0.7.1 for consistent versioning across the monorepo
- Updated dependencies
  - @uigen-dev/core@0.7.2
