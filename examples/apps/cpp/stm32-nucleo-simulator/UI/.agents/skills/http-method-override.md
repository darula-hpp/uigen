# HTTP Method Override

## Overview

HTTP method overrides allow you to correct discrepancies between OpenAPI specifications and actual API implementations. When an API spec defines an endpoint with the wrong HTTP method, you can use `x-uigen-http-*` annotations to force the correct method during reconciliation.

## When to Use

Use HTTP method overrides when:

1. **The OpenAPI spec has the wrong HTTP method** - The spec says POST but the API actually uses GET
2. **You cannot modify the original spec** - The spec is auto-generated or maintained by another team
3. **The method mismatch causes UI generation issues** - Wrong methods lead to incorrect form rendering or API calls

## Supported Annotations

UIGen supports five HTTP method override annotations:

- `x-uigen-http-get` - Force operation to use GET method
- `x-uigen-http-post` - Force operation to use POST method
- `x-uigen-http-put` - Force operation to use PUT method
- `x-uigen-http-delete` - Force operation to use DELETE method
- `x-uigen-http-patch` - Force operation to use PATCH method

## Detection Rules

### Rule 1: Logout/Session Deletion Endpoints

**Pattern**: Path contains `/logout`, `/signout`, `/session`, or operationId contains `logout`, `signout`

**Common Issue**: Spec defines DELETE but API uses POST

**Example**:
```yaml
# OpenAPI spec has:
paths:
  /api/v1/auth/logout:
    delete:
      operationId: logout_user
      summary: Logout user

# But API actually uses POST
```

**Solution**:
```yaml
# In .uigen/config.yaml
annotations:
  DELETE:/api/v1/auth/logout:
    x-uigen-http-post: true
    x-uigen-label: Logout
```

### Rule 2: Search Endpoints with Request Bodies

**Pattern**: Path contains `/search`, `/list`, `/query`, or operationId contains `search`, `query`

**Common Issue**: Spec defines POST (due to request body) but API semantically performs a read operation

**Example**:
```yaml
# OpenAPI spec has:
paths:
  /api/v1/users/search:
    post:
      operationId: search_users
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string

# But API should use GET with query params
```

**Solution**:
```yaml
# In .uigen/config.yaml
annotations:
  POST:/api/v1/users/search:
    x-uigen-http-get: true
    x-uigen-label: Search Users
```

### Rule 3: Partial Update Endpoints

**Pattern**: Path contains `/update`, operationId contains `update`, `patch`

**Common Issue**: Spec defines PUT (full replacement) but API uses PATCH (partial update)

**Example**:
```yaml
# OpenAPI spec has:
paths:
  /api/v1/users/{id}:
    put:
      operationId: update_user
      summary: Update user

# But API actually uses PATCH for partial updates
```

**Solution**:
```yaml
# In .uigen/config.yaml
annotations:
  PUT:/api/v1/users/{id}:
    x-uigen-http-patch: true
    x-uigen-label: Update User
```

### Rule 4: Resource Creation with Non-Standard Methods

**Pattern**: Path contains `/create`, operationId contains `create`

**Common Issue**: Spec defines GET or PUT but API uses POST (standard for creation)

**Example**:
```yaml
# OpenAPI spec has:
paths:
  /api/v1/users:
    get:
      operationId: create_user
      summary: Create user

# But API actually uses POST for creation
```

**Solution**:
```yaml
# In .uigen/config.yaml
annotations:
  GET:/api/v1/users:
    x-uigen-http-post: true
    x-uigen-label: Create User
```

### Rule 5: Resource Deletion with Non-Standard Methods

**Pattern**: Path contains `/delete`, operationId contains `delete`, `remove`

**Common Issue**: Spec defines POST or GET but API uses DELETE (standard for deletion)

**Example**:
```yaml
# OpenAPI spec has:
paths:
  /api/v1/users/{id}:
    post:
      operationId: delete_user
      summary: Delete user

# But API actually uses DELETE
```

**Solution**:
```yaml
# In .uigen/config.yaml
annotations:
  POST:/api/v1/users/{id}:
    x-uigen-http-delete: true
    x-uigen-label: Delete User
```

## Annotation Syntax

### Basic Syntax

HTTP method override annotations are applied in the config file's `annotations` section using the **original method** in the element path:

```yaml
annotations:
  <ORIGINAL_METHOD>:<PATH>:
    x-uigen-http-<TARGET_METHOD>: true
```

### Value Rules

- **Only `true` triggers override** - Set the annotation to `true` to apply the override
- **`false` is ignored** - Setting to `false` has no effect (operation keeps original method)
- **Must be boolean** - Non-boolean values are invalid and logged as warnings

### Examples

**Override POST to GET**:
```yaml
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true
```

**Override DELETE to POST**:
```yaml
annotations:
  DELETE:/api/v1/auth/logout:
    x-uigen-http-post: true
```

**Override PUT to PATCH**:
```yaml
annotations:
  PUT:/api/v1/users/{id}:
    x-uigen-http-patch: true
```

**Override with other annotations**:
```yaml
annotations:
  POST:/api/v1/users/search:
    x-uigen-http-get: true
    x-uigen-label: Search Users
    x-uigen-icon: search
```

## Complete Config File Examples

### Example 1: Logout Endpoint

```yaml
version: '1.0'
enabled: {}
defaults: {}
annotations:
  # Override logout from DELETE to POST
  DELETE:/api/v1/auth/logout:
    x-uigen-http-post: true
    x-uigen-label: Logout
    x-uigen-icon: logout
```

### Example 2: Search Endpoint

```yaml
version: '1.0'
enabled: {}
defaults: {}
annotations:
  # Override search from POST to GET
  POST:/api/v1/users/search:
    x-uigen-http-get: true
    x-uigen-label: Search Users
    x-uigen-icon: search
```

### Example 3: Multiple Overrides

```yaml
version: '1.0'
enabled: {}
defaults: {}
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

### Example 4: Override with Profile Annotation

```yaml
version: '1.0'
enabled: {}
defaults: {}
annotations:
  # Override profile endpoint and mark as profile resource
  PUT:/api/v1/profile:
    x-uigen-http-patch: true
    x-uigen-profile: true
    x-uigen-label: My Profile
```

## Common Scenarios

### Scenario 1: Auto-Generated Spec with Wrong Methods

**Problem**: Your API framework auto-generates an OpenAPI spec, but it incorrectly assigns HTTP methods based on function names rather than actual behavior.

**Solution**: Use HTTP method overrides in the config file to correct the methods without modifying the auto-generated spec.

```yaml
annotations:
  # Correct auto-generated methods
  GET:/api/v1/users/create:
    x-uigen-http-post: true
  
  POST:/api/v1/users/delete:
    x-uigen-http-delete: true
```

### Scenario 2: Third-Party API with Incorrect Spec

**Problem**: You're consuming a third-party API with an incorrect OpenAPI spec that you cannot modify.

**Solution**: Use HTTP method overrides to correct the methods in your local config.

```yaml
annotations:
  # Correct third-party spec methods
  DELETE:/api/v1/sessions:
    x-uigen-http-post: true
    x-uigen-label: Logout
```

### Scenario 3: Legacy API with Non-RESTful Methods

**Problem**: Your legacy API doesn't follow REST conventions (e.g., uses POST for everything).

**Solution**: Use HTTP method overrides to make the spec more RESTful for better UI generation.

```yaml
annotations:
  # Make legacy API more RESTful
  POST:/api/v1/users/list:
    x-uigen-http-get: true
    x-uigen-label: List Users
  
  POST:/api/v1/users/update:
    x-uigen-http-put: true
    x-uigen-label: Update User
```

## Troubleshooting

### Issue 1: Method Conflict

**Error**: `Method GET already exists at /users`

**Cause**: The target method already has an operation at the same path.

**Solution**: 
1. Check if the existing operation is needed
2. Remove the existing operation from the spec, or
3. Choose a different target method, or
4. Use path parameters to differentiate operations

### Issue 2: Operation Not Found

**Error**: `Method POST not found at /users`

**Cause**: The original method doesn't exist at the specified path.

**Solution**:
1. Verify the path is correct (check for typos)
2. Verify the original method is correct
3. Check if the operation exists in the spec

### Issue 3: Invalid Annotation Value

**Error**: `x-uigen-http-get must be a boolean, found string`

**Cause**: The annotation value is not a boolean.

**Solution**: Set the annotation value to `true` (not `"true"` as a string):

```yaml
# Wrong
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: "true"  # String, not boolean

# Correct
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true  # Boolean
```

### Issue 4: Override Not Applied

**Cause**: The annotation value is `false` or missing.

**Solution**: Ensure the annotation value is exactly `true`:

```yaml
# This will NOT apply the override
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: false

# This WILL apply the override
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true
```

### Issue 5: Multiple Conflicting Overrides

**Warning**: `Multiple HTTP method overrides on POST:/api/v1/users`

**Cause**: Multiple override annotations on the same operation.

**Solution**: Only use one override annotation per operation:

```yaml
# Wrong - multiple overrides
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true
    x-uigen-http-put: true  # Conflict!

# Correct - single override
annotations:
  POST:/api/v1/users:
    x-uigen-http-get: true
```

## How It Works

HTTP method overrides are applied during the reconciliation process:

1. **Config Loading**: UIGen loads your `.uigen/config.yaml` file
2. **Annotation Merging**: Config annotations are merged into the OpenAPI spec
3. **HTTP Method Override Reconciliation**: The reconciler scans for `x-uigen-http-*` annotations
4. **Operation Transformation**: Operations are moved from original methods to target methods
5. **IR Generation**: The adapter generates the intermediate representation with corrected methods

The original OpenAPI spec file is never modified - overrides only affect the in-memory representation used for UI generation.

## Best Practices

1. **Use sparingly** - Only override methods when absolutely necessary
2. **Document why** - Add comments in your config file explaining why each override is needed
3. **Prefer fixing the source** - If possible, fix the OpenAPI spec at the source rather than using overrides
4. **Test thoroughly** - Verify that overridden endpoints work correctly in the generated UI
5. **Keep overrides simple** - Avoid complex override patterns that make the config hard to understand

## Related Annotations

HTTP method overrides work well with other UIGen annotations:

- `x-uigen-label` - Set custom labels for overridden operations
- `x-uigen-icon` - Set custom icons for overridden operations
- `x-uigen-profile` - Mark overridden operations as profile resources
- `x-uigen-ignore` - Hide overridden operations from the UI

## Additional Resources

- [UIGen Configuration Guide](../README.md)
- [Annotation Reference](../annotations.json)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
