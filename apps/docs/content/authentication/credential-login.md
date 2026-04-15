---
title: Credential Login
description: Custom login endpoint with x-uigen-login annotation.
---

# Credential Login

Some APIs require a login call to obtain a token (for example, `POST /auth/login` with a username and password that returns a JWT). UIGen supports this via the `x-uigen-login` annotation.

## How it works

1. Annotate your login endpoint with `x-uigen-login: true`
2. Annotate the response field that contains the token with `x-uigen-token-path`
3. UIGen generates a login form from the request body schema
4. On successful login, UIGen extracts the token from the response and stores it in `sessionStorage`
5. All subsequent requests are authenticated with the extracted token

## Spec example (OpenAPI 3.x)

```yaml
paths:
  /auth/login:
    post:
      summary: Login
      x-uigen-login: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [username, password]
              properties:
                username:
                  type: string
                password:
                  type: string
                  format: password
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                    x-uigen-token-path: token
```

## Spec example (Swagger 2.0)

```yaml
paths:
  /auth/login:
    post:
      summary: Login
      x-uigen-login: true
      parameters:
        - in: body
          name: body
          schema:
            type: object
            required: [username, password]
            properties:
              username:
                type: string
              password:
                type: string
      responses:
        200:
          schema:
            type: object
            properties:
              access_token:
                type: string
                x-uigen-token-path: access_token
```

## Token path

The `x-uigen-token-path` annotation specifies the dot-notation path to the token in the response body. For example:

- `token`: `response.token`
- `data.access_token`: `response.data.access_token`
- `auth.tokens.bearer`: `response.auth.tokens.bearer`

## Related

- [Authentication Overview](/docs/authentication/overview)
- [x-uigen-login annotation](/docs/spec-annotations/overview)
