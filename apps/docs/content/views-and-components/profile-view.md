---
title: Profile View
description: User profile page with card-based layout and inline editing capabilities.
---

# Profile View

The Profile View is generated for endpoints annotated with `x-uigen-profile: true`. It renders a dedicated profile page with a modern card-based layout optimized for viewing and editing user account information.

## Features

- **Card-based layout**: Profile information displayed in visually organized cards with proper spacing and hierarchy
- **Field grouping**: Related fields automatically grouped together (Personal Info, Contact Info, etc.)
- **Avatar display**: Image fields automatically rendered as profile avatars
- **Inline editing**: Edit profile data without navigating to a separate page (when PUT/PATCH operation exists)
- **Real-time validation**: Client-side validation with immediate feedback
- **Responsive design**: Mobile-first layout that adapts to all screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support

## When it appears

The Profile View appears when:

1. An endpoint is annotated with `x-uigen-profile: true`
2. The endpoint has a GET operation for fetching profile data
3. A dedicated `/profile` route is created in the application

## Basic usage

### View mode

When a user navigates to `/profile`, the ProfileView component:

1. Fetches profile data using the GET operation
2. Groups related fields visually
3. Displays an avatar if an image field is present
4. Shows an "Edit" button if a PUT/PATCH operation exists

### Edit mode

When the user clicks "Edit":

1. The view switches to edit mode with form inputs
2. Current values are pre-filled in the form
3. Input types are automatically selected based on field schema (email, text, date, etc.)
4. Real-time validation provides immediate feedback
5. "Save" and "Cancel" buttons appear

## ProfileView component

### Props

```typescript
interface ProfileViewProps {
  config: UIGenApp;           // Application configuration
  resourceSlug?: string;      // Optional resource identifier
}
```

### State management

The ProfileView component manages several pieces of state:

- `isEditing`: Boolean flag for view/edit mode
- `formData`: Current form field values during editing
- `validationErrors`: Client-side validation errors
- `serverErrors`: Server-side validation errors from API

### Key behaviors

**Edit button visibility**: The Edit button only appears when:
- A PUT or PATCH operation exists in the OpenAPI spec
- The user has successfully loaded profile data

**Mode switching**:
- Clicking "Edit" switches to edit mode and focuses the first input field
- Clicking "Cancel" discards changes and returns to view mode
- Pressing Escape key cancels edit mode
- Successful save returns to view mode and refetches data

**Focus management**:
- Entering edit mode moves focus to the first editable field
- Exiting edit mode returns focus to the Edit button
- Error fields maintain focus for accessibility

## ProfileEditForm component

The ProfileEditForm component handles the inline editing experience.

### Props

```typescript
interface ProfileEditFormProps {
  fields: SchemaNode[];                           // Schema fields to render
  data: Record<string, unknown>;                  // Current profile data
  errors?: Record<string, string>;                // Server-side validation errors
  onSave: (data: Record<string, unknown>) => void; // Save callback
  onCancel: () => void;                           // Cancel callback
  isLoading?: boolean;                            // Loading state during submission
}
```

### Features

**Dynamic input types**: The form automatically selects appropriate input types:

| Field format | Input type |
|---|---|
| `email` | `<input type="email">` |
| `uri`, `url` | `<input type="url">` |
| `date` | `<input type="date">` |
| `date-time` | `<input type="datetime-local">` |
| `number`, `integer` | `<input type="number">` |
| `boolean` | `<input type="checkbox">` |
| Default | `<input type="text">` |

**Real-time validation**: As users type, the form validates:
- Email format (RFC 5322 compliant)
- Required fields
- Username pattern (alphanumeric and underscores)
- Min/max length constraints
- Custom validation rules from schema

**Error display**: Validation errors appear:
- Below the relevant input field
- In red text with alert role for screen readers
- With `aria-describedby` linking error to input

**Button states**:
- Save button disabled when validation errors exist
- Both buttons disabled during submission
- Save button shows "Saving..." text during submission

## API integration

### useProfileUpdate hook

The `useProfileUpdate` hook provides a simplified interface for profile updates:

```typescript
const {
  updateProfile,  // Function to trigger update
  isUpdating,     // Loading state
  error,          // Error object
  isSuccess,      // Success state
  reset           // Reset mutation state
} = useProfileUpdate(operation);
```

**Cache invalidation**: After a successful update, the hook automatically invalidates related queries:
- `profile`
- `auth/me`
- `user`
- `me`

This ensures the UI reflects the latest data without manual refetching.

### Error handling

The ProfileView handles different error scenarios:

**Network errors**: Displays a user-friendly message with retry button

**Validation errors (422)**: Parses field-specific errors and displays them inline below each field

**Conflict errors (409)**: Displays "already exists" message on the relevant field (username or email)

**Authentication errors (401)**: Automatically clears credentials and redirects to login

## Backend API endpoint

### Endpoint specification

```
PUT /api/v1/auth/me
```

**Authentication**: Required (Bearer token in Authorization header)

**Request body**:
```json
{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

**Response (200 OK)**:
```json
{
  "id": 123,
  "username": "newusername",
  "email": "newemail@example.com",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `409 Conflict`: Username or email already exists
- `422 Validation Error`: Invalid field values

### Validation rules

**Username**:
- Type: String (optional)
- Min length: 3 characters
- Max length: 50 characters
- Pattern: Alphanumeric and underscores only (`^[a-zA-Z0-9_]+$`)
- Uniqueness: Must be unique across all users

**Email**:
- Type: String (optional)
- Format: Valid email address (RFC 5322)
- Max length: 255 characters
- Uniqueness: Must be unique across all users

**Read-only fields**: The following fields cannot be modified:
- `id`: User identifier
- `created_at`: Account creation timestamp

### Example validation error

```json
{
  "detail": [
    {
      "loc": ["body", "username"],
      "msg": "ensure this value has at least 3 characters",
      "type": "value_error.any_str.min_length"
    },
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

## OpenAPI specification

### Complete example

```yaml
paths:
  /api/v1/auth/me:
    x-uigen-profile: true
    get:
      summary: Get current user profile
      operationId: get_current_user
      tags:
        - auth
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User profile retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '401':
          description: Unauthorized
    
    put:
      summary: Update current user profile
      operationId: update_current_user
      tags:
        - auth
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserUpdate'
      responses:
        '200':
          description: Profile updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '401':
          description: Unauthorized
        '409':
          description: Username or email already exists
        '422':
          description: Validation error

components:
  schemas:
    UserUpdate:
      type: object
      properties:
        username:
          type: string
          minLength: 3
          maxLength: 50
          pattern: '^[a-zA-Z0-9_]+$'
        email:
          type: string
          format: email
          maxLength: 255
    
    UserResponse:
      type: object
      required:
        - id
        - username
        - created_at
      properties:
        id:
          type: integer
        username:
          type: string
        email:
          type: string
          nullable: true
        created_at:
          type: string
          format: date-time

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Usage examples

### Basic profile with edit

```yaml
paths:
  /api/v1/users/me:
    x-uigen-profile: true
    get:
      summary: Get my profile
      security:
        - bearerAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    put:
      summary: Update my profile
      security:
        - bearerAuth: []
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserUpdate'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
```

### Read-only profile (no edit button)

```yaml
paths:
  /api/v1/users/me:
    x-uigen-profile: true
    get:
      summary: Get my profile
      security:
        - bearerAuth: []
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    # No PUT/PATCH operation - Edit button will not appear
```

### Profile with custom labels

```yaml
paths:
  /api/v1/users/me:
    x-uigen-profile: true
    get:
      x-uigen-label: My Account
      # Profile page title shows "My Account"
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  usr_id:
                    type: integer
                    x-uigen-label: User ID
                  first_name:
                    type: string
                    x-uigen-label: First Name
```

## Accessibility

The Profile View is built with accessibility in mind:

### Keyboard navigation

- **Tab**: Navigate between interactive elements
- **Enter**: Submit form when in edit mode
- **Escape**: Cancel edit mode and return to view mode
- All buttons and inputs are keyboard accessible

### ARIA labels

- Edit button: `aria-label="Edit profile"`
- Save button: `aria-label="Save profile changes"`
- Cancel button: `aria-label="Cancel editing"`
- Error messages: `role="alert"` for screen reader announcements

### Semantic HTML

- `<form>` element for edit form
- `<label>` elements for all inputs
- `<section>` elements for field groups
- `<article>` for profile card

### Focus management

- Entering edit mode moves focus to first input field
- Exiting edit mode returns focus to Edit button
- Error fields maintain focus for correction

### Screen reader announcements

- Mode changes announced (entering/exiting edit mode)
- Loading states announced during submission
- Success/error messages announced via aria-live regions

### Color contrast

All text and interactive elements meet WCAG 2.1 Level AA contrast requirements (4.5:1 for normal text, 3:1 for large text).

## Responsive design

The Profile View adapts to different screen sizes:

### Mobile (< 768px)

- Single column layout
- Cards stack vertically
- Avatar scales to 80px
- Padding: 16px
- Font sizes optimized for mobile

### Tablet (768px - 1024px)

- Single column layout with wider cards
- Avatar scales to 96px
- Padding: 20px
- Increased spacing between elements

### Desktop (> 1024px)

- Wider card layout (max-width: 800px)
- Avatar scales to 128px
- Padding: 24px
- Optimal line lengths for readability

## Field grouping

The Profile View automatically groups related fields for better visual organization:

### Grouping strategies

**By prefix**: Fields with common prefixes are grouped together
- `contact_email`, `contact_phone` → "Contact" section
- `billing_address`, `billing_city` → "Billing" section

**By semantic meaning**: Fields are grouped by their purpose
- Email, phone → "Contact Information"
- Address, city, country → "Address"
- First name, last name, date of birth → "Personal Information"

**Ungrouped fields**: Fields that don't match any pattern appear in a "General" section

### Example grouping

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        # Personal Information group
        first_name:
          type: string
        last_name:
          type: string
        date_of_birth:
          type: string
          format: date
        
        # Contact Information group
        email:
          type: string
          format: email
        phone:
          type: string
        
        # Address group
        street_address:
          type: string
        city:
          type: string
        country:
          type: string
```

## Customization

Replace the Profile View for specific customization:

```typescript
import { overrideRegistry } from '@uigen-dev/react';
import MyCustomProfileView from './MyCustomProfileView';

overrideRegistry.register({
  id: 'profile.view',
  mode: 'component',
  component: MyCustomProfileView,
});
```

## Related documentation

- [x-uigen-profile annotation](/docs/spec-annotations/x-uigen-profile)
- [Authentication overview](/docs/authentication/overview)
- [Edit Form View](/docs/views-and-components/edit-form-view)
- [Field components](/docs/views-and-components/field-components)
