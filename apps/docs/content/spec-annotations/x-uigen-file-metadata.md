---
title: File Upload Metadata
description: Control file upload behavior with x-uigen-file-types and x-uigen-max-file-size.
---

# File Upload Metadata

UIGen provides vendor extensions to control file upload validation and behavior. These annotations work with `type: string` and `format: binary` fields in your OpenAPI spec.

## Available annotations

| Annotation | Purpose | Default |
|---|---|---|
| `x-uigen-file-types` | Array of allowed MIME types | `['*/*']` (all files) |
| `x-uigen-max-file-size` | Maximum file size in bytes | `10485760` (10MB) |

## `x-uigen-file-types`

Restricts which file types users can upload. Accepts an array of MIME type strings.

### OpenAPI 3.x example

```yaml
components:
  schemas:
    ProfileUpdate:
      type: object
      properties:
        avatar:
          type: string
          format: binary
          x-uigen-file-types:
            - image/jpeg
            - image/png
            - image/webp
```

### Swagger 2.0 example

```yaml
definitions:
  ProfileUpdate:
    type: object
    properties:
      avatar:
        type: file
        x-uigen-file-types:
          - image/jpeg
          - image/png
          - image/webp
```

### Common MIME types

**Images:**
- `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`

**Documents:**
- `application/pdf`
- `application/msword` (DOC)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `application/vnd.ms-excel` (XLS)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)

**Video:**
- `video/mp4`, `video/webm`, `video/quicktime`

**Audio:**
- `audio/mpeg`, `audio/wav`, `audio/ogg`

**Archives:**
- `application/zip`, `application/x-tar`, `application/gzip`

### Wildcard patterns

Use wildcards to accept entire categories:

```yaml
avatar:
  type: string
  format: binary
  x-uigen-file-types:
    - image/*  # All image types
```

```yaml
document:
  type: string
  format: binary
  x-uigen-file-types:
    - application/*  # All application types
```

```yaml
any_file:
  type: string
  format: binary
  x-uigen-file-types:
    - '*/*'  # All file types (default)
```

## `x-uigen-max-file-size`

Sets the maximum allowed file size in bytes. Files exceeding this limit are rejected with a validation error.

### Example

```yaml
components:
  schemas:
    VideoUpload:
      type: object
      properties:
        video:
          type: string
          format: binary
          x-uigen-max-file-size: 104857600  # 100MB
```

### Common size values

```yaml
# 1MB
x-uigen-max-file-size: 1048576

# 5MB
x-uigen-max-file-size: 5242880

# 10MB (default)
x-uigen-max-file-size: 10485760

# 50MB
x-uigen-max-file-size: 52428800

# 100MB
x-uigen-max-file-size: 104857600

# 1GB
x-uigen-max-file-size: 1073741824
```

### Validation behavior

When a user selects a file that exceeds the limit:
- The file is rejected before upload
- An error message displays: "File size exceeds maximum of X MB"
- The form cannot be submitted until a valid file is selected

## Combining both annotations

Use both annotations together for complete control:

```yaml
components:
  schemas:
    DocumentUpload:
      type: object
      properties:
        resume:
          type: string
          format: binary
          description: Upload your resume (PDF only, max 5MB)
          x-uigen-file-types:
            - application/pdf
          x-uigen-max-file-size: 5242880
```

## Multiple file uploads

For array fields, the size limit applies to each individual file:

```yaml
components:
  schemas:
    GalleryUpload:
      type: object
      properties:
        images:
          type: array
          items:
            type: string
            format: binary
            x-uigen-file-types:
              - image/jpeg
              - image/png
            x-uigen-max-file-size: 5242880  # 5MB per image
```

## Standard OpenAPI properties

UIGen also respects the standard `contentMediaType` property from OpenAPI 3.x:

```yaml
avatar:
  type: string
  format: binary
  contentMediaType: image/png
  x-uigen-file-types:
    - image/jpeg
    - image/png
```

When both `contentMediaType` and `x-uigen-file-types` are present, `x-uigen-file-types` takes precedence.

## File type detection

UIGen automatically categorizes files into types for optimized validation and preview:

| Category | Detected from MIME types |
|---|---|
| `image` | `image/*` |
| `document` | `application/pdf`, Office documents, text files |
| `video` | `video/*` |
| `audio` | `audio/*` |
| `generic` | All other types |

This categorization is automatic and does not require any annotations.

## Validation errors

UIGen performs client-side validation before upload:

**File type mismatch:**
```
File type not allowed. Expected: image/jpeg, image/png
```

**File too large:**
```
File size exceeds maximum of 5 MB
```

**Empty file:**
```
File is empty
```

**Extension mismatch:**
```
File extension does not match MIME type
```

## Browser compatibility

The file type restrictions use the HTML `accept` attribute, which is supported in all modern browsers. However, users can still attempt to select invalid files, so server-side validation is still required.

## Config Reconciliation

You can override file metadata annotations using the [Config Reconciliation](/docs/core-concepts/config-reconciliation) system without modifying your OpenAPI spec.

### Example config file

Create a `.uigen/config.yaml` file in your project root:

```yaml
version: "1.0"
enabled:
  x-uigen-file-types: true
  x-uigen-max-file-size: true
defaults:
  x-uigen-file-types:
    - '*/*'
  x-uigen-max-file-size: 10485760
annotations:
  # Restrict avatar uploads to images only
  User.avatar:
    x-uigen-file-types:
      - image/jpeg
      - image/png
      - image/webp
    x-uigen-max-file-size: 5242880  # 5MB
  
  # Allow PDF documents up to 10MB
  Document.file:
    x-uigen-file-types:
      - application/pdf
    x-uigen-max-file-size: 10485760  # 10MB
  
  # Accept all video types up to 100MB
  Media.video:
    x-uigen-file-types:
      - video/*
    x-uigen-max-file-size: 104857600  # 100MB
```

### Config precedence

When the same annotation exists in both your spec and config file, the config value takes precedence:

```yaml
# In your OpenAPI spec:
User.avatar:
  type: string
  format: binary
  x-uigen-file-types:
    - '*/*'  # Accept all files

# In .uigen/config.yaml:
annotations:
  User.avatar:
    x-uigen-file-types:
      - image/jpeg
      - image/png

# Result: Only JPEG and PNG images are accepted (config wins)
```

### Using the Config GUI

The [Config GUI](/docs/tools/config-gui) provides a visual interface for managing file metadata annotations:

1. Start the config GUI: `npx @uigen-dev/cli config openapi.yaml`
2. Select a file field in the visual editor
3. Configure `x-uigen-file-types` using the multi-select dropdown
4. Set `x-uigen-max-file-size` using the file size input with unit selector
5. Save your changes to `.uigen/config.yaml`

The config GUI automatically filters annotations to show only those applicable to file fields.

## See also

- [Field Components](/docs/views-and-components/field-components) - File upload component behavior
- [Spec Annotations Overview](/docs/spec-annotations/overview) - All available annotations
- [Config Reconciliation](/docs/core-concepts/config-reconciliation) - Override annotations without modifying your spec
