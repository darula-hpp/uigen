---
title: API Key
description: API Key authentication with UIGen.
---

# API Key

UIGen auto-detects API Key authentication from `apiKey` security schemes. The key can be sent in a header, query parameter, or cookie.

## Spec example (header)

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

security:
  - ApiKeyAuth: []
```

## Spec example (query parameter)

```yaml
components:
  securitySchemes:
    ApiKeyQuery:
      type: apiKey
      in: query
      name: api_key

security:
  - ApiKeyQuery: []
```

## UI behaviour

UIGen renders an API key input form. The user enters their key and clicks **Connect**. The key is stored in `sessionStorage`.

The proxy injects the key into forwarded requests:

- **`in: header`** — added as a custom request header with the name from the scheme
- **`in: query`** — appended as a query parameter to the target URL
- **`in: cookie`** — set as a `Cookie` header (note: cookie injection has browser security limitations in some environments)

## Swagger 2.0

```yaml
securityDefinitions:
  ApiKeyAuth:
    type: apiKey
    in: header
    name: X-API-Key
```
