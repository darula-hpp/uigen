---
title: Login View
description: Credential-based login form generated from x-uigen-login annotations.
---

# Login View

The Login View is a credential-based login form. It is generated when an endpoint is annotated with `x-uigen-login: true` in the spec. This is used for APIs that require a username/password login to obtain a token.

## When it appears

The Login View appears when:

1. The spec has a `securitySchemes` entry requiring authentication
2. At least one endpoint is annotated with `x-uigen-login: true`

Without the annotation, UIGen renders a token input form instead (for Bearer/API Key schemes).

## Features

- **Auto-generated fields** — the form fields are derived from the login endpoint's `requestBody` schema
- **Token extraction** — after a successful login, UIGen extracts the token from the response using the `x-uigen-token-path` annotation
- **Session storage** — the token is stored in session storage and injected into subsequent API requests via the proxy
- **Error handling** — login errors are displayed inline

## Example

See [Credential Login](/docs/authentication/credential-login) for a full example with YAML annotations.

## Customisation

Replace the Login View:

```typescript
overrideRegistry.register({
  id: 'auth.login',
  mode: 'component',
  component: MyCustomLoginForm,
});
```
