---
title: x-uigen-profile
description: Mark a resource as a profile resource for specialized card-based rendering instead of generic table views.
---

# x-uigen-profile

The `x-uigen-profile` annotation marks a resource as a profile resource in your OpenAPI specification. When applied, UIGen renders the resource as a dedicated profile page with a card-based layout optimized for viewing and editing user account information, rather than the generic table-based list views used for standard CRUD resources.

## Purpose

Use `x-uigen-profile` when:

- You have a user profile or account settings endpoint (e.g., `/api/v1/users/me`)
- You want a dedicated profile page with card-based layout instead of table views
- You need to display user information in a more visually organized format
- You want profile information accessible via a dedicated `/profile` route
- You want to hide profile resources from the dashboard resource list

## How it works

When a resource is marked with `x-uigen-profile: true`, UIGen:

1. Creates a dedicated `/profile` route that renders the resource in a card-based layout
2. Adds a "Profile" link to the sidebar navigation
3. Filters the profile resource from the dashboard resource cards
4. Groups related fields visually (personal info, contact info, etc.)
5. Displays avatar images when an image field is present
6. Provides inline edit functionality when update operations are available

The resource remains accessible via its standard routes (e.g., `/users/me`) in addition to the `/profile` route.

## Supported values

`x-uigen-profile` accepts **boolean values only**:

- `true`: mark the resource as a profile resource
- `false`: explicitly exclude the resource from profile treatment
- (absent): default behavior, resource renders as standard resource

Non-boolean values (strings, numbers, objects, arrays, null) are rejected with a warning and the annotation is ignored.

## Supported locations

`x-uigen-profile` is a **resource-level annotation only**. It can be applied:

| Location | Effect |
|---|---|
| Path item (inline) | Marks all operations on that path as part of a profile resource |
| Resource (via config.yaml) | Marks a resource as a profile resource using path syntax |

Unlike field-level annotations (x-uigen-label, x-uigen-chart), this annotation applies only at the resource level, not to individual operations or schema properties.

## Single profile resource

UIGen supports **one profile resource per application**. If multiple resources are marked with `x-uigen-profile: true`, UIGen logs a warning and uses the first profile resource for the `/profile` route. All profile resources are still filtered from the dashboard and accessible via their standard routes.

## Profile view vs table view

### Table view (standard resources)

Standard resources display data in table-based list views:

```
┌─────────────────────────────────────┐
│  Users                              │
├─────────────────────────────────────┤
│  ID  │  Name      │  Email          │
├─────────────────────────────────────┤
│  1   │  John Doe  │  john@ex.com    │
│  2   │  Jane Doe  │  jane@ex.com    │
└─────────────────────────────────────┘
```

### Profile view (profile resources)

Profile resources display data in card-based layouts with visual grouping:

```
┌─────────────────────────────────────┐
│  Profile Header                     │
│  ┌─────┐  John Doe                  │
│  │ Img │  john@example.com          │
│  └─────┘  [Edit Button]             │
├─────────────────────────────────────┤
│  Personal Information               │
│  ┌─────────────────────────────┐   │
│  │ First Name: John            │   │
│  │ Last Name: Doe              │   │
│  │ Date of Birth: 1990-01-01   │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  Contact Information                │
│  ┌─────────────────────────────┐   │
│  │ Email: john@example.com     │   │
│  │ Phone: +1234567890          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

Key differences:

- **Layout**: Cards vs tables
- **Grouping**: Related fields grouped visually vs flat columns
- **Navigation**: Dedicated `/profile` route vs resource list route
- **Dashboard**: Hidden from dashboard vs displayed as resource card
- **Avatar**: Image fields displayed as avatar vs table cell
- **Edit**: Inline edit form vs separate edit page

## OpenAPI 3.x examples

### Inline annotation

Mark a user profile endpoint as a profile resource directly in the spec:

```yaml
paths:
  /api/v1/users/me:
    x-uigen-profile: true
    get:
      summary: Get current user profile
      operationId: getCurrentUser
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    patch:
      summary: Update current user profile
      operationId: updateCurrentUser
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserUpdate'
      responses:
        '200':
          description: Updated user profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        first_name:
          type: string
        last_name:
          type: string
        email:
          type: string
          format: email
        phone:
          type: string
        avatar_url:
          type: string
          format: uri
        date_of_birth:
          type: string
          format: date
```

### Explicit exclusion

Explicitly exclude a resource from profile treatment:

```yaml
paths:
  /api/v1/admin/profile:
    x-uigen-profile: false
    get:
      summary: Get admin profile
      responses:
        '200':
          description: Admin profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminProfile'
```

### Profile with avatar

Profile view automatically displays image fields as avatars:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
        avatar_url:
          type: string
          format: uri
          # This field is displayed as an avatar in the profile header
        profile_picture:
          type: string
          format: binary
          # Binary image fields are also displayed as avatars
```

## Config.yaml examples

### Resource-level annotation

Mark a resource as a profile resource using path syntax in config.yaml:

```yaml
# .uigen/config.yaml
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
```

### Multiple resources (warning scenario)

If multiple resources are marked as profile resources, UIGen logs a warning and uses the first one:

```yaml
# .uigen/config.yaml
annotations:
  /api/v1/users/me:
    x-uigen-profile: true
  /api/v1/profile:
    x-uigen-profile: true
  # Warning: Multiple profile resources found. Using first: /api/v1/users/me
```

### Precedence rules

Inline spec annotations take precedence over config.yaml:

```yaml
# openapi.yaml
paths:
  /api/v1/users/me:
    x-uigen-profile: true
    # This takes precedence

# .uigen/config.yaml
annotations:
  /api/v1/users/me:
    x-uigen-profile: false
    # This is ignored
```

## Boolean semantics

The `x-uigen-profile` annotation has three possible states:

| Value | Meaning | Behavior |
|---|---|---|
| `true` | Explicitly mark as profile resource | Renders as profile page, adds profile link, filters from dashboard |
| `false` | Explicitly exclude from profile treatment | Renders as standard resource (table view) |
| (absent) | No annotation | Default behavior, renders as standard resource (table view) |

**Important**: Only `true` triggers profile behavior. Both `false` and absent result in standard resource rendering.

## Field grouping

Profile view automatically groups related fields for better visual organization:

### Grouping by prefix

Fields with common prefixes are grouped together:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        contact_email:
          type: string
        contact_phone:
          type: string
        contact_address:
          type: string
        # These are grouped under "Contact" section
        
        billing_address:
          type: string
        billing_city:
          type: string
        billing_country:
          type: string
        # These are grouped under "Billing" section
```

### Grouping by semantic similarity

Fields are also grouped by semantic meaning:

- Email and phone fields → "Contact Information"
- Address, city, country fields → "Address"
- First name, last name, date of birth → "Personal Information"
- Password, security questions → "Security"

### Ungrouped fields

Fields that don't match any grouping pattern are displayed in a "General" section.

## Navigation integration

When a profile resource exists, UIGen adds a "Profile" link to the sidebar:

- **Icon**: User icon (from lucide-react)
- **Position**: Bottom of sidebar, visually separated from resource links
- **Route**: Links to `/profile`
- **Visibility**: Only appears when a profile resource exists

## Dashboard integration

Profile resources are automatically filtered from the dashboard resource cards:

- **Filtering**: Profile resources don't appear in dashboard resource list
- **Focus**: Dashboard shows only data management resources
- **Access**: Profile still accessible via sidebar link and standard routes

## Interaction with other annotations

`x-uigen-profile` works seamlessly with other UIGen annotations:

### With `x-uigen-label`

Profile view respects custom field labels:

```yaml
paths:
  /api/v1/users/me:
    x-uigen-profile: true
    get:
      x-uigen-label: My Account
      # Profile page title shows "My Account"
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                type: object
                properties:
                  usr_id:
                    type: integer
                    x-uigen-label: User ID
                    # Field label shows "User ID" instead of "Usr Id"
```

### With `x-uigen-ignore`

Hidden fields are not shown in profile view:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        password_hash:
          type: string
          x-uigen-ignore: true
          # This field is hidden in profile view
```

### With `x-uigen-ref`

Reference fields are rendered as dropdowns in edit mode:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        department_id:
          type: integer
          x-uigen-ref: '#/components/schemas/Department'
          # Rendered as dropdown in profile edit form
```

## Error handling

### Non-boolean value

If a non-boolean value is provided, UIGen logs a warning and ignores the annotation:

```yaml
paths:
  /api/v1/users/me:
    x-uigen-profile: "yes"  # Invalid: string instead of boolean
    # Warning: x-uigen-profile must be a boolean, found string
    # Annotation ignored, resource renders as standard resource
```

### Multiple profile resources

If multiple resources are marked as profile resources, UIGen logs a warning:

```yaml
# Warning: Multiple profile resources found: /api/v1/users/me, /api/v1/profile
# Using first: /api/v1/users/me
```

All profile resources are still:
- Filtered from the dashboard
- Accessible via their standard routes
- Only the first is used for the `/profile` route

### Missing profile resource

If a user navigates to `/profile` but no profile resource exists:

```
┌─────────────────────────────────────┐
│  No profile configured              │
│                                     │
│  [Go to Dashboard]                  │
└─────────────────────────────────────┘
```

### Profile resource without GET operation

If a profile resource has no GET operation for fetching data:

```
┌─────────────────────────────────────┐
│  Profile data cannot be loaded      │
│                                     │
│  [Go to Dashboard]                  │
└─────────────────────────────────────┘
```

## Accessibility

Profile view is built with accessibility in mind:

- **Semantic HTML**: Uses `<section>`, `<article>`, `<header>` elements
- **ARIA labels**: Edit button has `aria-label="Edit profile"`
- **Form labels**: All form fields have proper `<label>` elements
- **Keyboard navigation**: Full keyboard support for navigation and editing
- **Screen readers**: State changes announced to screen readers

## Mobile responsiveness

Profile view is fully responsive:

- **Card stacking**: Cards stack vertically on mobile devices
- **Avatar scaling**: Avatar scales appropriately for screen size
- **Touch targets**: Buttons and links are touch-friendly (minimum 44x44px)
- **Field groups**: Field groups collapse on small screens for better readability

## Default behavior

Without `x-uigen-profile`, all resources render as standard resources with table-based list views. The annotation is entirely optional and purely additive - it doesn't break existing functionality.

## Validation

UIGen validates `x-uigen-profile` values and provides feedback:

- **Non-boolean value**: Warning logged: `x-uigen-profile must be a boolean, found <type>`. Annotation ignored.
- **Multiple profile resources**: Warning logged: `Multiple profile resources found: <resource1>, <resource2>. Using first: <resource1>`.
- **Profile resource without GET**: Error logged: `Profile resource <resource> has no GET operation`.

## Use cases

### User account settings

```yaml
paths:
  /api/v1/users/me:
    x-uigen-profile: true
    get:
      summary: Get current user
    patch:
      summary: Update current user
```

### Customer profile

```yaml
paths:
  /api/v1/customers/me:
    x-uigen-profile: true
    get:
      summary: Get customer profile
    put:
      summary: Update customer profile
```

### Organization settings

```yaml
paths:
  /api/v1/organizations/current:
    x-uigen-profile: true
    get:
      summary: Get organization settings
    patch:
      summary: Update organization settings
```

## Limitations

- **Single profile per app**: Only one profile resource is supported per application
- **Resource-level only**: Cannot be applied to individual operations or fields
- **No nested profiles**: Profile resources cannot contain nested profile resources
- **No custom layouts**: Profile layout is predefined (card-based with field grouping)

## Future enhancements

Potential future extensions to `x-uigen-profile`:

- **Multiple profile tabs**: Support for multiple profile sections (Account, Security, Preferences)
- **Profile templates**: Predefined layouts for common profile patterns
- **Custom field grouping**: Explicit field grouping configuration
- **Profile completeness**: Progress indicator for profile completion
- **Profile verification**: Email/phone verification workflows
