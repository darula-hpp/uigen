# Skill: Auto-Annotate OpenAPI Specs

## Overview
This skill guides AI agents through automatically analyzing OpenAPI specifications and intelligently applying annotations to the `.uigen/config.yaml` file. The goal is to **eliminate the need for users to manually configure annotations** in the config GUI by having AI agents detect patterns and apply appropriate annotations automatically.

## Critical Understanding

### What This Skill Does
Analyzes an OpenAPI spec and automatically adds annotations to `.uigen/config.yaml` based on intelligent pattern detection:
- Detects login/auth endpoints → `x-uigen-login`
- Detects password reset endpoints → `x-uigen-password-reset`
- Detects sign-up/registration endpoints → `x-uigen-signup`
- Detects internal/debug endpoints → `x-uigen-ignore`
- Detects file upload fields → `x-uigen-file-types`, `x-uigen-max-file-size`
- Detects foreign key relationships → `x-uigen-ref`
- Detects array fields suitable for charts → `x-uigen-chart`
- Applies custom labels → `x-uigen-label`
- Detects active server → `x-uigen-active-server`

### The Config Structure

```yaml
version: '1.0'
enabled: {}
defaults: {}
annotations:
  # Operation annotations (METHOD:path)
  POST:/api/v1/auth/login:
    x-uigen-login: true
    x-uigen-label: User Login
  
  # Field annotations (schema path)
  Body_upload_file_api_v1_files_post.file:
    x-uigen-file-types: ['image/jpeg', 'image/png']
    x-uigen-max-file-size: 5242880
  
  # Schema annotations (JSON pointer)
  '#/paths/~1api~1v1~1users/get/responses/200/content/application~1json/schema':
    x-uigen-chart:
      chartType: line
      xAxis: created_at
      yAxis: count
```

## Available Annotations Reference

Load the annotations metadata from `annotations.json`:

```json
{
  "x-uigen-login": { "targetType": "operation", "type": "boolean" },
  "x-uigen-password-reset": { "targetType": "operation", "type": "boolean" },
  "x-uigen-signup": { "targetType": "operation", "type": "boolean" },
  "x-uigen-ignore": { "targetType": ["field", "operation", "resource"], "type": "boolean" },
  "x-uigen-label": { "targetType": ["field", "operation"], "type": "string" },
  "x-uigen-file-types": { "targetType": "field", "type": "array", "applicableWhen": { "type": "file" } },
  "x-uigen-max-file-size": { "targetType": "field", "type": "number", "applicableWhen": { "type": "file" } },
  "x-uigen-ref": { "targetType": "field", "type": "object" },
  "x-uigen-chart": { "targetType": "field", "type": "object", "applicableWhen": { "type": "array" } },
  "x-uigen-active-server": { "targetType": "server", "type": "boolean" }
}
```

## AI Agent Workflow

### Step 1: Locate the OpenAPI Spec

**Priority order:**
1. If user provides a path, use it
2. If not provided, search current directory for common spec files:
   - `openapi.yaml` / `openapi.yml`
   - `openapi.json`
   - `swagger.yaml` / `swagger.yml`
   - `swagger.json`
   - `api.yaml` / `api.yml`
3. If found, inform user: "Found OpenAPI spec at `{path}`, using it for annotation."
4. If not found, ask user: "Please provide the path to your OpenAPI spec file."

### Step 2: Load and Parse the Spec

```bash
# Read the OpenAPI spec
cat openapi.yaml
```

Parse the spec to understand:
- All endpoints (paths + methods)
- Request/response schemas
- Parameters and request bodies
- Servers configuration

### Step 3: Detect Patterns and Generate Annotations

Run through all detection rules (see Detection Rules section below).

### Step 4: Load Existing Config

Check if `.uigen/config.yaml` exists:
- If exists: Load it and preserve existing annotations
- If not exists: Create new config with default structure

```yaml
version: '1.0'
enabled: {}
defaults: {}
annotations: {}
```

### Step 5: Merge Annotations

**CRITICAL: Preserve existing annotations**
- Never overwrite existing annotations
- Only add new annotations that don't conflict
- If a path/field already has an annotation, skip it

### Step 6: Write Updated Config

Write the updated config back to `.uigen/config.yaml` with proper YAML formatting.

### Step 7: Report Results

Provide a summary:
```
✓ Auto-annotated OpenAPI spec: openapi.yaml
✓ Added 12 annotations to .uigen/config.yaml

Summary:
  - 2 login endpoints detected
  - 1 password reset endpoint detected
  - 1 sign-up endpoint detected
  - 3 internal endpoints marked to ignore
  - 4 file upload fields configured
  - 1 chart visualization added

Run 'uigen serve openapi.yaml' to see the results.
```

## Detection Rules

### Rule 1: Login Endpoints (x-uigen-login)

**Pattern detection:**
- Method: POST
- Path contains: `/login`, `/signin`, `/auth`, `/authenticate`, `/session`
- Request body has fields: `username`/`email` + `password`
- Response includes: `token`, `access_token`, `jwt`, `session_id`

**Example:**
```yaml
POST:/api/v1/auth/login:
  x-uigen-login: true
  x-uigen-label: User Login
```

### Rule 2: Password Reset Endpoints (x-uigen-password-reset)

**Pattern detection:**
- Method: POST
- Path contains: `/password-reset`, `/reset-password`, `/forgot-password`, `/password/reset`
- Request body has fields: `email` or `username`

**Example:**
```yaml
POST:/api/v1/auth/password-reset:
  x-uigen-password-reset: true
  x-uigen-label: Reset Password
```

### Rule 3: Sign-Up Endpoints (x-uigen-signup)

**Pattern detection:**
- Method: POST
- Path contains: `/signup`, `/sign-up`, `/register`, `/registration`
- Request body has fields: `email`/`username` + `password`
- Often includes: `name`, `confirm_password`

**Example:**
```yaml
POST:/api/v1/auth/sign-up:
  x-uigen-signup: true
  x-uigen-label: Create Account
```

### Rule 4: Ignore Internal Endpoints (x-uigen-ignore)

**Pattern detection:**
- Path contains: `/health`, `/healthz`, `/ping`, `/metrics`, `/debug`, `/internal`, `/_`
- Tags include: `internal`, `debug`, `monitoring`, `admin-only`
- Description contains: "internal use only", "debug", "monitoring"

**Example:**
```yaml
GET:/health:
  x-uigen-ignore: true

GET:/metrics:
  x-uigen-ignore: true
```

### Rule 5: File Upload Fields (x-uigen-file-types, x-uigen-max-file-size)

**Pattern detection:**
- Schema type: `string`
- Format: `binary` or `base64`
- Content type: `multipart/form-data`
- Field name contains: `file`, `upload`, `attachment`, `document`, `image`, `photo`, `avatar`

**File type detection:**
- Field name contains `image`/`photo`/`avatar` → `['image/jpeg', 'image/png', 'image/webp']`
- Field name contains `document`/`pdf` → `['application/pdf']`
- Field name contains `video` → `['video/mp4', 'video/webm']`
- Field name contains `audio` → `['audio/mpeg', 'audio/wav']`
- Generic `file`/`upload` → `['*/*']` (all types)

**File size detection:**
- Default: 10MB (10485760 bytes)
- If description mentions size limit, use that
- For images: 5MB (5242880 bytes)
- For videos: 100MB (104857600 bytes)
- For documents: 10MB (10485760 bytes)

**Example:**
```yaml
Body_upload_file_api_v1_files_post.file:
  x-uigen-file-types: ['image/jpeg', 'image/png', 'image/webp']
  x-uigen-max-file-size: 5242880

Body_upload_document_api_v1_documents_post.document:
  x-uigen-file-types: ['application/pdf', 'application/msword']
  x-uigen-max-file-size: 10485760
```

### Rule 6: Foreign Key References (x-uigen-ref)

**Pattern detection:**
- Field name ends with: `_id`, `Id`, `ID`
- Field type: `string`, `integer`, or `number`
- Field name pattern: `{resource}_id` (e.g., `user_id`, `role_id`, `category_id`)

**Auto-detect target resource:**
- Extract resource name from field (e.g., `user_id` → `User`)
- Check if resource exists in spec paths (e.g., `/users`)
- Determine value field: usually `id`
- Determine label field: usually `name`, `title`, or first string field

**Example:**
```yaml
User.role_id:
  x-uigen-ref:
    resource: Role
    valueField: id
    labelField: name

Post.category_id:
  x-uigen-ref:
    resource: Category
    valueField: id
    labelField: name
```

### Rule 7: Chart Visualizations (x-uigen-chart)

**Pattern detection:**
- Schema type: `array`
- Array items are objects (not primitives)
- Response from GET endpoint (list/collection)
- Items have numeric fields suitable for y-axis
- Items have date/time or categorical fields suitable for x-axis

**Chart type selection:**
- Time-series data (has date/timestamp field) → `line` or `area`
- Categorical data with counts → `bar`
- Percentage/proportion data → `pie` or `donut`
- Multiple numeric series → `line` (multi-series)

**Axis detection:**
- X-axis: First date/timestamp field, or first string/enum field
- Y-axis: First numeric field (integer, number)

**Example:**
```yaml
'#/paths/~1api~1v1~1analytics/get/responses/200/content/application~1json/schema':
  x-uigen-chart:
    chartType: line
    xAxis: date
    yAxis: revenue
    options:
      title: Revenue Over Time

'#/paths/~1api~1v1~1users/get/responses/200/content/application~1json/schema':
  x-uigen-chart:
    chartType: bar
    xAxis: role
    yAxis: count
```

### Rule 8: Custom Labels (x-uigen-label)

**Pattern detection:**
- Apply human-readable labels to operations and fields
- Convert snake_case/camelCase to Title Case
- Use operation summary if available

**Examples:**
```yaml
POST:/api/v1/users:
  x-uigen-label: Create User

GET:/api/v1/users/{id}:
  x-uigen-label: View User Details

User.first_name:
  x-uigen-label: First Name

User.email_address:
  x-uigen-label: Email Address
```

### Rule 9: Active Server (x-uigen-active-server)

**Pattern detection:**
- If spec has multiple servers, mark the first production server as active
- Look for server with description containing: `production`, `prod`, `live`
- If only one server, mark it as active

**Example:**
```yaml
# This is applied at the server level in the spec, not in config.yaml
# But can be suggested as a manual edit if needed
```

## Path Naming Conventions

### Operation Paths
Format: `METHOD:/path/to/endpoint`

Examples:
- `POST:/api/v1/auth/login`
- `GET:/api/v1/users`
- `PUT:/api/v1/users/{id}`
- `DELETE:/api/v1/posts/{id}`

### Field Paths (Request Body)
Format: `Body_{operation_id}.{field_name}`

Examples:
- `Body_create_user_api_v1_users_post.email`
- `Body_upload_file_api_v1_files_post.file`
- `Body_update_post_api_v1_posts__id__put.title`

### Schema Paths (JSON Pointer)
Format: `#/paths/{encoded_path}/{method}/responses/{code}/content/{media_type}/schema`

Path encoding:
- `/` → `~1`
- `~` → `~0`

Examples:
- `#/paths/~1api~1v1~1users/get/responses/200/content/application~1json/schema`
- `#/paths/~1api~1v1~1posts~1{id}/get/responses/200/content/application~1json/schema`

### Component Schema Paths
Format: `{SchemaName}.{field_name}`

Examples:
- `User.email`
- `Post.author_id`
- `Meeting.recording`

## Implementation Example

```typescript
// Pseudo-code for the detection logic

interface Annotation {
  path: string;
  annotations: Record<string, any>;
}

function autoAnnotate(specPath: string): Annotation[] {
  const spec = parseOpenAPISpec(specPath);
  const annotations: Annotation[] = [];
  
  // Detect login endpoints
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (isLoginEndpoint(path, method, operation)) {
        annotations.push({
          path: `${method.toUpperCase()}:${path}`,
          annotations: {
            'x-uigen-login': true,
            'x-uigen-label': 'User Login'
          }
        });
      }
      
      if (isPasswordResetEndpoint(path, method, operation)) {
        annotations.push({
          path: `${method.toUpperCase()}:${path}`,
          annotations: {
            'x-uigen-password-reset': true,
            'x-uigen-label': 'Reset Password'
          }
        });
      }
      
      if (isSignUpEndpoint(path, method, operation)) {
        annotations.push({
          path: `${method.toUpperCase()}:${path}`,
          annotations: {
            'x-uigen-signup': true,
            'x-uigen-label': 'Create Account'
          }
        });
      }
      
      if (isInternalEndpoint(path, method, operation)) {
        annotations.push({
          path: `${method.toUpperCase()}:${path}`,
          annotations: {
            'x-uigen-ignore': true
          }
        });
      }
    }
  }
  
  // Detect file upload fields
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      const fileFields = detectFileFields(operation);
      for (const field of fileFields) {
        annotations.push({
          path: field.path,
          annotations: {
            'x-uigen-file-types': field.fileTypes,
            'x-uigen-max-file-size': field.maxSize
          }
        });
      }
    }
  }
  
  // Detect foreign key references
  for (const [schemaName, schema] of Object.entries(spec.components?.schemas || {})) {
    const refs = detectForeignKeys(schemaName, schema, spec);
    for (const ref of refs) {
      annotations.push({
        path: `${schemaName}.${ref.fieldName}`,
        annotations: {
          'x-uigen-ref': {
            resource: ref.resource,
            valueField: ref.valueField,
            labelField: ref.labelField
          }
        }
      });
    }
  }
  
  // Detect chart opportunities
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const chartConfigs = detectChartOpportunities(path, pathItem);
    for (const config of chartConfigs) {
      annotations.push({
        path: config.path,
        annotations: {
          'x-uigen-chart': config.chartConfig
        }
      });
    }
  }
  
  return annotations;
}
```

## Pattern Detection Helpers

### isLoginEndpoint
```typescript
function isLoginEndpoint(path: string, method: string, operation: any): boolean {
  if (method.toLowerCase() !== 'post') return false;
  
  const pathLower = path.toLowerCase();
  const hasLoginPath = /\/(login|signin|auth|authenticate|session)/.test(pathLower);
  
  const requestBody = operation.requestBody?.content?.['application/json']?.schema;
  const hasAuthFields = requestBody?.properties?.username || 
                        requestBody?.properties?.email ||
                        requestBody?.properties?.password;
  
  return hasLoginPath && hasAuthFields;
}
```

### isPasswordResetEndpoint
```typescript
function isPasswordResetEndpoint(path: string, method: string, operation: any): boolean {
  if (method.toLowerCase() !== 'post') return false;
  
  const pathLower = path.toLowerCase();
  return /\/(password-reset|reset-password|forgot-password|password\/reset)/.test(pathLower);
}
```

### isSignUpEndpoint
```typescript
function isSignUpEndpoint(path: string, method: string, operation: any): boolean {
  if (method.toLowerCase() !== 'post') return false;
  
  const pathLower = path.toLowerCase();
  return /\/(signup|sign-up|register|registration)/.test(pathLower);
}
```

### isInternalEndpoint
```typescript
function isInternalEndpoint(path: string, method: string, operation: any): boolean {
  const pathLower = path.toLowerCase();
  const internalPaths = /\/(health|healthz|ping|metrics|debug|internal|_)/.test(pathLower);
  
  const internalTags = operation.tags?.some((tag: string) => 
    /internal|debug|monitoring|admin-only/i.test(tag)
  );
  
  const internalDescription = /internal use only|debug|monitoring/i.test(
    operation.description || ''
  );
  
  return internalPaths || internalTags || internalDescription;
}
```

### detectFileFields
```typescript
function detectFileFields(operation: any): Array<{path: string, fileTypes: string[], maxSize: number}> {
  const fields: Array<{path: string, fileTypes: string[], maxSize: number}> = [];
  
  const requestBody = operation.requestBody?.content?.['multipart/form-data']?.schema;
  if (!requestBody?.properties) return fields;
  
  for (const [fieldName, fieldSchema] of Object.entries(requestBody.properties)) {
    const schema = fieldSchema as any;
    if (schema.type === 'string' && (schema.format === 'binary' || schema.format === 'base64')) {
      const fileTypes = guessFileTypes(fieldName);
      const maxSize = guessMaxFileSize(fieldName);
      
      fields.push({
        path: `Body_${operation.operationId}.${fieldName}`,
        fileTypes,
        maxSize
      });
    }
  }
  
  return fields;
}

function guessFileTypes(fieldName: string): string[] {
  const nameLower = fieldName.toLowerCase();
  
  if (/image|photo|avatar|picture/.test(nameLower)) {
    return ['image/jpeg', 'image/png', 'image/webp'];
  }
  if (/document|pdf/.test(nameLower)) {
    return ['application/pdf'];
  }
  if (/video/.test(nameLower)) {
    return ['video/mp4', 'video/webm'];
  }
  if (/audio/.test(nameLower)) {
    return ['audio/mpeg', 'audio/wav'];
  }
  
  return ['*/*'];
}

function guessMaxFileSize(fieldName: string): number {
  const nameLower = fieldName.toLowerCase();
  
  if (/image|photo|avatar/.test(nameLower)) {
    return 5242880; // 5MB
  }
  if (/video/.test(nameLower)) {
    return 104857600; // 100MB
  }
  
  return 10485760; // 10MB default
}
```

### detectForeignKeys
```typescript
function detectForeignKeys(schemaName: string, schema: any, spec: any): Array<{
  fieldName: string;
  resource: string;
  valueField: string;
  labelField: string;
}> {
  const refs: Array<any> = [];
  
  for (const [fieldName, fieldSchema] of Object.entries(schema.properties || {})) {
    const field = fieldSchema as any;
    
    // Check if field name ends with _id, Id, or ID
    if (/_id$|Id$|ID$/.test(fieldName)) {
      // Extract resource name
      const resourceName = fieldName.replace(/_id$|Id$|ID$/, '');
      const capitalizedResource = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
      
      // Check if resource exists in spec
      const resourceExists = Object.keys(spec.components?.schemas || {}).some(
        name => name.toLowerCase() === resourceName.toLowerCase()
      );
      
      if (resourceExists) {
        // Find label field (usually 'name' or 'title')
        const targetSchema = spec.components.schemas[capitalizedResource];
        const labelField = findLabelField(targetSchema);
        
        refs.push({
          fieldName,
          resource: capitalizedResource,
          valueField: 'id',
          labelField
        });
      }
    }
  }
  
  return refs;
}

function findLabelField(schema: any): string {
  const properties = schema?.properties || {};
  
  // Priority order for label fields
  const labelCandidates = ['name', 'title', 'label', 'displayName', 'display_name'];
  
  for (const candidate of labelCandidates) {
    if (properties[candidate]) {
      return candidate;
    }
  }
  
  // Fallback: first string field
  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    if ((fieldSchema as any).type === 'string') {
      return fieldName;
    }
  }
  
  return 'name'; // Ultimate fallback
}
```

## Best Practices

### 1. Always Preserve Existing Annotations
```typescript
function mergeAnnotations(existing: any, detected: Annotation[]): any {
  const merged = { ...existing };
  
  for (const annotation of detected) {
    // Only add if path doesn't already exist
    if (!merged[annotation.path]) {
      merged[annotation.path] = annotation.annotations;
    }
  }
  
  return merged;
}
```

### 2. Validate Before Writing
```typescript
function validateAnnotations(annotations: any): boolean {
  // Ensure all annotation values match their expected types
  // Ensure required fields are present
  // Ensure paths are properly formatted
  return true;
}
```

### 3. Format YAML Properly
```typescript
import yaml from 'js-yaml';

function writeConfig(config: any, path: string): void {
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
  
  fs.writeFileSync(path, yamlContent, 'utf-8');
}
```

### 4. Provide Detailed Feedback
```typescript
function reportResults(annotations: Annotation[]): void {
  console.log(`✓ Auto-annotated OpenAPI spec`);
  console.log(`✓ Added ${annotations.length} annotations to .uigen/config.yaml\n`);
  
  const summary = {
    login: 0,
    passwordReset: 0,
    signUp: 0,
    ignore: 0,
    fileUpload: 0,
    ref: 0,
    chart: 0
  };
  
  for (const annotation of annotations) {
    if (annotation.annotations['x-uigen-login']) summary.login++;
    if (annotation.annotations['x-uigen-password-reset']) summary.passwordReset++;
    if (annotation.annotations['x-uigen-signup']) summary.signUp++;
    if (annotation.annotations['x-uigen-ignore']) summary.ignore++;
    if (annotation.annotations['x-uigen-file-types']) summary.fileUpload++;
    if (annotation.annotations['x-uigen-ref']) summary.ref++;
    if (annotation.annotations['x-uigen-chart']) summary.chart++;
  }
  
  console.log('Summary:');
  if (summary.login > 0) console.log(`  - ${summary.login} login endpoint(s) detected`);
  if (summary.passwordReset > 0) console.log(`  - ${summary.passwordReset} password reset endpoint(s) detected`);
  if (summary.signUp > 0) console.log(`  - ${summary.signUp} sign-up endpoint(s) detected`);
  if (summary.ignore > 0) console.log(`  - ${summary.ignore} internal endpoint(s) marked to ignore`);
  if (summary.fileUpload > 0) console.log(`  - ${summary.fileUpload} file upload field(s) configured`);
  if (summary.ref > 0) console.log(`  - ${summary.ref} foreign key reference(s) detected`);
  if (summary.chart > 0) console.log(`  - ${summary.chart} chart visualization(s) added`);
  
  console.log(`\nRun 'uigen serve openapi.yaml' to see the results.`);
}
```

## Testing Your Auto-Annotations

### 1. Run the auto-annotate process
```bash
# AI agent runs the detection and writes to config.yaml
```

### 2. Verify the config file
```bash
cat .uigen/config.yaml
```

### 3. Test with the serve command
```bash
uigen serve openapi.yaml
```

### 4. Check the generated UI
- Verify login form appears correctly
- Check file upload fields have proper restrictions
- Verify internal endpoints are hidden
- Check foreign key fields show as dropdowns
- Verify charts render correctly

## Common Pitfalls to Avoid

### 1. Don't Overwrite Existing Annotations
```typescript
// Bad
config.annotations = detectedAnnotations;

// Good
config.annotations = {
  ...config.annotations,
  ...detectedAnnotations
};
```

### 2. Don't Guess Aggressively
```typescript
// Bad: Marking every POST as login
if (method === 'POST') {
  annotations['x-uigen-login'] = true;
}

// Good: Use multiple signals
if (method === 'POST' && 
    path.includes('login') && 
    hasAuthFields(requestBody)) {
  annotations['x-uigen-login'] = true;
}
```

### 3. Don't Ignore Edge Cases
```typescript
// Handle missing operationId
const operationId = operation.operationId || 
                    `${method}_${path.replace(/\//g, '_')}`;

// Handle missing schemas
const schema = operation.requestBody?.content?.['application/json']?.schema;
if (!schema) return;
```

### 4. Don't Forget YAML Escaping
```typescript
// Paths with special characters need proper encoding
const encodedPath = path.replace(/~/g, '~0').replace(/\//g, '~1');
```

## Complete Workflow Example

```bash
# User invokes the skill
"Auto-annotate my OpenAPI spec"

# AI agent responds
"Found OpenAPI spec at examples/apps/fastapi/meeting-minutes/openapi.yaml, using it for annotation."

# AI agent analyzes the spec
# ... detection logic runs ...

# AI agent writes to config
# ... merges with existing config ...

# AI agent reports
✓ Auto-annotated OpenAPI spec: openapi.yaml
✓ Added 8 annotations to .uigen/config.yaml

Summary:
  - 1 login endpoint detected
  - 1 password reset endpoint detected
  - 1 sign-up endpoint detected
  - 1 internal endpoint marked to ignore
  - 2 file upload fields configured
  - 2 foreign key references detected

Run '@uigen-dev/cli serve openapi.yaml' to see the results.
```

## Conclusion

As an AI agent, your role is to:

1. **Locate the OpenAPI spec** (ask if not provided, auto-detect if possible)
2. **Parse and analyze** the spec for patterns
3. **Detect and generate** appropriate annotations
4. **Preserve existing** annotations in config.yaml
5. **Merge and write** the updated config
6. **Report results** with a clear summary

The annotations you generate will be used by UIGen to customize the generated application, eliminating the need for manual configuration in the config GUI.

**Key Files:**
- Read spec from: `openapi.yaml` (or user-provided path)
- Write annotations to: `.uigen/config.yaml`
- Reference metadata: `annotations.json`

**Testing:**
```bash
@uigen-dev/cli serve openapi.yaml
```

By following this skill, AI agents can intelligently annotate OpenAPI specs and provide users with a fully configured UIGen application without any manual work.
