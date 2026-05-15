---
title: x-uigen-http-method-override
description: Force operations to use specific HTTP methods during reconciliation to correct spec discrepancies.
---

# x-uigen-http-method-override

The HTTP method override annotations allow you to force operations to use specific HTTP methods during reconciliation. This is useful when your OpenAPI specification contains incorrect HTTP methods that don't match your actual API implementation.

## Purpose

Use HTTP method overrides when:

- Your OpenAPI spec defines the wrong HTTP method for an endpoint
- You cannot modify the original spec (auto-generated or maintained by another team)
- The method mismatch causes incorrect UI generation or API calls
- You need to correct method discrepancies without editing the source spec

## Available Annotations

UIGen provides five HTTP method override annotations:

| Annotation | Target Method | Use Case |
|---|---|---|
| `x-uigen-http-get` | GET | Force operation to use GET (read operations) |
| `x-uigen-http-post` | POST | Force operation to use POST (create operations) |
| `x-uigen-http-put` | PUT | Force operation to use PUT (full update operations) |
| `x-uigen-http-delete` | DELETE | Force operation to use DELETE (delete operations) |
| `x-uigen-http-patch` | PATCH | Force operation to use PATCH (partial update operations) |

## How it works

HTTP method overrides are applied during the reconciliation phase, before the adapter generates the intermediate representation. When an operation has an HTTP method override annotation set to `true`, the reconciler moves the operation from its original HTTP method location to the target method location in the OpenAPI spec structure.

The original spec file is never modified - overrides only affect the in-memory representation used for UI generation.

## Supported values

HTTP method override annotations accept **boolean values only**:

- `true`: apply the override (move operation to target method)
- `false`: do not apply the override (keep original method)

Non-boolean values are ignored and a warning is logged.

## Supported locations

HTTP method override annotations can only be applied at the **operation level** in your config file. They are not supported at the path, schema, or property level.

## Annotation syntax

HTTP method overrides are applied in your `.uigen/config.yaml` file using the **original method** in the element path:

```yaml
annotations:
  <ORIGINAL_METHOD>:<PATH>:
    x-uigen-http-<TARGET_METHOD>: true
```

**Important**: Use the original method from the spec, not the target method you want to change to.

## OpenAPI 3.x examples

### Override POST to GET (search endpoint)

```yaml
# OpenAPI spec has:
paths:
  /api/v1/users/search:
    post:
      operationId: search_users
      summary: Search users
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string

# Config override:
annotations:
  POST:/api/v1/users/search:
    x-uigen-http-get: true
    x-uigen-label: Search Users

# Result: Operation moves to GET method
# paths:
#   /api/v1/users/search:
#     get:
#       operationId: search_users
#       summary: Search users
#       x-uigen-http-get: true
#       x-uigen-label: Search Users
```

### Override DELETE to POST (logout endpoint)

```yaml
# OpenAPI spec has:
paths:
  /api/v1/auth/logout:
    delete:
      operationId: logout_user
      summary: Logout user

# Config override:
annotations:
  DELETE:/api/v1/auth/logout:
    x-uigen-http-post: true
    x-uigen-label: Logout

# Result: Operation moves to POST method
# paths:
#   /api/v1/auth/logout:
#     post:
#       operationId: logout_user
#       summary: Logout user
#       x-uigen-http-post: true
#       x-uigen-label: Logout
```

### Override PUT to PATCH (partial update)

```yaml
# OpenAPI spec has:
paths:
  /api/v1/users/{id}:
    put:
      operationId: update_user
      summary: Update user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer

# Config override:
annotations:
  PUT:/api/v1/users/{id}:
    x-uigen-http-patch: true
    x-uigen-label: Update User

# Result: Operation moves to PATCH method
# paths:
#   /api/v1/users/{id}:
#     patch:
#       operationId: update_user
#       summary: Update user
#       x-uigen-http-patch: true
#       x-uigen-label: Update User
```

### Override with multiple annotations

```yaml
# OpenAPI spec has:
paths:
  /api/v1/profile:
    put:
      operationId: update_profile
      summary: Update profile

# Config override:
annotations:
  PUT:/api/v1/profile:
    x-uigen-http-patch: true
    x-uigen-profile: true
    x-uigen-label: My Profile

# Result: Operation moves to PATCH and gets profile annotation
# paths:
#   /api/v1/profile:
#     patch:
#       operationId: update_profile
#       summary: Update profile
#       x-uigen-http-patch: true
#       x-uigen-profile: true
#       x-uigen-label: My Profile
```

### Multiple overrides on different operations

```yaml
# Config with multiple overrides:
annotations:
  # Override logout endpoint
  DELETE:/api/v1/auth/logout:
    x-uigen-http-post: true
    x-uigen-label: Logout
  
  # Override search endpoint
  POST:/api/v1/users/search:
    x-uigen-http-get: true
    x-uigen-label: Search Users
  
  # Override partial update endpoint
  PUT:/api/v1/users/{id}:
    x-uigen-http-patch: true
    x-uigen-label: Update User
```

## Swagger 2.0 examples

HTTP method overrides work identically in Swagger 2.0 documents:

### Override POST to GET

```yaml
# Swagger 2.0 spec has:
paths:
  /api/v1/users/search:
    post:
      operationId: search_users
      summary: Search users
      parameters:
        - name: body
          in: body
          schema:
            type: object
            properties:
              query:
                type: string

# Config override:
annotations:
  POST:/api/v1/users/search:
    x-uigen-http-get: true
```

### Override DELETE to POST

```yaml
# Swagger 2.0 spec has:
paths:
  /api/v1/auth/logout:
    delete:
      operationId: logout_user
      summary: Logout user

# Config override:
annotations:
  DELETE:/api/v1/auth/logout:
    x-uigen-http-post: true
```

## Common use cases

### Use case 1: Logout endpoints using POST instead of DELETE

Many REST APIs use POST for logout operations instead of DELETE, even though the spec might define DELETE:

```yaml
annotations:
  DELETE:/api/v1/auth/logout:
    x-uigen-http-post: true
    x-uigen-label: Logout
```

### Use case 2: Search endpoints using GET instead of POST

Search endpoints often use POST in the spec (due to request bodies) but should semantically use GET:

```yaml
annotations:
  POST:/api/v1/users/search:
    x-uigen-http-get: true
    x-uigen-label: Search Users
```

### Use case 3: Partial updates using PATCH instead of PUT

APIs that support partial updates should use PATCH, not PUT:

```yaml
annotations:
  PUT:/api/v1/users/{id}:
    x-uigen-http-patch: true
    x-uigen-label: Update User
```

### Use case 4: Auto-generated specs with incorrect methods

When your API framework auto-generates specs with wrong methods:

```yaml
annotations:
  # Correct auto-generated methods
  GET:/api/v1/users/create:
    x-uigen-http-post: true
  
  POST:/api/v1/users/delete:
    x-uigen-http-delete: true
```

### Use case 5: Third-party APIs with incorrect specs

When consuming third-party APIs with incorrect specs you cannot modify:

```yaml
annotations:
  # Correct third-party spec methods
  DELETE:/api/v1/sessions:
    x-uigen-http-post: true
    x-uigen-label: Logout
```

## Validation and errors

The reconciler validates HTTP method overrides and provides feedback:

### Invalid annotation value

**Error**: Non-boolean value (string, number, object, array, null)

**Behavior**: Override is skipped, operation keeps original method

**Example**:
```yaml
# Wrong - string value
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: "true"  # Skipped, not a boolean

# Correct - boolean value
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true  # Applied
```

### Method conflict

**Error**: Target method already exists at the same path

**Behavior**: Override is skipped, warning is logged

**Example**:
```yaml
# OpenAPI spec has both GET and POST at /api/v1/users
paths:
  /api/v1/users:
    get:
      operationId: list_users
    post:
      operationId: create_user

# Config tries to override POST to GET
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true  # Error: GET already exists

# Warning: "x-uigen-http-get on POST:/api/v1/users: Method GET already exists at /api/v1/users"
```

### Operation not found

**Error**: Original operation doesn't exist at specified path and method

**Behavior**: Override is skipped, warning is logged

**Example**:
```yaml
# Config references non-existent operation
annotations:
  POST:/api/v1/nonexistent:
    x-uigen-http-get: true  # Error: POST:/api/v1/nonexistent not found

# Warning: "x-uigen-http-get on POST:/api/v1/nonexistent: Method POST not found at /api/v1/nonexistent"
```

### Multiple conflicting overrides

**Error**: Multiple HTTP method override annotations on same operation

**Behavior**: Only the first override annotation is applied

**Example**:
```yaml
# Wrong - multiple overrides
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true
    x-uigen-http-put: true  # Ignored, only first override applied

# Correct - single override
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true
```

## Interaction with other annotations

HTTP method overrides are applied during reconciliation, before other annotations are processed by the adapter. This means:

### With `x-uigen-label`

Labels are preserved when operations are moved:

```yaml
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true
    x-uigen-label: List Users  # Label is preserved on moved operation
```

### With `x-uigen-ignore`

If an operation has both `x-uigen-ignore: true` and an HTTP method override, the operation is excluded and the override is not applied:

```yaml
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true
    x-uigen-ignore: true  # Operation is excluded, override not applied
```

### With `x-uigen-profile`

Profile annotations work correctly with HTTP method overrides:

```yaml
annotations:
  PUT:/api/v1/profile:
    x-uigen-http-patch: true
    x-uigen-profile: true  # Profile annotation preserved on moved operation
```

### With authentication annotations

Authentication annotations are preserved when operations are moved:

```yaml
annotations:
  DELETE:/api/v1/auth/logout:
    x-uigen-http-post: true
    x-uigen-auth:
      type: bearer  # Auth config preserved on moved operation
```

## Precedence

HTTP method override annotations follow standard annotation precedence rules:

```
Operation-level annotation (config file)
    ↓ (if undefined)
Operation-level annotation (spec file)
    ↓ (if undefined)
Default: no override (keep original method)
```

**Note**: HTTP method overrides are typically applied via config file, not directly in the spec file.

## Default behavior

Without HTTP method override annotations, operations keep their original HTTP methods from the spec. The annotations are entirely optional.

## Best practices

1. **Use sparingly** - Only override methods when absolutely necessary
2. **Document why** - Add comments in your config file explaining each override
3. **Prefer fixing the source** - If possible, fix the OpenAPI spec at the source
4. **Test thoroughly** - Verify overridden endpoints work correctly in the generated UI
5. **Keep overrides simple** - Avoid complex override patterns
6. **Use original method in path** - Always reference the original method in config paths

## Troubleshooting

### Override not applied

**Symptom**: Operation still uses original method after adding override annotation

**Possible causes**:
1. Annotation value is not `true` (check for string `"true"` instead of boolean)
2. Path or method in config doesn't match spec exactly
3. Method conflict (target method already exists)
4. Operation is ignored with `x-uigen-ignore: true`

**Solution**: Check reconciliation warnings in CLI output for specific error messages

### Method conflict error

**Symptom**: Warning about target method already existing

**Solution**: 
1. Check if target method is needed at that path
2. Remove or rename the conflicting operation
3. Choose a different target method
4. Use path parameters to differentiate operations

### Operation not found error

**Symptom**: Warning about operation not found at specified path

**Solution**:
1. Verify path matches spec exactly (check for typos, trailing slashes)
2. Verify method matches spec exactly (case-sensitive)
3. Check if operation exists in the spec file

## Related annotations

- [`x-uigen-label`](/docs/spec-annotations/x-uigen-label) - Set custom labels for operations
- [`x-uigen-ignore`](/docs/spec-annotations/x-uigen-ignore) - Exclude operations from UI
- [`x-uigen-profile`](/docs/spec-annotations/x-uigen-profile) - Mark operations as profile resources
- [`x-uigen-auth`](/docs/spec-annotations/x-uigen-auth) - Configure authentication for operations
