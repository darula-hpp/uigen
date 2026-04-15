---
title: HTTP Basic
description: HTTP Basic authentication with UIGen.
---

# HTTP Basic

UIGen auto-detects HTTP Basic authentication from `http` security schemes with `scheme: basic`.

## Spec example

```yaml
components:
  securitySchemes:
    BasicAuth:
      type: http
      scheme: basic

security:
  - BasicAuth: []
```

## UI behaviour

UIGen renders a username and password form. On submit, the credentials are Base64-encoded as `username:password` and stored in `sessionStorage`.

The proxy injects the credentials into forwarded requests as:

```
Authorization: Basic <base64(username:password)>
```

## Security note

HTTP Basic credentials are stored in `sessionStorage` and cleared when the tab is closed. UIGen is designed for development and internal tooling — do not use it as a production authentication layer.

## Swagger 2.0

Swagger 2.0 does not have a native `basic` scheme type. Basic auth in Swagger 2.0 is typically modelled as:

```yaml
securityDefinitions:
  BasicAuth:
    type: basic
```

UIGen detects this and renders the same username/password form.
