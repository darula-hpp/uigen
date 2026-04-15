---
title: Authentication Overview
description: How UIGen auto-detects and handles authentication from your spec.
---

# Authentication

UIGen auto-detects authentication requirements from the `securitySchemes` section of your spec and generates the appropriate UI — no configuration required.

## Auto-detection

When UIGen parses your spec, it reads `components/securitySchemes` (OpenAPI 3.x) or `securityDefinitions` (Swagger 2.0) and builds an `AuthConfig` in the IR. If `globalRequired` is true (i.e. the spec has a top-level `security` requirement), UIGen shows an authentication prompt before allowing access to the generated UI.

## Supported schemes

| Scheme | Description |
|---|---|
| [Bearer Token](/docs/authentication/bearer-token) | `http` scheme with `bearer` type |
| [API Key](/docs/authentication/api-key) | `apiKey` scheme in header, query, or cookie |
| [HTTP Basic](/docs/authentication/http-basic) | `http` scheme with `basic` type |
| [Credential Login](/docs/authentication/credential-login) | Custom login endpoint via `x-uigen-login` |

## Session storage

Credentials are stored in the browser's `sessionStorage` under UIGen-specific keys. They are cleared when the browser tab is closed. This is intentional — UIGen is designed for development and internal tooling, not production user-facing apps.

## Proxy injection

The CLI's built-in proxy reads credentials from UIGen-specific request headers and injects them into the forwarded request:

| UIGen header | Forwarded as |
|---|---|
| `x-uigen-auth` | `Authorization: Bearer <token>` |
| `x-uigen-basic-auth` | `Authorization: Basic <credentials>` |
| `x-uigen-api-key` + `x-uigen-api-key-name` | Custom header or query param |

The UIGen-specific headers are stripped before the request reaches your API.

## Multiple schemes

If your spec defines multiple security schemes, UIGen renders a scheme selector so the user can choose which one to use.
