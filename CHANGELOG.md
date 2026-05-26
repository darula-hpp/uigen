# Changelog

All notable changes to UIGen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).



---

## [0.17.0] - 2026-05-26

### Added

**Documentation**
- **Custom docs domain** - Docs site canonical URL is now [getuigen.dev](https://getuigen.dev)
  - Centralized `SITE_URL` in `apps/docs/lib/site.ts`
  - Generated `/sitemap.xml` and `/robots.txt` for SEO
  - Per-page canonical URLs for docs and blog posts
  - Permanent redirect from `uigen-docs.vercel.app` via `apps/docs/vercel.json`
- **Site icon** - Added SVG favicon and header logo for the docs site
- **Devboard simulator example** - Next.js hardware demo with live board UI, OpenAPI contract, and Vercel deployment
  - Documented in [`example-apps`](/apps/docs/content/guides/example-apps.md)

**Examples**
- Next.js devboard simulator under `examples/apps/nextjs/devboard-simulator`

### Changed
- **Documentation URLs** - Replaced `uigen-docs.vercel.app` and `uigen.dev` links across docs, README, CLI templates, skills, and example overrides with `getuigen.dev`
- **Contact emails** - Updated scaffolded and example contact addresses to `@getuigen.dev` (`init@`, `support@`, `dev@`)
- **Electron target docs** - Expanded CLI reference and getting-started docs for `--target electron`

### Fixed
- **Vercel deploy** - Removed `outputFileTracingRoot` from devboard simulator Next.js config that broke Vercel builds

---

## [0.16.0] - 2026-05-21

### Added

**CLI package (`@uigen-dev/cli`)**
- **Electron target** - Serve the generated UI in a desktop window with `--target electron`
  - New `--target <target>` flag on `uigen serve` (`web`, `electron`; default: `web`)
  - Spawns `@uigen-dev/target-electron` after the normal serve pipeline (spec processing, CSS/overrides injection, `/api` proxy)
  - React renderer only for Phase 1; `--renderer vue` / `--renderer svelte` are rejected for Electron

**Electron target (`@uigen-dev/target-electron`)**
- New workspace package at `targets/electron` - thin Electron shell that opens a `BrowserWindow` to the CLI server URL
- Optional install for npm users: `pnpm add -D @uigen-dev/target-electron`

**Monorepo**
- Added `targets/*` to the pnpm workspace for distribution shells (Electron first; future targets like Tauri can follow)
- Added `pnpm test:electron` script for local desktop testing (mirrors `test:serve`)

**Documentation**
- Added [`electron-target`](/apps/docs/content/cli-reference/electron-target.md) CLI reference
- Updated [`uigen serve`](/apps/docs/content/cli-reference/serve.md), getting started, how-it-works, and roadmap docs for Electron
- ESP32 hardware demo walkthrough and README updates for embedded/OpenAPI teams
- OpenAPI starter spec for hardware teams

**Examples**
- ESP32 and STM32 simulator README and docs polish; demo GIF in root README

### Tests
- CLI `electron-launcher` unit tests for target resolution, spawn args, and missing-package errors

---

## [0.15.0] - 2026-05-20

### Added

**Core package (`@uigen-dev/core`)**
- **Chart data pipeline** - Data-aware chart preparation for `x-uigen-chart` list responses
  - `ChartDataPipeline` - Maps rows, detects axis types, sorts time series, and samples for rendering
  - `ChartQueryResolver` - Resolves chart-specific list query params (`query.limit`, filter state, `query.params`)
  - `ChartAxisTypeDetector` - Detects time, category, and number axes from schema metadata and sample values
  - `ChartSampler` - LTTB, bucket-mean, auto, and none sampling strategies
  - `ChartFilterStateResolver`, `ChartDateTimePresets`, and `ChartDateTimeRangeResolver` for chart filter query binding
  - Extended `ChartConfig` IR with `query`, `filters`, and `sampling`
  - `ChartHandler` validation/apply support for the new chart config fields
  - `ListFieldResolver.resolveItemSchema()` for chart axis detection from list item schemas
- **List adapter utilities** - Generalized list response handling in core
  - `ListResponseExtractor`, `ListFieldResolver`, and `SchemaFieldFilter`
- **`@uigen-dev/core/config` export** - Node-only `ConfigLoader` moved out of the browser bundle entrypoint

**React package (`@uigen-dev/react`)**
- **Chart panel in List View** - Built-in charts above paginated tables when `chartConfig` is present
  - `ChartPanel`, `ChartVisualization`, and `useChartFilters` / `useChartViewModel`
  - Server-side chart filters: `ref`, `datetime-range`, `select`, and `number`
  - React-only client-side **X-axis range** control for time-series charts (1m through 7d, applied before sampling)
  - Dynamic preset list based on loaded data span, with point-ratio fallback when timestamps are identical
  - Chart fetch limits stay independent from table pagination
  - "Showing X of Y points" notes for sampling and selected x-axis ranges
- **Navigation helpers** - `resolveDashboardPath`, `resolveFormDismissPath`, and `resolveCreateFormOperation`
  - Action-only resources redirect home instead of looping back to selection
  - `/dashboard` alias redirects to `/` when the landing page is disabled

**Documentation**
- Added [`x-uigen-chart`](/apps/docs/content/spec-annotations/x-uigen-chart.md) annotation reference
- Updated List View, spec annotation overview, intermediate representation, and roadmap docs for built-in charts
- Rebuilt docs search index for the new chart page

**Skills**
- Updated `SKILLS/auto-annotate.md` Rule 7 with chart `query`, `sampling`, and `filters` heuristics

**Examples**
- ESP32 simulator config: telemetry chart with sensor filter, query limit, and sampling

### Changed
- **Package exports** - Removed `@uigen-dev/core/lib` shim; browser entrypoint exports config types only
- **Centered layout** - Auth and action pages keep centered width constraints while composing inside `AppShell` so the theme toggle stays aligned
- **Read-only sections** - Removed hardcoded placeholder descriptions from detail and singleton list views

### Fixed
- **Chart query limit binding** - `ChartQueryResolver` no longer treats the first integer query param as the limit param
- **X-axis range effectiveness** - Time window now filters raw fetched rows before downsampling instead of after LTTB sampling
- **List field resolver tests** - Restored `resolveColumns` coverage and added `resolveItemSchema` tests

### Tests
- Core chart pipeline, filter resolver, list adapter, and chart handler coverage
- React chart utils, chart panel, axis window, and `useChartViewModel` coverage

---

## [0.13.0] - 2026-05-18

### Added

**Core package (`@uigen-dev/core`)**
- **Payment resource refactor** - Transformed payments from component-based to resource-based architecture
  - `PricingResourceGenerator` - Auto-generates pricing resource from payment config (11 tests)
  - `MonetizationConfig` interface for resource/operation-level payment gates
  - `PricingPageConfig` interface with extensible pricing source strategy (inline, endpoint, component)
  - `x-uigen-monetized` annotation for marking resources/operations as requiring payment
  - Enhanced `PaymentHandler` with `extractPricingPageConfig()`, `handlePathLevel()`, `handleOperationLevel()`
  - Updated `ResourceExtractor` to integrate monetization flags into resources and operations
  - Security model: Only frontend-safe fields (`publishableKey`) in spec, backend secrets in `.env`
  - 123 tests passing in Phase 1 (core infrastructure)
  ```yaml
  # Document-level payment configuration
  x-uigen-payments:
    providers:
      - provider: stripe
        publishableKey: ${STRIPE_PUBLISHABLE_KEY}
        mode: test
    pricingPage:
      enabled: true
      source: inline
      products:
        - id: pro
          name: Professional
          price: 2900
          interval: month
  
  # Mark resources as monetized
  paths:
    /api/v1/meetings:
      x-uigen-monetized: true
  ```

**React package (`@uigen-dev/react`)**
- **Pricing infrastructure** - Complete pricing and monetization UI components
  - `PricingSourceFactory` with strategy pattern for extensible pricing sources (14 tests)
  - `InlinePricingSource`, `EndpointPricingSource`, `ComponentPricingSource` implementations
  - `usePaymentStatus` hook for checking user subscription status (22 tests)
  - `MonetizationHandler` component for intercepting 402 responses (10 tests)
  - `UpgradePrompt` component with inline and fullpage modes (17 tests)
  - `PricingView` component with auto-generated pricing page (12 tests)
  - `/pricing` route auto-generated when `pricingPage.enabled: true` (6 tests)
  - 67 tests passing in Phase 2 (React infrastructure)

**Documentation**
- Updated `apps/docs/content/payments/overview.md` with resource-based approach
  - Explained auto-generated pricing page
  - Documented payment gates (resource and operation level)
  - Added security model explanation
  - Added runtime flow diagram
- Created `apps/docs/content/payments/payment-gates.md` comprehensive guide
  - Resource-level and operation-level gates
  - Custom messages and redirects
  - Backend enforcement examples (FastAPI and Express.js)
  - Best practices and advanced patterns
  - Testing examples and troubleshooting

**Skills**
- Updated `SKILLS/configure-payments.md` with new patterns
  - Document-level `x-uigen-payments` configuration
  - `x-uigen-monetized` annotation examples
  - Payment gates workflow explanation
  - Security best practices (frontend-safe keys only)
  - Backend enforcement examples

**Annotations**
- Added `x-uigen-monetized` to annotation registry
  - Supports boolean shorthand: `x-uigen-monetized: true`
  - Supports object form with custom message and redirect
  - Applies to paths (resource-level) and operations (operation-level)
  - 18 total annotations in registry

### Changed
- **Payment configuration location** - Moved from `info` object to document root
  - Now: `x-uigen-payments` at document level (consistent with `x-uigen-auth`)
  - Before: `info['x-uigen-payments']`
- **Security model** - Only frontend-safe fields in spec
  - Frontend: `publishableKey` only
  - Backend: `apiKey`, `webhookSecret`, `clientSecret` stay in `.env`
- **Payment enforcement** - Backend is source of truth
  - Backend enforces limits and returns 402 Payment Required
  - Frontend intercepts 402 and shows upgrade prompt
  - No frontend-only checks (cannot be bypassed)

### Tests
- **190 tests passing** across payment resource refactor
  - Phase 1 (Core): 123 tests
  - Phase 2 (React): 67 tests
  - Full integration coverage

### Documentation
- [Payment Overview](/payments/overview) - Resource-based approach
- [Payment Gates Guide](/payments/payment-gates) - Comprehensive guide
- [Configure Payments Skill](/SKILLS/configure-payments.md) - AI-assisted setup

---

## [0.11.0] - 2026-05-15

### Added

**Core package (`@uigen-dev/core`)**
- **HTTP method override annotations** - Force operations to use specific HTTP methods during reconciliation
  - Five new annotations: `x-uigen-http-get`, `x-uigen-http-post`, `x-uigen-http-put`, `x-uigen-http-delete`, `x-uigen-http-patch`
  - `HttpMethodOverrideReconciler` - Scans specs for HTTP method override annotations and transforms operations
  - `OperationMethodTransformer` - Utility class for moving operations between HTTP methods with validation
  - Integrated into main Reconciler after annotation merging, before OAuth reconciliation
  - Supports both OpenAPI 3.x and Swagger 2.0 specs
  - Preserves all operation properties during transformation
  - Graceful error handling with warnings for conflicts and missing operations
  - 43 comprehensive tests (15 unit + 17 reconciler + 11 integration)
  ```yaml
  # Override logout endpoint from DELETE to POST
  annotations:
    DELETE:/auth/logout:
      x-uigen-http-post: true
      x-uigen-label: Logout
  
  # Override search endpoint from POST to GET
  annotations:
    POST:/users/search:
      x-uigen-http-get: true
      x-uigen-label: Search Users
  ```

**Skills**
- **HTTP method override skill** - `http-method-override.md` for AI-assisted method override configuration
  - Detection rules for common method discrepancies (logout, search, partial update, etc.)
  - Annotation syntax and examples for all five HTTP methods
  - Complete config file examples for common scenarios
  - Troubleshooting guide for method conflicts and validation errors

**Documentation**
- Added comprehensive documentation for HTTP method override feature
- Documented architectural decision to use reconciler approach instead of handlers
- Updated design document with reconciler architecture and data flow

### Tests
- 15 unit tests for OperationMethodTransformer (transformation, validation, edge cases)
- 17 unit tests for HttpMethodOverrideReconciler (all HTTP methods, conflicts, warnings)
- 11 integration tests for end-to-end reconciliation flow
- All 43 tests passing

---

## [0.10.0] - 2026-05-13

### Added

**Core package (`@uigen-dev/core`)**
- **Icon library integration** - Professional icon support for landing pages and UI components
  - `IconResolver` interface with library-specific implementations for Lucide, Heroicons, and React Icons
  - Dynamic icon resolution from config strings (e.g., `lucide:FileText`, `heroicons:HomeIcon`, `react-icons:FaHome`)
  - In-memory caching with Map for performance optimization
  - Format validation and parsing with helpful error messages
  - `IconValidator` for validating icon references in config files with suggestion system
  - Full TypeScript type definitions
  - 56 unit tests for icon resolver
  - 52 unit tests for icon validator

**React package (`@uigen-dev/react`)**
- **Icon component** - Reusable component for rendering icons from multiple libraries
  - Supports `library:iconName` reference format
  - Automatic fallback to HelpCircle icon for invalid references
  - Customizable size, color, and className
  - Full accessibility support with aria-label
  - Async icon resolution with loading states
  - 29 unit tests covering rendering, resolution, and accessibility
- **FallbackIcon component** - Graceful fallback for invalid icon references
  - Uses Lucide's HelpCircle icon
  - Consistent styling with main Icon component
  - 18 unit tests
- **Landing page icon integration** - Icons now render in feature sections
  - Icon component integrated into LandingPageView
  - Theme-aware styling with CSS variables
  - Icons inherit primary color from theme
  - Dark mode support

**CLI (`@uigen-dev/cli`)**
- **Icon library dependencies** - Added icon libraries to React package
  - `@heroicons/react@^2.2.0` for Heroicons support
  - `react-icons@^5.6.0` for React Icons support
  - `lucide-react@^0.468.0` already installed

**Skills**
- **Configure Icons skill** - `configure-icons.md` for AI-assisted icon configuration
  - Overview of three icon libraries (Lucide, Heroicons, React Icons)
  - Icon reference format explanation and examples
  - Comprehensive examples for landing pages, pricing, testimonials
  - Icon categories (Business, Communication, Files, Technology, E-commerce, UI Actions)
  - Best practices and troubleshooting guide
  - Complete working example

**Documentation**
- Updated README with icon library support in Key Features section
- Added Configure Icons skill to AI Agent Skills section
- Updated example workflow to include icon configuration

### Changed

**React package (`@uigen-dev/react`)**
- Icon component now uses `currentColor` by default for theme inheritance
- Landing page feature icons styled with primary theme color
- Icons properly positioned and themed in feature cards

**Examples**
- Updated meeting-minutes example config to use icon references instead of emojis
  - "📄" → "lucide:FileText"
  - "🤖" → "lucide:Bot"
  - "✍️" → "lucide:PenTool"
  - "📥" → "lucide:Download"
  - "📅" → "lucide:Calendar"
  - "🔒" → "lucide:Lock"

### Tests
- 56 unit tests for icon resolver (resolution, caching, validation)
- 52 unit tests for icon validator (validation, suggestions)
- 29 unit tests for Icon component (rendering, accessibility, error handling)
- 18 unit tests for FallbackIcon component
- All existing tests continue to pass

---

## [0.9.0] - 2026-05-12

### Changed

**Override System Refactor** - Replaced `x-uigen-id` with structured `x-uigen-override` annotation

The override system has been refactored to use a structured annotation format that enables programmatic control over override enablement.

**Migration Required:**

Old format (no longer supported):
```yaml
/api/v1/users:
  x-uigen-id: users
```

New format (required):
```yaml
/api/v1/users:
  x-uigen-override:
    id: users
    enabled: true  # Optional, defaults to true
```

**What Changed:**
- `x-uigen-id` annotation removed entirely
- New `x-uigen-override` annotation with `id` and `enabled` properties
- `uigenId` property removed from Resource and Operation IR types
- New `override?: OverrideConfig` property added to Resource and Operation
- Override reconciliation now checks `enabled` flag before applying overrides

**Benefits:**
- Programmatic enable/disable of overrides without removing annotations
- Better structure for future extensibility
- Clearer separation between override identification and resource identification
- Agent-friendly format for automated override management

**Migration Steps:**
1. Update all `x-uigen-id` annotations in your `.uigen/config.yaml` to use `x-uigen-override` format
2. Override files (`src/overrides/*.tsx`) do not need changes
3. The `targetId` in override files should match the `id` in `x-uigen-override`

### Added

- Override enablement control via `x-uigen-override.enabled` property
- Structured override metadata for future extensibility
- `OverrideHandler` annotation handler following established architecture
- Better error messages when overrides are not found

### Removed

- `x-uigen-id` annotation (replaced by `x-uigen-override`)
- `uigenId` property from Resource and Operation IR types


## [0.8.0] - 2026-05-11

### Added

**Core package (`@uigen-dev/core`)**
- **OAuth 2.0 authentication support** - Social login with Google, GitHub, Facebook, and Microsoft
  - New `x-uigen-auth` annotation for configuring OAuth providers at document level
  - `AuthHandler` for processing OAuth provider configurations with validation
  - Support for multiple OAuth providers in a single application
  - OAuth provider configuration with client ID, redirect URI, scopes, and custom endpoints
  - Default OAuth endpoints for all supported providers (authorization, token, user info)
  - Optional `sessionValidationEndpoint` parameter for cookie-based auth fallback
  - Full TypeScript type definitions (`OAuthProvider`, `OAuthProviderConfig`)
  - Comprehensive validation with helpful error messages
  - Environment variable support in OAuth configuration (e.g., `${GOOGLE_CLIENT_ID}`)
  ```yaml
  info:
    x-uigen-auth:
      providers:
        - provider: google
          clientId: ${GOOGLE_CLIENT_ID}
          redirectUri: ${GOOGLE_REDIRECT_URI}
          sessionValidationEndpoint: /api/v1/auth/me
          scopes:
            - openid
            - email
            - profile
  ```

- **Environment variable resolution** - Dynamic configuration with environment variables
  - `${VAR_NAME}` syntax support in config.yaml files
  - `EnvVarParser` for detecting and extracting environment variable references
  - `EnvVarResolver` for resolving variables from process.env with validation
  - Variables resolved before reconciliation for seamless integration
  - Graceful fallback to empty string for missing variables with warnings
  - Support for nested objects and arrays in configuration
  - 80+ tests covering unit, property-based, and integration scenarios
  ```yaml
  # Use environment variables anywhere in config
  x-uigen-auth:
    providers:
      - provider: google
        clientId: ${GOOGLE_CLIENT_ID}
        redirectUri: ${GOOGLE_REDIRECT_URI}
  ```

**React package (`@uigen-dev/react`)**
- **OAuth login flow** - Complete OAuth 2.0 authorization code flow implementation
  - `OAuthCallback` component handles provider redirects with multiple auth methods:
    - Token in query parameter (primary method for backend redirects)
    - Token in URL fragment (fallback for client-side flows)
    - Cookie-based session validation (fallback using `sessionValidationEndpoint`)
  - `OAuthStrategy` for initiating OAuth flows and exchanging authorization codes
  - OAuth provider buttons with logos on login page
  - State parameter generation and validation for CSRF protection
  - Automatic token storage in sessionStorage
  - URL cleanup after token extraction (no sensitive data in browser history)
  - Error handling with user-friendly messages
  - Support for multiple OAuth providers simultaneously
  - Graceful fallback when OAuth providers are unavailable

**CLI (`@uigen-dev/cli`)**
- **Environment variable loading** - Automatic .env file loading from spec directory
  - Loads `.env` file from the same directory as the OpenAPI spec
  - Environment variables available during config reconciliation
  - Verbose logging shows loaded environment file path
  - Graceful handling when .env file is not present

- **SPA routing fix** - Fixed "Not found" errors for client-side routes with query parameters
  - Updated serve command to strip query strings before checking file extensions
  - All SPA routes now properly serve index.html for client-side routing
  - Query parameters preserved for React Router to process
  - Fixes OAuth callback route (`/auth/callback?token=xxx`)

**Skills**
- **OAuth configuration skill** - `configure-oauth.md` for AI-assisted OAuth setup
  - Automatic detection of APIs that need OAuth
  - Interactive prompts for provider selection and configuration
  - Provider-specific setup instructions (Google, GitHub, Facebook, Microsoft)
  - Default scope recommendations per provider
  - Environment variable best practices
  - Complete examples and troubleshooting guide
  - Documentation of `sessionValidationEndpoint` parameter

**Documentation**
- Added comprehensive OAuth authentication guide
- Added environment variable configuration guide
- Updated authentication documentation with OAuth flow diagrams
- Added security best practices for OAuth implementation
- Documented `redirectUri` vs `sessionValidationEndpoint` differences

### Changed

**Core package (`@uigen-dev/core`)**
- Enhanced `Reconciler` to resolve environment variables before applying annotations
- Updated `PathResolver` to correctly resolve document-level annotations to `spec.info`
- OAuth providers now stored in `ir.auth.oauthProviders` array

**React package (`@uigen-dev/react`)**
- `LoginView` now renders OAuth provider buttons when configured
- `App.tsx` updated to pass config prop to `OAuthCallback` component
- Auth utilities enhanced to support cookie-based authentication

### Fixed

**Core package (`@uigen-dev/core`)**
- Fixed path resolution for document-level annotations (now correctly resolves to `spec.info`)
- Fixed annotation precedence when both spec and config define the same annotation

**CLI (`@uigen-dev/cli`)**
- Fixed SPA routing to handle query parameters correctly (strips `?` before checking extensions)
- Fixed static file serving to always serve index.html for routes without extensions

**React package (`@uigen-dev/react`)**
- Fixed OAuth callback route not rendering due to missing index.html for SPA routes
- Fixed token extraction from query parameters in OAuth callback

### Tests
- 80+ tests for environment variable resolution (unit, property-based, integration)
- 50+ tests for OAuth authentication (handler validation, flow integration)
- 20+ tests for OAuth callback component (token extraction, error handling)
- All existing tests continue to pass

### Security
- OAuth state parameter validation prevents CSRF attacks
- Environment variables never exposed to client (resolved server-side only)
- Tokens immediately cleaned from URL after extraction
- Session validation endpoint optional for defense-in-depth

---

## [0.7.3] - 2026-05-09

### Added

**CLI (`@uigen-dev/cli`)**
- **`uigen build` command** - Package UIGen projects for production deployment
  - Copies `.uigen/` directory (config.yaml, theme.css, base-styles.css, assets) to build output
  - Copies OpenAPI spec file to build output as `openapi.yaml`
  - Copies `annotations.json` if present
  - Creates self-contained build folder ready for deployment
  - `--output` flag to specify custom output directory (defaults to `./build`)
  - `--clean` flag to remove existing build directory before building
  - `--verbose` flag for detailed build logging
  - Validates `.uigen/` directory and spec file exist before building
  - Command signatures:
    - `uigen build openapi.yaml` - Build with default output directory
    - `uigen build openapi.yaml --output dist` - Custom output directory
    - `uigen build openapi.yaml --clean` - Clean before building
    - `uigen build openapi.yaml --clean --verbose` - Clean with detailed logs

**Documentation**
- Added CLI reference documentation for `uigen build` command
- Updated Quick Start guide with build command workflow
- Updated Installation guide with build command examples

---

## [0.7.2] - 2026-05-07

### Changed

**Project Infrastructure**
- **Standardized version management with Changesets** - All packages now use fixed versioning
  - Configured fixed versioning in `.changeset/config.json` to keep all packages synchronized
  - All packages bumped to version 0.7.2 together
  - Internal dependencies use `workspace:*` protocol for local development
  - Changesets automatically replaces `workspace:*` with actual versions during publishing
  - Prevents version mismatches between packages when published to npm
  - Single changeset now bumps all packages to the same version

**React package (`@uigen-dev/react`)**
- **Landing page auth protection** - Authenticated users are now automatically redirected from landing page to dashboard
  - Created `LandingPageRoute` wrapper component that checks authentication status
  - Redirects authenticated users to `/dashboard` when they try to access `/`
  - Follows same pattern as existing auth route wrappers (LoginRoute, SignUpRoute, PasswordResetRoute)
  - Prevents authenticated users from navigating back to landing page via URL

### Fixed

**React package (`@uigen-dev/react`)**
- **Breadcrumb navigation** - Fixed "Home" breadcrumb link to navigate to correct dashboard path
  - Dashboard path now determined dynamically based on landing page configuration
  - With landing page enabled: "Home" links to `/dashboard`
  - Without landing page: "Home" links to `/` (root)
  - Breadcrumb component now checks `config.landingPageConfig?.enabled` to determine correct path


### Added

**Core package (`@uigen-dev/core`)**
- **DateTime annotation support** - New `x-uigen-datetime` annotation for declarative datetime formatting and input control configuration
  - Field-level annotation for custom datetime format patterns using dayjs syntax
  - Support for both string format (simple) and object format (with timezone)
  - Automatic input control detection (date, time, datetime-local) based on format pattern
  - Timezone handling with IANA timezone identifiers
  - Separate `x-uigen-datetime-tz` annotation for independent timezone configuration
  - Format pattern validation at compile time with clear error messages
  - DateTimeFormatter service for consistent datetime formatting across the application
  - DateTimeParser service for parsing user input with timezone awareness
  - DateTimeApiConverter service for bidirectional conversion between API and display formats
  - Support for Unix timestamps (seconds and milliseconds) via `x-uigen-datetime-api-format`
  - Support for custom API format patterns (e.g., API uses YYYY-MM-DD, UI shows MM/DD/YYYY)
  - Common format pattern constants library (ISO, US, EU, time formats)
  - Full TypeScript type definitions in IR (DateTimeConfig interface)
  - Comprehensive validation with helpful error messages
  - 100+ unit tests covering all datetime operations
  - 7 property-based tests verifying correctness properties (round-trip preservation, format validation, etc.)
  - Config file integration for default datetime formats
  ```yaml
  # Simple format
  created_at:
    type: string
    x-uigen-datetime: "MMM DD, YYYY"
  
  # With timezone
  scheduled_at:
    type: string
    x-uigen-datetime:
      format: "MM/DD/YYYY hh:mm A"
      timezone: "America/New_York"
  
  # Unix timestamp with display format
  timestamp:
    type: integer
    x-uigen-datetime: "MMM DD, YYYY"
    x-uigen-datetime-api-format: "unix"
  ```

**React package (`@uigen-dev/react`)**
- **DateTimeField component** - New React component for datetime input with format conversion
  - Automatic input control rendering based on dateTimeConfig (date, time, datetime-local)
  - Bidirectional format conversion (API format ↔ Display format)
  - Timezone display and conversion
  - Integration with react-hook-form for validation
  - ARIA attributes for accessibility
  - Support for Unix timestamps and custom API formats
  - 20 integration tests covering complete form submission flows
  - Backward compatible with existing date fields

**Documentation**
- Added comprehensive documentation for `x-uigen-datetime` annotation
- Added documentation for `x-uigen-datetime-tz` annotation
- Added example OpenAPI spec demonstrating various datetime format patterns
- Added common timezone reference (North America, Europe, Asia, Australia)
- Added dayjs format token reference

### Dependencies
- Added `dayjs` (^1.11.10) to core and react packages for datetime operations
- Added dayjs plugins: utc, timezone, customParseFormat

### Notes
- No breaking changes - existing date fields continue to work without modification
- The `x-uigen-datetime` annotation is optional and enhances existing date field functionality
- Default behavior (ISO 8601) is maintained when annotations are not present

---

## [0.7.0] - 2026-05-05

### Added

**Core package (`@uigen-dev/core`)**
- **Layout system annotation** - New `x-uigen-layout` annotation for configuring application layout strategies
  - Document-level annotation for global layout configuration (sidebar, centered, dashboard-grid)
  - Operation-level annotation for per-resource layout overrides
  - Three built-in layout strategies:
    - `sidebar` - Traditional admin panel with left navigation sidebar
    - `centered` - Centered content for auth flows (login, signup, password reset)
    - `dashboard-grid` - Grid-based dashboard layout for analytics and metrics
  - Extensible metadata pattern for layout-specific configuration (maxWidth, columns, gap, etc.)
  - LayoutHandler registered in AnnotationHandlerRegistry for automatic processing
  - Full TypeScript type definitions in IR (LayoutConfig, LayoutType, LayoutMetadata)
  - Comprehensive validation with helpful error messages
  - 45+ unit tests covering extraction, validation, and application
  - 12 property-based tests verifying correctness properties
  ```yaml
  # Document-level: Global sidebar layout
  x-uigen-layout:
    type: sidebar
    metadata:
      collapsible: true
      defaultOpen: true
  
  # Operation-level: Centered layout for login
  paths:
    /auth/login:
      post:
        x-uigen-layout:
          type: centered
          metadata:
            maxWidth: 400
  ```
- **Landing page annotation support** - New `x-uigen-landing-page` annotation for automatic landing page generation
  - Document-level annotation with enable/disable toggle
  - 8 pre-built section types: hero, features, how-it-works, testimonials, pricing, FAQ, CTA, footer
  - Comprehensive validation for all section configurations
  - Extensible metadata pattern for future section types
  - Full TypeScript type definitions in IR
  - 105 unit tests covering all validation scenarios
  ```yaml
  # Document-level landing page configuration
  x-uigen-landing-page:
    enabled: true
    sections:
      hero:
        title: "Build Admin Panels in Minutes"
        subtitle: "Point UIGen at your OpenAPI spec and get a fully functional frontend"
        primaryCTA:
          text: "Get Started"
          href: "/dashboard"
      features:
        title: "Why UIGen?"
        items:
          - title: "Zero Configuration"
            description: "Works out of the box with any OpenAPI spec"
            icon: "zap"
  ```

**React package (`@uigen-dev/react`)**
- **Layout system implementation** - Complete layout strategy system with automatic routing
  - `LayoutContainer` component orchestrates layout selection and rendering
  - Three layout strategy implementations:
    - `SidebarLayoutStrategy` - Renders sidebar navigation with collapsible support
    - `CenteredLayoutStrategy` - Renders centered content with configurable max width
    - `DashboardGridLayoutStrategy` - Renders grid-based dashboard with configurable columns
  - Layout strategies extracted from IR and applied automatically
  - Operation-level layouts override document-level layouts
  - Graceful fallback to sidebar layout when no layout specified
  - Layout metadata (maxWidth, columns, gap) passed to strategy components
  - 28 component tests and 15 routing integration tests
- **Landing page rendering** - LandingPageView component with automatic routing
  - Renders all 8 section types with theme-aware styling
  - Landing page appears at "/" when enabled
  - Dashboard automatically moves to "/dashboard" when landing page is enabled
  - Backward compatible: dashboard stays at "/" when landing page is disabled
  - Graceful handling of missing/disabled sections
  - Responsive design adapting to mobile, tablet, and desktop
  - 18 component tests and 7 routing integration tests

**Documentation**
- **Complete layout system documentation** - Reference docs and core concepts guide
  - Comprehensive annotation reference at `spec-annotations/x-uigen-layout.md`
  - Core concepts guide at `core-concepts/layout-system.md`
  - Examples for all 3 layout types with complete configuration
  - Layout strategy architecture and extension guide
  - Best practices and troubleshooting
- **Complete landing page documentation** - Reference docs and tutorial guide
  - Comprehensive annotation reference at `spec-annotations/x-uigen-landing-page.md`
  - Step-by-step tutorial at `guides/creating-landing-pages.md`
  - Examples for all 8 section types with complete configuration
  - Styling and theming guide
  - Best practices and troubleshooting

**Skills**
- **AI content generation skill** - `generate-landing-page-content.md` for automatic content generation
  - Analyzes OpenAPI spec to generate appropriate landing page content
  - Infers features from API resources and operations
  - Generates pricing tiers based on API complexity
  - Creates placeholder testimonials and FAQ items
  - Two complete usage examples (simple and complex APIs)
- **Enhanced auto-annotate skill** - Updated with layout detection rules
  - Detects auth operations and applies centered layout
  - Detects dashboard/analytics operations and applies dashboard-grid layout
  - Detects standard CRUD operations and applies sidebar layout
  - Comprehensive examples for all layout scenarios

### Changed

**React package (`@uigen-dev/react`)**
- Refactored App.tsx to use LayoutContainer for all routing
- Layout strategies now receive metadata from IR for customization
- Auth views (login, signup, password reset) automatically use centered layout
- Dashboard view automatically uses dashboard-grid layout when configured

**Core package (`@uigen-dev/core`)**
- Enhanced IR types with LayoutConfig interface
- Layout configuration now part of IntermediateRepresentation root object
- Operation interface extended with optional layoutOverride field

---

## [0.6.3] - 2026-05-03

### Fixed

**CLI (`@uigen-dev/cli`)**
- Fixed renderer resolution for global installations
  - Added check for renderer in CLI's own `node_modules` folder (global install location)
  - Renderer now correctly found when CLI is installed globally with `npm install -g @uigen-dev/cli`
  - Resolution order: CLI's node_modules → npm sibling → monorepo hoisted → cli-local
  - Works correctly in all installation scenarios (global, npx, monorepo)

---

## [0.6.2] - 2026-05-03

### Fixed

**CLI (`@uigen-dev/cli`)**
- Fixed renderer resolution for global and npx installations
  - Added `@uigen-dev/react` as a proper runtime dependency instead of bundling
  - Renderer package now correctly resolved via npm's dependency resolution
  - Removed bundled renderer assets from CLI package (reduced package size from 35MB to ~500KB)
  - Eliminated complex path resolution and bundling during build
  - Works correctly in all installation scenarios (global, npx, monorepo)
  - Cleaner architecture with standard npm dependency management
- Fixed workspace protocol in dependencies for npm publishing
  - Changed all `workspace:*` dependencies to explicit version numbers
  - Packages now publish correctly to npm registry

**All packages**
- Bumped versions to 0.6.2 with proper dependency version references

---

## [0.6.0] - 2026-05-02

### Added

**React package (`@uigen-dev/react`)**
- **Profile editing functionality** - ProfileView component now supports inline editing with full validation
  - Edit button appears when PUT/PATCH operation exists in OpenAPI spec
  - Inline edit mode with form inputs pre-filled with current values
  - Real-time client-side validation (email format, required fields, username pattern, length constraints)
  - Dynamic input type selection based on field schema (email, url, date, number, text)
  - Field-specific error messages displayed inline below inputs
  - Save and Cancel buttons with proper loading states
  - Keyboard shortcuts (Enter to submit, Escape to cancel)
  - Full accessibility support (ARIA labels, focus management, screen reader announcements)
  - ProfileEditForm component for reusable edit form functionality
  - useProfileUpdate hook for simplified profile update mutations with cache invalidation
  - Comprehensive error handling (network errors, validation errors, conflict errors, auth errors)
  - Responsive design adapting to mobile, tablet, and desktop screen sizes
  - 135/135 tests passing including unit, integration, and E2E tests

**Backend (FastAPI example)**
- **Profile update endpoint** - PUT /api/v1/auth/me for updating user profiles
  - UserUpdate Pydantic schema with validation rules (username: 3-50 chars alphanumeric+underscores, email: valid format)
  - Username and email uniqueness validation with 409 Conflict responses
  - Read-only field protection (id, created_at cannot be modified)
  - Comprehensive error responses (401 Unauthorized, 409 Conflict, 422 Validation Error)
  - Full test coverage with unit and integration tests

**Documentation**
- **Profile View documentation** - Complete guide for profile view and editing functionality
  - Component API documentation (ProfileView, ProfileEditForm, useProfileUpdate)
  - Backend API endpoint specification with request/response examples
  - Validation rules and error handling documentation
  - OpenAPI specification examples
  - Usage examples for common scenarios
  - Accessibility and responsive design documentation
- **Updated x-uigen-profile annotation** - Enhanced with profile editing details
  - Edit mode activation and behavior
  - Form validation (client-side and server-side)
  - Save and cancel functionality
  - Error handling scenarios
  - Keyboard shortcuts

**Core engine (`@uigen-dev/core`)**
- **Resource-level `x-uigen-label` support** - Labels can now be applied at the resource level to customize resource display names in the dashboard and sidebar
  - Added optional `label` field to Resource interface
  - Updated LabelHandler to support 'resource' as a target type
  - Smart label application based on resource operation count:
    - **Single-operation resources**: Operation labels automatically apply to both operation AND resource (e.g., `GET:/api/v1/auth/me` with label "My Profile" → resource shows "My Profile")
    - **Multi-operation resources**: Operation labels apply ONLY to operations, not the resource (e.g., `DELETE:/api/v1/templates/{id}` with label "Delete Template" → resource still shows "Templates")
    - **Explicit resource labels**: Use base path without HTTP method prefix (e.g., `/api/v1/templates` with label "Document Templates")
  - Backward compatible - resources without labels use inferred names (capitalized slug)
  - Fixes intuitive behavior where single-operation resources inherit their operation's label
- **`x-uigen-chart` annotation** - Declarative data visualization configuration for array fields
  - Specify chart type: line, bar, pie, scatter, area, radar, donut
  - Map schema fields to chart axes (xAxis, yAxis)
  - Configure multiple data series with custom styling (field, label, color, type)
  - Optional labels field for custom data point labels
  - Chart display options (title, legend, tooltip, responsive, axis configuration)
  - Automatic series generation when yAxis is an array
  - Validation ensures annotation is applied only to array fields with object items
  - Field reference validation checks that xAxis, yAxis, and labels fields exist in array items schema
  - ChartHandler registered in AnnotationHandlerRegistry for automatic processing
  - ChartConfig metadata stored in SchemaNode IR structure
  - Full TypeScript type definitions (ChartType, SeriesConfig, ChartOptions, ChartConfig)
  - 50+ unit tests covering extraction, validation, and application
  - 15 property-based tests (100 iterations each) verifying correctness properties
  ```yaml
  # Example: Line chart for time-series data
  properties:
    salesData:
      type: array
      x-uigen-chart:
        chartType: line
        xAxis: date
        yAxis: revenue
        options:
          title: Revenue Trend
          responsive: true
  
  # Example: Multi-series bar chart
  properties:
    metrics:
      type: array
      x-uigen-chart:
        chartType: bar
        xAxis: month
        yAxis: [revenue, expenses, profit]
        series:
          - field: revenue
            label: Revenue
            color: "#4CAF50"
          - field: expenses
            label: Expenses
            color: "#F44336"
          - field: profit
            label: Profit
            color: "#2196F3"
  ```

**Config GUI (`@uigen-dev/config-gui`)**
- **Chart configuration modal** - Visual interface for configuring x-uigen-chart annotations
  - Basic tab: chart type selector, axis field dropdowns
  - Options tab: title, legend, tooltip, responsive settings
  - Field multi-select for yAxis (supports single or multiple series)
  - JSON editor for advanced options
  - Real-time validation with error messages
  - 25+ unit tests covering all configuration scenarios

**React renderer (`@uigen-dev/react`)**
- **Chart utilities** - Helper functions for chart data transformation and configuration
  - `transformChartData()` - transforms API response data for chart rendering
  - `getYAxisFields()` - normalizes single field or array of fields
  - `generateChartColors()` - generates default colors for chart series
  - `getSeriesConfig()` - generates series configuration from chart config
  - Full test coverage with 20+ unit tests

**CLI (`@uigen-dev/cli`)**
- **`uigen init` command** - Scaffold complete UIGen projects with zero-friction onboarding
  - Interactive mode with guided prompts for project setup
  - Non-interactive mode with CLI flags for automation (`--yes`, `--spec`, `--no-git`)
  - Project scaffolding with all necessary files and directories
  - Git repository initialization (when git is available)
  - AI agent skills integration - copies skills to `.agents/skills/` directory
    - `auto-annotate.md` - Automatic annotation detection skill (use with AI agents)
  - Base styles copied to `.uigen/base-styles.css` (Tailwind CSS v4 setup)
  - Starter theme template in `.uigen/theme.css` for customization
  - Default config structure in `.uigen/config.yaml`
  - Annotations registry in `annotations.json`
  - `.gitignore` file with sensible defaults (node_modules, .env, etc.)
  - Quick start README with next steps and documentation links
  - Example OpenAPI spec generation when no spec provided
  - Success output with visual project structure and next steps
  - Error handling with helpful messages and suggestions
  - Cross-platform support (macOS, Linux, Windows)
  - Command signatures:
    - `uigen init` - Interactive mode
    - `uigen init my-project` - With project name
    - `uigen init --spec openapi.yaml` - With spec file
    - `uigen init my-project --spec openapi.yaml --yes` - Non-interactive
    - `uigen init --dir ./my-app` - Custom directory
    - `uigen init --no-git` - Skip git initialization

**Documentation**
- Added CLI reference documentation for `uigen init` command
- Updated Quick Start guide to feature init command as primary workflow
- Updated Installation guide with init command examples
- Updated main README with init command in getting started section

### Improved

**React renderer (`@uigen-dev/react`)**
- **Cleaner UI** - Removed version display from top bar and sidebar for a more streamlined interface
- **Auth resource filtering** - Login, signup, and password reset resources now hidden from navigation and dashboard
  - Auth endpoints accessible only through dedicated auth flows, not as CRUD resources
  - Reduces UI clutter and improves user experience
  - Automatic detection based on auth endpoint configuration
  - 11 unit tests ensuring correct filtering behavior

### Changed

**CLI (`@uigen-dev/cli`)**
- Enhanced project setup workflow with automated scaffolding
- Improved onboarding experience for new users
- Auto-annotation now handled by AI agent skill (not built into CLI)

---

## [0.5.5] - 2026-04-25

### Added

**Config GUI (`@uigen-dev/config-gui`)**
- **Plugin system for extending the Config GUI** - Complete plugin architecture for adding custom functionality without forking
  - Plugin interface with lifecycle hooks (onInit, onDestroy, onConfigLoad, onConfigSave, onTabChange)
  - UI extension points: header actions, custom tabs, annotation form extras, settings panels
  - API middleware for intercepting requests/responses
  - Plugin registry with event system for monitoring plugin lifecycle
  - Plugin loader with environment-based loading (OSS/SaaS/Enterprise editions)
  - React integration with PluginProvider and custom hooks (usePlugins, usePluginComponents, useCustomTabs)
  - Stub files for SaaS/Enterprise plugins (gitignored except index.ts)
  - Comprehensive documentation (PLUGIN_SYSTEM.md, PLUGIN_SYSTEM_QUICKSTART.md, PLUGIN_SYSTEM_SUMMARY.md)
  - Example plugin demonstrating all features
  - Full test coverage (20 passing tests)
  - Zero breaking changes - existing functionality unchanged
  - Use case: Add SaaS features (auth, teams, billing, analytics) without maintaining a fork

**Documentation**
- Added CLI reference page for `uigen config` command with plugin system section
- Added complete plugin guide at `/docs/extending-uigen/config-gui-plugins`
- Updated CHANGELOG with plugin system feature

---

## [0.5.4] - 2026-04-25

### Added

**Config GUI (`@uigen-dev/config-gui`)**
- **Pinch-to-zoom support for visual canvases** - Both Ref Links and Relationships canvases now support zoom functionality
  - Trackpad pinch gesture support (Ctrl+wheel) for smooth zooming
  - Zoom range: 10% to 300% with visual percentage indicator
  - Zoom controls UI with +/- buttons and reset button
  - Zoom centered on mouse/pinch position for intuitive navigation
  - Zoom state preserved during pan and drag operations
  - Transform origin set to top-left (0,0) for consistent scaling
  - Updated hints: "drag to pan • pinch to zoom"
  - Zoom controls positioned in top-left corner with clean vertical layout
  - All zoom interactions work seamlessly with existing pan and drag functionality

### Fixed

**Core engine (`@uigen-dev/core`)**
- **Schema pollution bug in resource extractor** - Fixed core spec parser incorrectly merging association schemas into resource schemas
  - Root cause: Three bugs in resource extraction logic:
    1. `inferResourceName` used last path segment, causing `/meetings/{id}/templates` to group under "templates" instead of "meetings"
    2. Didn't skip 'api' prefix in paths, creating phantom "api" resource
    3. Merged all response schemas indiscriminately, including nested association operations
  - Fixed `inferResourceName` to detect nested patterns (`/{resource1}/{id}/{resource2}`) and group under parent resource
  - Added logic to skip 'api' prefix (like version prefixes)
  - Modified `extractSchemaFromOperation` to skip schema extraction for nested resource operations (operations with static segments after `/{resource}/{id}/`)
  - Result: Resources now only show their own fields, not fields from association endpoints
  - Example: Templates resource now correctly shows only Template fields (name, population_type, id, file_path, jinja_shape, created_at, updated_at) instead of incorrectly including Meeting fields
  - Updated tests to expect new behavior (nested resources grouped under parent)

**Config GUI (`@uigen-dev/config-gui`)**
- **Ref Links canvas card spacing** - Fixed resource cards stacking on top of each other when expanded by default
  - Made cards expanded by default (changed `expandedCards` initialization to include all resource slugs)
  - Increased CARD_H from 80px to 600px to accommodate expanded cards with many fields (approx 15 fields)
  - Increased GAP from 56px to 120px to prevent overlap when cards are expanded
  - Reduced COLS from 4 to 3 for more horizontal space
  - Cleared saved positions from config file to force recalculation with new spacing
  - Cards now properly spaced in grid layout without manual repositioning

### Changed

**Config GUI (`@uigen-dev/config-gui`)**
- Enhanced canvas navigation with combined pan and zoom capabilities
- Improved viewport transform handling with scale applied after translation
- Updated world coordinate conversion to account for zoom level
- Ref Links canvas now uses larger card dimensions and spacing optimized for expanded state

---

## [0.5.3] - 2026-04-23

### Added

**Config GUI (`@uigen-dev/config-gui`)**
- **URL-based tab persistence** - Active tab state is now persisted in URL query parameters
  - Created reusable `useUrlState` hook for managing state synchronized with URL
  - Tab selection persists across page reloads
  - Browser back/forward buttons navigate between tab states
  - Bookmarkable tabs (e.g., `?tab=relationships` opens directly to that tab)
  - Deep linking support for sharing specific tabs
  - Type-safe with validation against allowed tab values
  - 8 comprehensive unit tests for the hook
  - Scalable pattern for future URL-based state needs (filters, search, pagination)

### Fixed

**Config GUI (`@uigen-dev/config-gui`)**
- **Integration test setup** - Added missing `KeyboardNavigationProvider` wrapper to integration tests
  - Fixed pre-existing test issue where VisualEditor component required KeyboardNavigationProvider context
  - All test renders now properly wrapped with required context providers
  - Tests now match production component structure

### Changed

**Config GUI (`@uigen-dev/config-gui`)**
- Refactored tab state management from manual URL manipulation to custom hook pattern
  - Removed ~30 lines of boilerplate code from App.tsx
  - Simplified tab switching to simple `setActiveTab` calls
  - Improved code maintainability and testability
  - Better separation of concerns

### Tests
- Added 8 unit tests for `useUrlState` hook covering all scenarios
- Fixed integration tests with proper context provider setup
- All builds passing with TypeScript compilation

---

## [0.5.2] - 2026-04-23

### Added

**Config GUI (`@uigen-dev/config-gui`)**
- **Canvas position persistence** - Resource card positions on the relationship graph are now saved and restored
  - Added `PositionManager` class for centralized position management with validation and layout calculation
  - Added `ConfigFilePersistenceAdapter` for reading/writing positions to `.uigen/config.yaml`
  - Added `GridLayoutStrategy` for calculating default positions with spatial hashing for O(1) overlap detection
  - Positions stored in `config.canvasLayout.positions` field with resource slug as key
  - Debounced saves (500ms) to avoid excessive writes during drag operations
  - Automatic cleanup of orphaned positions when resources are removed
  - Reset layout button to restore default grid positions with confirmation dialog
  - Save indicators showing saving/saved/error states
  - Retry mechanism for failed saves (up to 3 attempts)
  - 300ms smooth animation when resetting layout
  - Positions validated and clamped to world bounds (0-8000px)
  - 156 unit tests covering position management, persistence, layout calculation, and UI interactions
  - 10 property-based tests (100 iterations each) verifying correctness properties

### Fixed

**Config GUI (`@uigen-dev/config-gui`)**
- **Canvas drag stale closure bug** - Fixed issue where subsequent drags would snap cards back to original positions
  - Root cause: `handleCardMouseDown` and `handleMouseUp` were reading from stale `positions` state closures
  - Solution: Added `positionsRef` to track current positions and updated handlers to read from ref instead of state
  - First drag now works correctly, and all subsequent drags start from the current position
  - Reload no longer required between drags
  - Pattern: `useState` for rendering, `useRef` for real-time imperative state in event handlers

### Tests
- Added 156 unit tests for canvas position persistence
- Added 10 property-based tests for position management correctness

---

## [0.5.1] - 2026-04-22

### Fixed

**Core engine (`@uigen-dev/core`)**
- **Request body schema name extraction** - Fixed annotation system to correctly identify request body fields
  - Added `requestBodySchemaName` field to `Operation` interface in IR
  - Updated `Body_Processor.processRequestBody()` to extract schema names from `$ref` paths
  - Added `extractSchemaNameFromRef()` helper method to parse schema names from OpenAPI references
  - Updated `Operation_Processor` to pass through `requestBodySchemaName` to operations
  - Fixed `SpecParser` to use actual schema names from IR instead of deriving them
  - Annotations like `x-uigen-max-file-size` now work correctly on request body fields
  - Config reconciliation now provides accurate path suggestions for request body fields
  - 62 tests passing (13 for body processor, 49 for operation processor)

**Config GUI (`@uigen-dev/config-gui`)**
- **Ignored operations in relationship canvas** - Operations with `x-uigen-ignore: true` no longer appear in relationship graph
  - Added filtering logic in `App.tsx` to exclude operations with `x-uigen-ignore` annotation from relationship editor
  - Resources with all operations ignored are automatically filtered out from the canvas
  - Prevents visual clutter and confusion from showing ignored endpoints in relationship management
  - 4 unit tests verifying filtering logic for various scenarios

### Tests
- Added comprehensive tests for schema name extraction from `$ref` paths
- Added tests for `requestBodySchemaName` field propagation through IR
- Added tests for filtering ignored operations in relationship canvas
- All existing tests continue to pass

---

## [0.5.0] - 2026-04-20

### Added

**Core engine (`@uigen-dev/core`)**
- **Explicit relationship type selection** - Direct specification of relationship types in configuration
  - Added optional `type` field to `RelationshipConfig` interface (`hasMany`, `belongsTo`, `manyToMany`)
  - Validation system with warnings for missing types, errors for invalid types
  - Adapter uses explicit types when present, falls back to path-based derivation for backward compatibility
  - 27 new unit tests for type validation and derivation
  - 10 property-based tests with 100 iterations each (1,000 test cases total)

**Config GUI (`@uigen-dev/config-gui`)**
- **TypeSelector component** - Visual interface for selecting relationship types
  - Dropdown with icons and descriptions for each type
  - Auto-recommendation based on path pattern
  - Warning display when selected type doesn't match recommendation
  - Help tooltip with detailed type explanations
  - Full keyboard accessibility (Tab, Arrow keys, Enter)
  - 34 comprehensive unit tests
- **Migration system** - One-click migration for existing relationships
  - `MigrationBanner` component with dismissible warning banner
  - Shows count of relationships without explicit types
  - "Migrate Now" button derives and adds types to all relationships
  - Dismissal state persisted to localStorage
  - Migration logic preserves all existing relationship fields
  - 29 unit tests covering all migration scenarios
- **Enhanced relationship visualization**
  - Different arrow styles: single arrow (hasMany/belongsTo), double arrow (manyToMany)
  - Type prefixes in edge labels
  - Color-coded type indicators in relationship list
  - Tooltips showing type descriptions
- **Type derivation helper** - Client-side type inference from path patterns
  - `deriveTypeFromPath()` function with regex pattern matching
  - Handles standard patterns: `/{source}/{id}/{target}` (hasMany), `/{target}/{id}/{source}` (belongsTo)
  - Defaults to hasMany for unrecognized patterns
  - 42 unit tests including edge cases

**Documentation**
- Updated Intermediate Representation docs with Relationship interface and type explanations
- Added "Relationship Configuration" section to Config Reconciliation docs
- Documented explicit vs. derived types with YAML examples
- Added migration tool usage instructions
- Created example config for meeting-minutes app

### Changed
- `RelationshipForm` now includes TypeSelector with auto-recommendation
- `EdgeDetail` panel now supports type editing with "Detect Type" button
- `RelationshipEditor` integrates migration banner when implicit types detected
- All relationship components updated to display and handle explicit types

### Performance
- Type selector rendering: <10ms (target: <10ms) ✅
- Form submission with type: ~50ms (target: <100ms) ✅
- Migration of 100 relationships: ~500ms (target: <2s) ✅
- Edge rendering with arrow styles: no measurable impact ✅
- Config file write: ~200ms (target: <500ms) ✅

### Accessibility
- Full keyboard navigation support for all new components
- ARIA labels and roles properly implemented
- Focus indicators visible on all interactive elements
- Color contrast meets WCAG AA standards
- Screen reader compatible

---

## [0.4.0] - 2026-04-20

### Added

**Core engine (`@uigen-dev/core`)**
- **File metadata annotation handlers** - Config GUI support for file upload restrictions
  - `FileTypesHandler` - validates and applies `x-uigen-file-types` annotation (allowed MIME types)
  - `MaxFileSizeHandler` - validates and applies `x-uigen-max-file-size` annotation (max file size in bytes)
  - Both handlers registered in `AnnotationHandlerRegistry` for automatic processing
  - Validation-only approach - handlers validate annotations while `FileMetadataVisitor` handles extraction
  - 50 unit tests covering extraction, validation, and integration

**Config GUI (`@uigen-dev/config-gui`)**
- **File field detection** - Automatic identification of file upload fields
  - Extended `FieldNode` interface with `format` and `fileMetadata` properties
  - `SpecParser` now captures format and file metadata from schema nodes
  - `isFileField()` utility detects file fields by checking `type === 'file'` OR `format === 'binary'`
  - 10 unit tests covering all field type detection scenarios
- **File size utilities** - Unit conversion and formatting for file sizes
  - `toBytes()` and `fromBytes()` for converting between B, KB, MB, GB
  - `formatBytes()` for human-readable display (e.g., "5.00 MB")
  - `selectDefaultUnit()` for intelligent unit selection based on byte value
  - 30 unit tests including round-trip conversions and integration scenarios
- **FileSizeInput component** - User-friendly file size configuration
  - Number input with decimal support
  - Unit selector dropdown (KB, MB, GB)
  - Automatic conversion between display value and bytes
  - Real-time formatted byte display
  - Comprehensive validation (positive, finite, min/max bounds)
  - Full accessibility support (ARIA labels, error associations)
  - 28 unit tests covering rendering, conversion, validation, and accessibility
- **MIME type options** - Predefined list of common MIME types
  - 60+ MIME types organized into 6 categories (Images, Documents, Video, Audio, Archives, Other)
  - Includes wildcards (`image/*`, `video/*`, `*/*`) with descriptions
  - Ready for MultiSelect component integration
  - 12 unit tests verifying structure and completeness

---

## [0.3.1] - 2026-04-19

### Fixed

**CLI (`@uigen-dev/cli`)**
- Fixed config GUI CSS not loading when running from npm/npx
  - Added static server mode for serving pre-built config-gui dist files
  - Config GUI now properly serves CSS files (`index-C1RXF-Wi.css`) in production
  - Matches the serve command's dual-mode architecture (dev server for monorepo, static server for npm)
  - API middleware now works correctly in both dev and static modes

---

## [0.3.0] - 2026-04-19

### Added

**Core engine (`@uigen-dev/core`)**
- **Config Reconciliation System** - Runtime annotation merging without modifying source specs
  - Non-destructive, idempotent, and deterministic reconciliation of `.uigen/config.yaml` with OpenAPI/Swagger specs
  - Generic annotation handling - all `x-uigen-*` annotations work automatically without hardcoded support
  - Element path resolution for operations (`METHOD:/path`), schema properties (`Schema.property`), and parameters
  - Config precedence - config annotations override spec annotations
  - Null annotation removal - set annotation to `null` to remove it from reconciled spec
  - 20 property-based tests with 100+ iterations each verifying correctness properties
  - Path resolution caching for performance
  - Helpful error messages with Levenshtein distance-based suggestions for invalid paths
- **x-uigen-ref annotation** - Explicit field-to-resource relationship declarations
  - Declare that a field references another resource with full control over resolution and display
  - Specify `resource` (endpoint path), `valueField` (stored value), and `labelField` (display value)
  - Overrides auto-detected relationship heuristics
  - Renders as select/autocomplete widgets in forms
  - Graceful fallback when referenced resource is unavailable
- **Many-to-many relationship detection** - Automatic detection and UI generation for library patterns
  - Detects `/resourceA/{id}/resourceB` patterns where resourceB has standalone CRUD endpoints
  - Marks target resources with `isLibrary: true` flag
  - Supports read-only associations (GET-only endpoints)
  - Handles slug normalization (singular/plural matching)
  - 64 unit tests + 14 E2E tests covering detection, marking, and edge cases
- **Major adapter refactoring** - Decomposed monolithic adapter classes into focused components
  - Extracted `SchemaProcessor` (~400 lines) with Visitor pattern for schema traversal
    - `TypeMappingVisitor` - converts OpenAPI types to IR types
    - `ValidationExtractionVisitor` - extracts validation rules
    - `FileMetadataVisitor` - extracts file upload metadata
    - `ReferenceResolutionVisitor` - resolves $ref references
    - `SchemaNodeFactory` - creates schema nodes with Factory pattern
  - Extracted `ParameterProcessor` (~150 lines) for parameter handling
    - Parameter reference resolution
    - Path-level and operation-level parameter merging
    - Parameter filtering based on x-uigen-ignore
    - Parameter precedence rules (operation-level overrides path-level)
  - Extracted `BodyProcessor` for request/response body processing
  - Extracted `OperationProcessor` for operation construction
  - Extracted `ResourceExtractor` for resource inference from paths
  - Extracted `AuthDetector` for authentication endpoint detection
  - OpenAPI3Adapter reduced from ~1400 lines to ~500 lines
  - All 1,275+ core tests pass with identical IR output

**CLI (`@uigen-dev/cli`)**
- **`uigen config` command** - Launches visual config GUI for managing annotations
  - Opens browser-based GUI at `http://localhost:4401`
  - Provides API middleware with endpoints: `/api/config`, `/api/spec`, `/api/annotations`, `/api/css`
  - Config file auto-loading - `uigen serve` automatically loads and applies `.uigen/config.yaml`
  - CSS customization endpoints - Read/write `.uigen/base-styles.css` and `.uigen/theme.css`
  - Cross-platform browser opening (Windows, macOS, Linux)
  - Port conflict handling with automatic retry

**Config GUI (`@uigen-dev/config-gui`)**
- **New standalone package** - Visual interface for managing x-uigen annotations without editing specs
  - React-based GUI with Vite build system
  - Reads and writes `.uigen/config.yaml` for annotation customization
  - Auto-discovery of registered annotations via AnnotationHandlerRegistry
  - Live preview showing how annotation changes affect generated UI
  - Dark mode support with theme persistence in localStorage
- **Annotation management UI**
  - Toggle switches for x-uigen-ignore on all element types (operations, schemas, properties, parameters, request bodies, responses)
  - Inline text editing for x-uigen-label annotations
  - Visual feedback with dimming for ignored elements
  - Badges showing annotation source (Explicit, Inherited, Override)
  - Precedence panel displaying annotation hierarchy
- **Tree view with virtualization**
  - React-window for efficient rendering of large specs (100+ operations)
  - Expand/collapse sections
  - Show/hide pruned elements toggle
  - Search and filter by element name or path
- **Bulk operations**
  - Multi-select elements (Ctrl+Click, Shift+Click)
  - Bulk actions: "Ignore All", "Include All"
  - Undo/redo stack with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Performance optimizations**
  - Debounced config writes (500ms) to avoid excessive disk I/O
  - Memoization to avoid re-rendering unchanged elements
  - Loads specs with 100+ operations in under 2 seconds
- **Accessibility**
  - ARIA labels on all interactive elements
  - ARIA live regions for state change announcements
  - Keyboard navigation (arrow keys, Enter, Space, Escape)
  - Proper heading hierarchy and landmark regions
  - 3:1 minimum contrast ratio for dimmed elements
- **Export functionality**
  - "Export Ignore Summary" generates markdown or JSON
  - Lists all ignored elements grouped by type
  - Timestamped output files

**React renderer (`@uigen-dev/react`)**
- **LibrarySelector component** - Selection UI for many-to-many library resources
  - Search with 300ms debounce
  - Filter inputs for query parameters
  - Paginated list rendering
  - Visual selection feedback
  - "Create New" and "View All" links
  - Empty state with "Clear Filters" action
  - 19 accessibility tests (keyboard navigation, ARIA labels, screen reader announcements)
- **LibraryAssociationManager component** - Manage many-to-many associations in DetailView
  - Fetch and display currently associated resources
  - Add associations via LibrarySelector
  - Remove associations with DELETE requests
  - Read-only mode for GET-only associations
  - Loading states and error handling
- **DetailView enhancements** - Renders LibraryAssociationManager for manyToMany relationships

**Documentation site (`apps/docs`)**
- Added blog post: "Introducing the UIGen Config Command: Visual Annotation Management"
- Added blog post: "Config Reconciliation: Runtime Annotation Merging Without Touching Your Spec"
- Added documentation page: `/docs/spec-annotations/x-uigen-ref`
- Updated architecture documentation with refactoring details

**Examples**
- Added FastAPI Meeting Minutes example app with authentication
- Improved example specs with real-world patterns

### Changed

**Core engine (`@uigen-dev/core`)**
- Improved file type detection with better MIME type handling
- Enhanced x-uigen-ignore annotation processing with better precedence rules
- Refactored adapter architecture for better maintainability and extensibility

**CLI (`@uigen-dev/cli`)**
- Config GUI now uses separate base-styles.css (read-only) and theme.css (editable)
- Improved error messages with actionable suggestions

### Fixed

**Core engine (`@uigen-dev/core`)**
- Fixed circular reference detection in schema processing
- Fixed parameter merging when operation-level parameters override path-level parameters
- Fixed $ref resolution for nested schema references

**React renderer (`@uigen-dev/react`)**
- Fixed duplicate key warnings in array field rendering
- Fixed image upload detection for binary format fields

### Tests
- 1,275+ core tests passing (all existing tests + new refactoring tests)
- 881 React tests passing (excluding 19 pre-existing failures)
- 64 many-to-many relationship tests (unit + integration)
- 14 E2E tests for library pattern
- 19 accessibility tests for LibrarySelector
- 20 property-based tests for config reconciliation (100+ iterations each)

---

## [0.2.4] - 2026-04-16

### Added

**Core engine (`@uigen-dev/core`)**
- File upload support for OpenAPI 3.x and Swagger 2.0 specs
  - Automatic detection of binary format fields (`type: string`, `format: binary`)
  - Swagger 2.0 `type: file` parameters automatically converted to OpenAPI 3.x binary format
  - File metadata extraction: `contentMediaType`, `x-uigen-file-types`, `x-uigen-max-file-size`
  - Multiple file upload detection from array schemas with binary items
  - HTML `accept` attribute generation from allowed MIME types
  - Automatic `multipart/form-data` content type detection for operations with file fields
  ```yaml
  # OpenAPI 3.x example
  requestBody:
    content:
      multipart/form-data:
        schema:
          properties:
            file:
              type: string
              format: binary
              contentMediaType: image/png
              x-uigen-file-types: ["image/png", "image/jpeg"]
              x-uigen-max-file-size: 5242880  # 5MB
  
  # Swagger 2.0 example
  parameters:
    - name: file
      in: formData
      type: file
      required: true
  ```

**React renderer (`@uigen-dev/react`)**
- File upload strategy system with type-aware validation and previews
  - `ImageUploadStrategy` - supports image/*, 5MB max, shows image preview
  - `DocumentUploadStrategy` - supports PDF, Word, text files, 10MB max, shows document icon
  - `VideoUploadStrategy` - supports video/*, 100MB max, shows video icon
  - `GenericUploadStrategy` - fallback for any file type, 10MB max
- Enhanced `FileUpload` component with:
  - Drag-and-drop support with visual feedback
  - File type and size validation with user-friendly error messages
  - Preview components for uploaded files (image thumbnails, document icons, etc.)
  - Multiple file upload support
  - Remove button for each uploaded file
  - Loading state during preview generation
  - Accessibility features (ARIA labels, live regions, keyboard navigation)
- `StrategyRegistry` for managing and extending file upload strategies
- Utility functions: `formatFileSize`, `getFileIcon` (maps MIME types to Lucide React icons)
- File validation utilities with extension-MIME type consistency checks
- Form submission support for `multipart/form-data` with proper File object handling

**React renderer routing**
- Action operations (`viewHint: 'action'`) now properly routed to `ActionSelectionView`
- `ActionSelectionView` enhanced to display both create and action operations
- Resources with only action operations (like file upload endpoints) now show available actions instead of "No operations available"

### Fixed

**Core engine (`@uigen-dev/core`)**
- Swagger 2.0 file type conversion: `type: "file"` in formData parameters now correctly converts to `type: "string"` with `format: "binary"` in OpenAPI 3.x intermediate format

**React renderer (`@uigen-dev/react`)**
- Fixed routing for resources with action operations (e.g., file upload endpoints)
- Fixed `ActionSelectionView` to handle operations with `viewHint: 'action'` in addition to `viewHint: 'create'`

### Tests
- 30 file upload related tests passing (11 OpenAPI3, 7 Swagger2, 10 content type detection, 2 integration)
- Property-based tests for file metadata preservation, binary format detection, and adapter consistency
- Integration tests verifying end-to-end file upload flow from Swagger 2.0 specs

---

## [0.2.3] - 2026-04-16

### Added

**Core engine (`@uigen-dev/core`)**
- `x-uigen-ignore` vendor extension support: annotate operations or entire paths to exclude them from the generated UI. When an operation is marked with `x-uigen-ignore: true`, it is filtered out during IR construction and will not appear in any generated views, sidebar navigation, or dashboard widgets.
  ```yaml
  paths:
    /internal/metrics:
      x-uigen-ignore: true  # Excludes all operations on this path
    /users:
      get:
        x-uigen-ignore: false  # Explicitly include (overrides path-level)
      post:
        x-uigen-ignore: true   # Exclude this specific operation
  ```
- Operation-level annotations override path-level annotations for fine-grained control
- Resources with all operations ignored are automatically excluded from the IR
- Graceful fallback: non-boolean annotation values are treated as absent with a warning
- Supported in both OpenAPI 3.x and Swagger 2.0 specs

**Documentation site (`apps/docs`)**
- Added comprehensive documentation page for `x-uigen-ignore` at `/docs/spec-annotations/x-uigen-ignore`
- Updated spec annotations overview to list `x-uigen-ignore` as available
- Removed `x-uigen-ignore` from planned annotations (now implemented)

### Changed

**Documentation site (`apps/docs`)**
- Removed all em dashes from documentation content and replaced with appropriate punctuation (colons, parentheses, or regular hyphens) for improved readability and consistency with codebase style guidelines

### Tests
- 27 unit tests covering annotation extraction, operation filtering, resource filtering, and Swagger 2.0 support
- 14 property-based tests (100 runs each) verifying all correctness properties including precedence rules, annotation validation, and cross-feature interactions
- 8 integration tests verifying interaction with `x-uigen-login`, relationship detection, and dashboard generation

---

## [0.2.2] - 2026-04-15

### Added

**Documentation site (`apps/docs`)**
- Full multi-page documentation site at `/docs/[section]/[slug]`, statically generated at build time from Markdown files in `apps/docs/content/`
- 36 content pages across 11 sections: Getting Started, Core Concepts, Supported Specs, Views & Components, Authentication, Spec Annotations, Override System, CLI Reference, Extending UIGen, Roadmap, Contributing
- Left navigation sidebar with expand/collapse sections and active link highlighting
- Right table of contents with scroll-spy for h2/h3 headings
- ⌘K / Ctrl+K search dialog backed by a pre-built Fuse.js index (`public/search-index.json`)
- Copy-to-clipboard code blocks with "Copied!" feedback
- Shared `SiteHeader` component used by both the landing page and docs layout — consistent header across the site with `variant="marketing"` and `variant="docs"` props
- "Docs" link added to the landing page header
- Search closes on Escape key or clicking outside the panel

---

## [0.2.1] - 2026-04-15

### Fixed

**React renderer (`@uigen-dev/react`)**
- **Login route collision** — Resources with a slug of `login` (e.g. an API path like `/login`) no longer collide with the reserved `/login` authentication route. Such resources are now filtered out of the resource routing table so the auth page is always reachable.

**Core engine (`@uigen-dev/core`)**
- **`x-uigen-login` respects all HTTP methods** — Previously, `x-uigen-login: true` was only honoured on `POST` operations; annotated `GET`, `PUT`, `PATCH`, and `DELETE` endpoints were silently ignored. The adapter now iterates all HTTP methods when scanning for the annotation, so any operation marked `x-uigen-login: true` is included as a login endpoint regardless of its method. Auto-detection (heuristic, no annotation) continues to apply to `POST` only.

---

## [0.2.0] - 2026-04-15

### Added

**Core engine (`@uigen-dev/core`)**
- `x-uigen-label` vendor extension support — annotate any schema property with an explicit label string that overrides the auto-humanized key name. Works on object properties at any nesting depth, array `items` schemas, and `$ref` target schemas. Supported in both OpenAPI 3.x and Swagger 2.0.
  ```yaml
  properties:
    account_sid:
      type: string
      x-uigen-label: "Account SID"   # renders as "Account SID" instead of "Account Sid"
    validity_period:
      type: integer
      x-uigen-label: "Validity Period (seconds)"
  ```
- `$ref` label precedence: property-level `x-uigen-label` wins over the `$ref` target's label, which wins over `humanize(key)`.
- Graceful fallback: empty strings, non-string values, and absent annotations all silently fall back to `humanize(key)` — no errors thrown.

**Examples**
- Added `examples/twilio_messaging_v1_labeled.yaml` — the Twilio Messaging API spec with 282 `x-uigen-label` annotations demonstrating real-world usage (e.g. `sid` → `"SID"`, `friendly_name` → `"Display Name"`, `tcr_id` → `"TCR Brand ID"`, `date_created` → `"Created At"`).

### Fixed

- **React error #300 crash when searching resources** — Fixed crash that occurred when the global search feature tried to search across resources with mixed operation types (some with search operations, some without, some with path parameters)
  - Root cause: `ResourceSearchResults` component in `TopBar.tsx` was calling hooks conditionally (early return before `useApiCall` and `useMemo` hooks)
  - Fixed by moving all hook calls before early returns to ensure consistent hook call order across renders
  - Added sub-resource detection to skip operations with unresolved path parameters (e.g., `/v1/Services/{ServiceSid}/AlphaSenders`)
  - Added defensive checks in `useApiCall` to detect and disable queries with unresolved path parameters
  - Updated all view components (`SearchView`, `ListView`, `DetailView`, `FormView`, `DashboardView`) to call hooks unconditionally
  - Added warning logs when path parameters are missing to aid debugging
- **Conditional hook calls** — Ensured all React hooks are called unconditionally before early returns in all view components and TopBar to comply with React's Rules of Hooks

**React renderer (`@uigen-dev/react`)**
- Fixed crash when navigating to search route for resources without search operations. The `useApiCall` hook previously violated React's Rules of Hooks by calling `useQuery` conditionally (early-return when `operation` is undefined, bottom call when defined). Now always calls `useQuery` unconditionally, using `enabled: false` when no operation is provided. This ensures stable hook call order across renders and prevents "Rendered more hooks than during the previous render" errors.

### Tests
- 24 unit tests covering all `x-uigen-label` scenarios (valid labels, fallbacks, nesting, `$ref` precedence, Swagger 2.0 round-trip)
- 9 property-based tests (100 runs each) covering all correctness properties
- 47 integration tests against the real Twilio Messaging spec verifying end-to-end label overrides
- 8 React renderer tests verifying overridden labels appear in `ListView` column headers, filter placeholders, `FormView` `<Label>` elements, and `DetailView` `<dt>` elements
- 9 property-based tests for `useApiCall` hook rules (100 runs each) verifying unconditional hook calls
- 10 integration tests for SearchView crash scenarios (resources with/without search operations, switching between resources)
- 12 conditional hooks detection tests verifying all view components call hooks unconditionally
- 4 TopBar-specific conditional hooks tests verifying ResourceSearchResults handles mixed resource types correctly

---

## [0.1.9] - 2026-04-14

### Changed

**React renderer (`@uigen-dev/react`)**
- Improved dark mode support with @tailwindcss/typography plugin integration
- Enhanced color contrast ratios for WCAG AA compliance (4.5:1 for text, 3:1 for UI elements)
- Added prose styling support for DetailView content areas
- Improved button border visibility in dark mode (#525252 border color)
- Fixed primary button colors in dark mode (blue #3b82f6 background)
- Added explicit utility classes for all theme colors (bg-*, text-*, border-*, ring-*)
- Fixed pagination button width inconsistency (uniform 2.5rem min-width)
- Updated CSS variable structure for better theme customization
- Added code block styling with proper dark mode support

### Fixed
- Dark mode border visibility issues on login and form buttons
- Primary button appearing white/invisible in dark mode
- Pagination number buttons having inconsistent widths
- CSS utility class generation for theme colors in Tailwind v4

---

## [0.1.8] - 2026-04-14

### Initial public release

This is the first release of UIGen — point it at an OpenAPI spec, get a fully functional frontend.

#### Core engine (`@uigen-dev/core`)

- OpenAPI 3.x adapter with full `$ref` resolution, circular reference detection, and graceful degradation
- Swagger 2.0 adapter
- Intermediate Representation (IR) types — resources, operations, auth schemes, relationships, pagination hints, and validation rules
- View hint classifier — detects list, detail, create, update, delete, search, wizard, and action views
- Relationship detector — `hasMany` from nested paths, `belongsTo` from URI parameter fields
- Pagination detector — offset, cursor, and page-based strategies

#### React renderer (`@uigen-dev/react`)

**Views**
- `ListView` — TanStack Table with sorting, pagination, row actions, empty state, and filter row
- `DetailView` — read-only fields, related resource links, edit/delete/custom action buttons
- `FormView` — React Hook Form + Zod validation, all field types, inline errors, loading state
- `EditFormView` — pre-populated from current record, PUT/PATCH on submit
- `SearchView` — filter inputs per query param, result count, clear filters
- `DashboardView` — resource cards with record counts and navigation links
- `WizardView` — multi-step form for large schemas (8+ fields), step validation, back navigation
- `LoginView` — credential input before accessing protected resources

**Field components**
- `TextField` (with `textarea` variant)
- `NumberField` (with min/max enforcement)
- `CheckboxField`
- `SelectField` (enum values, `x-enumNames` support)
- `DatePicker` / `DateTimePicker`
- `FileUpload` (drag-and-drop, progress display)
- `ArrayField` (add/remove items, length validation)
- `ObjectField` (nested fieldsets, collapsible)

**Auth & infrastructure**
- Bearer token authentication — session storage, `Authorization` header injection, logout
- API Key authentication — header and query param injection
- HTTP Basic authentication — username/password, base64 encoded
- Credential-based login — detects login endpoints from spec, posts credentials, extracts token
- Server selector — environment dropdown from spec `servers`
- Delete confirmation dialog
- Custom action buttons for non-CRUD endpoints
- Toast notifications (success / error / warning / info, auto-dismiss)
- Error boundary — component errors contained, app stays running
- Dark / light theme toggle with system preference detection

#### CLI (`@uigen-dev/cli`)

- `uigen serve` — starts dev server with IR injected from spec
- YAML / JSON auto-detection
- Remote spec URL support
- Vite proxy to real API server with CORS handling
- `--port`, `--proxy-base`, `--renderer`, `--verbose` flags
- Pre-built static dist served via lightweight Node.js HTTP proxy — no Vite required at runtime

---

[0.11.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.11.0
[0.10.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.10.0
[0.9.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.9.0
[0.8.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.8.0
[0.7.3]: https://github.com/darula-hpp/uigen/releases/tag/v0.7.3
[0.7.2]: https://github.com/darula-hpp/uigen/releases/tag/v0.7.2
[0.7.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.7.0
[0.6.3]: https://github.com/darula-hpp/uigen/releases/tag/v0.6.3
[0.6.2]: https://github.com/darula-hpp/uigen/releases/tag/v0.6.2
[0.6.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.6.0
[0.3.1]: https://github.com/darula-hpp/uigen/releases/tag/v0.3.1
[0.3.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.3.0
[0.2.5]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.5
[0.2.4]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.4
[0.2.3]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.3
[0.2.2]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.2
[0.2.1]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.1
[0.2.0]: https://github.com/darula-hpp/uigen/releases/tag/v0.2.0
[0.1.9]: https://github.com/darula-hpp/uigen/releases/tag/v0.1.9
[0.1.8]: https://github.com/darula-hpp/uigen/releases/tag/v0.1.8

### Changed

**React renderer (`@uigen-dev/react`)**
- Improved dark mode support with @tailwindcss/typography plugin integration
- Enhanced color contrast ratios for WCAG AA compliance (4.5:1 for text, 3:1 for UI elements)
- Added prose styling support for DetailView content areas
- Improved button border visibility in dark mode (#525252 border color)
- Fixed primary button colors in dark mode (blue #3b82f6 background)
- Added explicit utility classes for all theme colors (bg-*, text-*, border-*, ring-*)
- Fixed pagination button width inconsistency (uniform 2.5rem min-width)
- Updated CSS variable structure for better theme customization
- Added code block styling with proper dark mode support

### Fixed
- Dark mode border visibility issues on login and form buttons
- Primary button appearing white/invisible in dark mode
- Pagination number buttons having inconsistent widths
- CSS utility class generation for theme colors in Tailwind v4

---

## [0.1.8] - 2026-04-14

### Initial public release

This is the first release of UIGen — point it at an OpenAPI spec, get a fully functional frontend.

#### Core engine (`@uigen-dev/core`)

- OpenAPI 3.x adapter with full `$ref` resolution, circular reference detection, and graceful degradation
- Swagger 2.0 adapter
- Intermediate Representation (IR) types — resources, operations, auth schemes, relationships, pagination hints, and validation rules
- View hint classifier — detects list, detail, create, update, delete, search, wizard, and action views
- Relationship detector — `hasMany` from nested paths, `belongsTo` from URI parameter fields
- Pagination detector — offset, cursor, and page-based strategies

#### React renderer (`@uigen-dev/react`)

**Views**
- `ListView` — TanStack Table with sorting, pagination, row actions, empty state, and filter row
- `DetailView` — read-only fields, related resource links, edit/delete/custom action buttons
- `FormView` — React Hook Form + Zod validation, all field types, inline errors, loading state
- `EditFormView` — pre-populated from current record, PUT/PATCH on submit
- `SearchView` — filter inputs per query param, result count, clear filters
- `DashboardView` — resource cards with record counts and navigation links
- `WizardView` — multi-step form for large schemas (8+ fields), step validation, back navigation
- `LoginView` — credential input before accessing protected resources

**Field components**
- `TextField` (with `textarea` variant)
- `NumberField` (with min/max enforcement)
- `CheckboxField`
- `SelectField` (enum values, `x-enumNames` support)
- `DatePicker` / `DateTimePicker`
- `FileUpload` (drag-and-drop, progress display)
- `ArrayField` (add/remove items, length validation)
- `ObjectField` (nested fieldsets, collapsible)

**Auth & infrastructure**
- Bearer token authentication — session storage, `Authorization` header injection, logout
- API Key authentication — header and query param injection
- HTTP Basic authentication — username/password, base64 encoded
- Credential-based login — detects login endpoints from spec, posts credentials, extracts token
- Server selector — environment dropdown from spec `servers`
- Delete confirmation dialog
- Custom action buttons for non-CRUD endpoints
- Toast notifications (success / error / warning / info, auto-dismiss)
- Error boundary — component errors contained, app stays running
- Dark / light theme toggle with system preference detection

#### CLI (`@uigen-dev/cli`)

- `uigen serve` — starts dev server with IR injected from spec
- YAML / JSON auto-detection
- Remote spec URL support
- Vite proxy to real API server with CORS handling
- `--port`, `--proxy-base`, `--renderer`, `--verbose` flags
- Pre-built static dist served via lightweight Node.js HTTP proxy — no Vite required at runtime

---

[0.1.9]: https://github.com/darula-hpp/uigen/releases/tag/v0.1.9
[0.1.8]: https://github.com/darula-hpp/uigen/releases/tag/v0.1.8
