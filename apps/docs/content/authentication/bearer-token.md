---
title: Bearer Token
description: Bearer token authentication with UIGen.
---

# Bearer Token

UIGen auto-detects Bearer token authentication from `http` security schemes with `scheme: bearer`.

## Spec example

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

## UI behaviour

When UIGen detects a Bearer scheme, it renders a token input form before the main UI. The user pastes their token and clicks **Connect**. The token is stored in `sessionStorage` and injected into all subsequent API requests via the proxy as `Authorization: Bearer <token>`.

## Swagger 2.0

```yaml
securityDefinitions:
  BearerAuth:
    type: apiKey
    in: header
    name: Authorization
```

In Swagger 2.0, Bearer tokens are typically modelled as an `apiKey` in the `Authorization` header. UIGen detects this pattern and renders the same token input form.
