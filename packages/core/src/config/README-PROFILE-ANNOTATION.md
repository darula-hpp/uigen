# x-uigen-profile Configuration Support

The `x-uigen-profile` annotation can be configured via `config.yaml` files to mark resources as profile resources without modifying the OpenAPI specification.

## Configuration Format

```yaml
version: "1.0"
enabled: {}
defaults: {}
annotations:
  # Mark a resource as a profile resource
  /api/v1/users/me:
    x-uigen-profile: true
  
  # Explicitly exclude a resource from profile treatment
  /admin/settings:
    x-uigen-profile: false
```

## Path Syntax

The annotation uses path-based syntax to target specific resources:

- **Resource path**: `/api/v1/users/me`
- **Operation path**: `GET:/api/v1/users/me`

## Value Types

- `true`: Mark the resource as a profile resource (renders with ProfileView)
- `false`: Explicitly exclude from profile treatment (renders with standard views)
- `undefined`: No annotation (default behavior)

## Precedence Rules

When both the OpenAPI spec and config.yaml define `x-uigen-profile`:

1. **Spec annotation takes precedence** over config.yaml
2. Config.yaml provides defaults when spec has no annotation
3. Disabled annotations in config prevent processing even if in spec

## Example: Complete Configuration

```yaml
version: "1.0"

# Enable/disable annotations globally
enabled:
  x-uigen-profile: true  # Enable profile annotation processing

# Default values (not typically used for boolean annotations)
defaults: {}

# Resource-specific annotations
annotations:
  # User profile endpoint
  GET:/api/v1/auth/me:
    x-uigen-profile: true
    x-uigen-label: "My Profile"
  
  # Admin profile (explicitly excluded)
  /admin/profile:
    x-uigen-profile: false
  
  # Another profile resource
  /api/v1/profile:
    x-uigen-profile: true
```

## Validation

The ConfigLoader validates that `x-uigen-profile` values are boolean:

- ✅ Valid: `true`, `false`
- ❌ Invalid: `"yes"`, `1`, `null`, `{}`, `[]`

Invalid values are logged as warnings and rejected by the ProfileHandler.

## Testing

Integration tests verify:
- Resource-level annotation loading
- Path-based annotation application
- Boolean value validation
- Precedence rules (spec overrides config)
- Disabled annotation handling

See `packages/core/src/config/__tests__/profile-config-integration.test.ts` for comprehensive test coverage.

## Implementation Details

The ConfigLoader works with the AnnotationHandlerRegistry to apply annotations:

1. **Load**: ConfigLoader reads and parses config.yaml
2. **Apply**: ConfigLoader applies config to registry
3. **Process**: Registry processes annotations with precedence rules
4. **Extract**: ProfileHandler extracts values from spec
5. **Merge**: Registry merges spec and config values (spec wins)
6. **Validate**: ProfileHandler validates boolean values
7. **Apply**: ProfileHandler sets `__profileAnnotation` on resources

## Related Files

- `packages/core/src/config/loader.ts` - ConfigLoader implementation
- `packages/core/src/config/types.ts` - Type definitions
- `packages/core/src/adapter/annotations/handlers/profile-handler.ts` - ProfileHandler
- `packages/core/src/adapter/annotations/registry.ts` - Precedence logic
