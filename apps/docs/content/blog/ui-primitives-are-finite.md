---
title: "UI Primitives Are Finite: Why UIGen Is a Runtime, Not a Code Generator"
author: "Olebogeng Mbedzi"
date: "2026-05-11"
excerpt: "The fundamental insight behind UIGen: UI primitives are finite, but interactions are not. How this truth led us to build a runtime that interprets your API spec, not a code generator."
tags: ["architecture", "philosophy", "technical", "ai-agents"]
---

## The Core Insight

There is a finite set of UI primitives. Text inputs, dropdowns, checkboxes, tables, buttons, date pickers. You can count them. There are maybe 30-40 distinct UI primitives that cover 95% of all CRUD applications.

This is not a limitation. It is a fundamental truth about user interfaces. And it is the premise that UIGen is built on.

If UI primitives are finite, we can build a runtime that maps data types to UI primitives. We do not need to generate code. We need an intelligent interpreter that reads your API spec and renders the appropriate components.

But here is the critical insight: **common interactions are also finite**. Form submissions, validation, data fetching, pagination, sorting, filtering, multi-step forms - these are patterns that repeat across applications. UIGen infers and handles these common interactions automatically.

Where UIGen stops is **complex application-specific flow**. Custom business logic, intricate state machines, domain-specific workflows - these are infinite and unique to each application. UIGen does not try to abstract these away.

This is why UIGen does not try to reinvent JSX or React. It embraces them. UIGen is a runtime with pluggable renderers. The React renderer is one implementation, but you could build renderers for Vue, Svelte, or mobile frameworks. UIGen handles the boilerplate (UI primitives and common interactions). You handle the complex flow using the tools you already know.

---

## The Finite Set of UI Primitives

Let's enumerate them. Here are the core UI primitives for CRUD applications:

**Input Primitives:**
- Text input (single line)
- Text area (multi-line)
- Number input
- Email input
- Password input
- URL input
- Phone input
- Search input

**Selection Primitives:**
- Dropdown (single select)
- Multi-select
- Radio buttons
- Checkboxes
- Autocomplete
- Combobox

**Date/Time Primitives:**
- Date picker
- Time picker
- Date-time picker
- Date range picker

**File Primitives:**
- File upload (single)
- File upload (multiple)
- Image upload with preview
- Drag-and-drop zone

**Display Primitives:**
- Table (with sorting, filtering, pagination)
- List (simple, card-based)
- Detail view (key-value pairs)
- Card grid
- Timeline
- Tree view

**Action Primitives:**
- Button (primary, secondary, danger)
- Icon button
- Split button
- Button group
- Dropdown menu

**Feedback Primitives:**
- Toast notification
- Alert banner
- Modal dialog
- Confirmation dialog
- Loading spinner
- Progress bar
- Skeleton loader

**Layout Primitives:**
- Form layout (vertical, horizontal, grid)
- Page layout (sidebar, header, content)
- Card container
- Tabs
- Accordion
- Stepper

That is it. Roughly 40 primitives. Every CRUD application you have ever built uses some subset of these primitives. The primitives do not change. What changes is how you compose them and what interactions you attach to them.

---

## Why This Matters

If UI primitives are finite, we can build a runtime that automatically maps data types to primitives. This is what UIGen does.

### Automatic Mapping

UIGen reads your OpenAPI spec and infers the right UI primitive for each field:

```yaml
# OpenAPI Schema
Template:
  type: object
  properties:
    name:
      type: string
      minLength: 3
      maxLength: 100
    description:
      type: string
    categoryId:
      type: integer
    tags:
      type: array
      items:
        type: string
    isActive:
      type: boolean
    createdAt:
      type: string
      format: date-time
    file:
      type: string
      format: binary
```

UIGen automatically maps:
- `name` (string with length constraints) → Text input with validation
- `description` (string, no constraints) → Text area
- `categoryId` (integer, foreign key) → Dropdown (fetches categories)
- `tags` (array of strings) → Multi-select or tag input
- `isActive` (boolean) → Checkbox or toggle
- `createdAt` (date-time) → Date-time picker (or read-only display)
- `file` (binary) → File upload component

No code generation. No templates. UIGen interprets the spec at runtime and the renderer creates the appropriate components.

### Customizable Mapping

The automatic mapping is good, but not perfect. Sometimes you want a different primitive. UIGen lets you override the mapping declaratively:

```yaml
# .uigen/config.yaml
annotations:
  # Define relationships for foreign keys
  Template.categoryId:
    x-uigen-ref:
      resource: "Category"
      valueField: "id"
      labelField: "name"
  
  # Configure file upload constraints
  Template.file:
    x-uigen-file-types:
      - application/pdf
      - application/vnd.openxmlformats-officedocument.wordprocessingml.document
    x-uigen-max-file-size: 10485760  # 10MB
  
  # Format datetime fields
  Template.createdAt:
    x-uigen-datetime:
      format: "YYYY-MM-DD HH:mm:ss"
      timezone: "America/New_York"
  
  # Hide sensitive fields
  User.password:
    x-uigen-ignore: true
```

The config is declarative. You declare what you want, not how to build it. UIGen handles the rest.

---

## Why UIGen Is a Runtime

Here is where UIGen differs from code generators. UIGen is a runtime with pluggable renderers.

### The Architecture

```
OpenAPI Spec + Config
        ↓
   UIGen Core
        ↓
  Generates IR (JSON)
        ↓
Renderer interprets at runtime
        ↓
   Live Application
```

UIGen Core is framework-agnostic. It parses your OpenAPI spec and produces an Intermediate Representation (IR) - a JSON structure that describes your application.

The renderer is pluggable. The React renderer interprets the IR and creates React components. But you could build renderers for Vue, Svelte, React Native, or Flutter. The same IR works with any renderer.

### Why Runtime Over Code Generation

**1. Common Interactions Are Handled**

UIGen does not just map data types to UI primitives. It infers and handles common interactions:

**Form Interactions:**
- Form submission (POST/PUT requests)
- Client-side validation (from JSON Schema)
- Server-side error handling
- Success/error notifications
- Redirect after submission
- Loading states

**List Interactions:**
- Pagination (offset/limit, page/pageSize)
- Sorting (by column)
- Filtering (search, facets)
- Row selection
- Bulk actions
- Click to detail view

**Multi-Step Forms:**
- Step navigation
- Progress indicator
- Step validation
- Data persistence across steps
- Back/forward navigation

**Data Fetching:**
- Loading states
- Error handling
- Retry logic
- Cache management
- Optimistic updates

These are patterns that repeat across applications. UIGen infers them from your OpenAPI spec and handles them automatically. You do not write boilerplate for form submissions, pagination, or validation. UIGen handles it.

**2. Complex Flow Is Where UIGen Stops**

What UIGen does not try to handle:

**2. Complex Flow Is Where UIGen Stops**

What UIGen does not try to handle:

- Complex business logic (custom pricing calculations, approval workflows)
- Intricate state machines (multi-stage checkout with branching logic)
- Domain-specific workflows (medical diagnosis flow, loan application process)
- Custom orchestration (call three APIs, transform data, update four resources)
- Application-specific side effects (sync to external system, trigger webhooks)

These are unique to each application. You cannot infer them from an API spec. You need real code.

For most CRUD applications, UIGen handles 90% of the interactions. Form submissions, validation, pagination, sorting, filtering - all automatic. You only write code for the 10% that is unique to your domain.

**3. Pluggable Renderers**

The React renderer is one implementation. UIGen produces a framework-agnostic IR. You could build renderers for:
- **Vue** (using Vue components and Composition API)
- **Svelte** (using Svelte components and stores)
- **React Native** (for mobile apps)
- **Flutter** (for cross-platform apps)
- **Web Components** (framework-agnostic)

The same OpenAPI spec works with any renderer. UIGen Core is the constant. The renderer is the variable.

**4. No Abstraction Leaks**

The React renderer uses standard React patterns:
- React Hook Form for form state
- TanStack Query for data fetching
- Zod for validation
- TanStack Table for tables

If you know React, you know how the React renderer works. There is no new framework to learn. The renderer is just React components that read the IR.

**5. Composable Components**

The renderer produces standard React components. You can compose them with your own components:

```tsx
import { ListView, DetailView, FormView } from '@uigen/react';

function TemplatesPage() {
  return (
    <div>
      <CustomHeader />
      <ListView resource={templatesResource} operation={listOperation} />
    </div>
  );
}
```

Want to add custom validation? Use hooks to extend behavior:

```tsx
import { FormView } from '@uigen/react';

function TemplateCreatePage() {
  const handleSuccess = (response) => {
    // Custom side effect: log to analytics
    analytics.track('Template Created', {
      templateId: response.id,
      templateName: response.name
    });
  };
  
  return (
    <FormView 
      resource={templatesResource}
      mode="create"
      onSuccess={handleSuccess}
    />
  );
}
```

It is just React. No magic, no abstraction, no DSL.

---

## The OpenAPI Spec as Source of Truth

This is where UIGen shines for experiment-driven SaaS. The OpenAPI spec is the source of truth for your application.

### Why This Matters

In a typical SaaS application, the frontend and backend diverge over time:
- Backend adds a field, frontend does not show it
- Backend changes validation, frontend still uses old rules
- Backend renames an endpoint, frontend breaks

With UIGen, the OpenAPI spec is the contract. If the spec changes, the UI updates automatically. There is no divergence.

```bash
# Backend team adds a new field to Template
# You regenerate the IR
uigen serve openapi.yaml
# The new field appears in forms and tables automatically
```

This is powerful for fast-moving teams. You can iterate on the API without manually updating the frontend.

### Even in Non-API-Heavy Apps

You might think: "My app is not API-heavy. I have a lot of custom UI."

UIGen still helps. Here is why:

**1. Custom functionality is referenced via x-uigen-id**

UIGen uses the x-uigen-id annotation to create stable identifiers for custom components. You can override specific views:

```yaml
# In your OpenAPI spec
paths:
  /api/v1/templates:
    post:
      x-uigen-id: template-create
      summary: Create template
```

Then create a custom component in `src/overrides/template-create.tsx`:

```tsx
// src/overrides/template-create.tsx
import { OverrideDefinition } from '@uigen/react';

export const override: OverrideDefinition = {
  mode: 'component',
  component: () => <CustomTemplateForm />
};
```

The override system discovers and applies your custom component automatically.

**2. The spec documents your API**

Even if you do not use UIGen for the entire UI, the spec documents your API. You can use UIGen for admin panels, internal tools, or prototypes while hand-coding the customer-facing UI.

**3. The spec enables tooling**

With an OpenAPI spec, you get:
- API documentation (Swagger UI, Redoc)
- API mocking (Prism, Mockoon)
- API testing (Postman, Insomnia)
- Type generation (openapi-typescript)
- Client generation (openapi-generator)

UIGen is one tool in the ecosystem. The spec is the foundation.

---

## The Age of AI Agents

This architecture is especially powerful in the age of AI agents. Why?

### Reason 1: Agents Can Modify the Spec

AI agents can read and modify OpenAPI specs. They cannot reliably read and modify thousands of lines of generated code.

With UIGen, an agent can:
1. Read the OpenAPI spec
2. Understand the data model
3. Modify the spec (add a field, change validation)
4. Regenerate the IR
5. The UI updates automatically

The agent does not need to understand React, forms, tables, or validation. It just modifies the spec.

### Reason 2: Agents Can Modify the Config

AI agents can read and modify YAML config files. They cannot reliably edit generated code without breaking it.

With UIGen, an agent can:
1. Read the config file
2. Understand the customizations
3. Modify the config (hide a field, change a label)
4. The UI updates automatically

The agent does not need to understand the renderer. It just modifies the config.

### Reason 3: The Spec is the Interface

In an agent-driven workflow, the OpenAPI spec is the interface between the agent and the application. The agent reads the spec to understand what the API does. It modifies the spec to change what the API does.

UIGen makes the spec the interface for the UI as well. The agent modifies the spec, and both the API and the UI update.

This is the future. Agents that can modify applications by modifying specs, not code.

---

## Easy to Modify on the Fly

Because the spec and config are declarative, you can modify the UI on the fly without recompiling or redeploying.

### Example: Hide a Field

```yaml
# .uigen/config.yaml
annotations:
  User.ssn:
    x-uigen-ignore: true
```

Save the file. The UI updates. No build step, no deployment.

### Example: Change a Label

```yaml
annotations:
  User.email:
    x-uigen-label: "Email Address"
```

Save the file. The label changes. Instant feedback.

### Example: Configure File Upload

```yaml
annotations:
  Template.document:
    x-uigen-file-types:
      - application/pdf
      - application/msword
    x-uigen-max-file-size: 5242880  # 5MB
```

Save the config. The file upload component updates with the new constraints. No code generation, no build step.

This is powerful for rapid iteration. You can experiment with different UI configurations without waiting for builds or deployments.

---

## What About Complex UIs?

You might ask: "What about complex UIs that do not fit the CRUD model?"

UIGen is designed to eliminate boilerplate, not replace all code. For most CRUD applications, UIGen handles the common patterns. For complex application-specific flow, you write code.

### The 90/10 Rule

In a typical CRUD application:
- 90% of interactions are common patterns (form submission, validation, pagination, sorting, filtering)
- 10% of interactions are complex application-specific flow

UIGen handles the 90%. You write the 10%.

This is the right trade-off. The 90% is repetitive boilerplate. The 10% is where your domain logic lives. Let UIGen eliminate the boilerplate so you can focus on what makes your application unique.

### What UIGen Handles Out of the Box

Let's be specific about what UIGen infers and handles automatically:

**Forms:**
- Render form fields from request body schema
- Client-side validation (required, min/max, pattern, format)
- Form submission to API endpoint
- Loading state during submission
- Success/error notifications
- Redirect after successful submission
- File uploads (single and multiple)

**Tables:**
- Render columns from response schema
- Pagination (offset/limit or page/pageSize)
- Sorting by column
- Search/filter
- Row click to detail view
- Loading and empty states

**Detail Views:**
- Render all fields from schema
- Format dates, numbers, booleans
- Handle relationships (foreign keys)
- Edit and delete actions

**Multi-Step Forms:**
- Step navigation from multiple request bodies
- Progress indicator
- Validation per step
- Data persistence across steps

**Authentication:**
- Login form from auth endpoint
- Token storage
- Protected routes
- Logout

For most CRUD applications, this covers everything you need. You do not write boilerplate. UIGen infers it from your spec.

### When You Write Code

### When You Write Code

You write code for complex application-specific flow:

```tsx
import { ListView, DetailView, FormView } from '@uigen/react';
import CustomDashboard from './CustomDashboard';
import ComplexWorkflow from './ComplexWorkflow';

function App({ config }: { config: UIGenApp }) {
  const templatesResource = config.resources.find(r => r.slug === 'templates');
  const listOp = templatesResource?.operations.find(op => op.viewHint === 'list');
  
  return (
    <Router>
      {/* Custom dashboard with charts and metrics */}
      <Route path="/" element={<CustomDashboard />} />
      
      {/* UIGen handles standard CRUD */}
      <Route path="/templates" element={<ListView resource={templatesResource} operation={listOp} />} />
      <Route path="/templates/:id" element={<DetailView resource={templatesResource} />} />
      
      {/* Custom workflow with complex logic */}
      <Route path="/approval-flow" element={<ComplexWorkflow />} />
    </Router>
  );
}
```

The rendered components and custom components coexist. UIGen eliminates boilerplate. You write code for what makes your application unique.

---

## Comparison with Other Approaches

Let's compare UIGen's approach with other UI generation strategies.

### Approach 1: Full Code Generation

**Tools:** Swagger Codegen, OpenAPI Generator, Orval

**Strategy:** Generate React components from OpenAPI spec

**Pros:**
- You get code you can read and modify
- No runtime overhead

**Cons:**
- Regeneration overwrites customizations
- Generated code is hard to maintain
- Divergence from API is common

**UIGen's Advantage:** Runtime. Customizations survive updates. No code to maintain.

### Approach 2: Low-Code Builders

**Tools:** Retool, Appsmith, Budibase

**Strategy:** Visual builder for creating UIs

**Pros:**
- No code required
- Fast prototyping

**Cons:**
- Proprietary platform
- Limited customization
- Vendor lock-in
- Not suitable for customer-facing UIs

**UIGen's Advantage:** Open source. Full React access. No vendor lock-in.

### Approach 3: Admin Panel Generators

**Tools:** React Admin, Refine, AdminJS

**Strategy:** Framework for building admin panels

**Pros:**
- Rich component library
- Flexible and extensible

**Cons:**
- Requires manual configuration for each resource
- No automatic inference from API spec
- Steep learning curve

**UIGen's Advantage:** Automatic inference from OpenAPI spec. Minimal configuration.

### Approach 4: Form Builders

**Tools:** Formik, React Hook Form, Uniforms

**Strategy:** Library for building forms

**Pros:**
- Full control over form logic
- Well-tested and maintained

**Cons:**
- Manual form definition
- No automatic inference from API spec
- Only handles forms, not full CRUD

**UIGen's Advantage:** Automatic form generation from OpenAPI spec. Handles full CRUD, not just forms.

---

## The Philosophy

UIGen's philosophy is simple:

**1. UI primitives are finite. Automate them.**

There are only 40 UI primitives. Map data types to primitives automatically. Let developers override when needed.

**2. Common interactions are finite. Infer them.**

Form submission, validation, pagination, sorting, filtering - these patterns repeat. Infer them from the API spec and handle them automatically.

**3. Complex flow is infinite. Do not abstract it.**

Business logic is unique to each application. Do not try to template it. Let developers write code in the framework they know.

**4. The spec is the source of truth.**

The OpenAPI spec describes the API. Use it to drive the UI. When the spec changes, the UI updates.

**5. Embrace the ecosystem.**

React is popular. Vue is popular. Svelte is popular. Do not reinvent them. Build renderers that use standard patterns.

**6. Declarative over imperative.**

Declare what you want (hide this field, use this widget). Do not specify how to do it (edit this line of code).

**7. Runtime over build-time.**

Interpret configuration at runtime. Do not generate code at build time. This enables instant updates and agent-driven workflows.

---

## Real-World Example

Let's see this in action with a real application: a meeting minutes app.

### The OpenAPI Spec

```yaml
openapi: 3.0.0
info:
  title: Meeting Minutes API
  version: 1.0.0

paths:
  /api/v1/templates:
    get:
      summary: List templates
      parameters:
        - name: skip
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Template'
    
    post:
      summary: Create template
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                name:
                  type: string
                  minLength: 3
                description:
                  type: string
                file:
                  type: string
                  format: binary
      responses:
        '201':
          description: Created

components:
  schemas:
    Template:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        description:
          type: string
        createdAt:
          type: string
          format: date-time
```

### What UIGen Produces

From this spec, UIGen produces an IR. The React renderer interprets the IR and creates:

**1. List View**
- Table with columns: ID, Name, Description, Created At
- Pagination controls (skip/limit from query params)
- Click row to view details

**2. Create Form**
- Text input for name (with minLength validation)
- Text area for description
- File upload for file
- Submit button

**3. Detail View**
- Display all fields in a card layout
- Edit and delete buttons

**4. Routing**
- `/templates` → List view
- `/templates/new` → Create form
- `/templates/:id` → Detail view

All of this is rendered at runtime. No code generation, no configuration.

### Customizing the UI

Now let's customize it:

```yaml
# .uigen/config.yaml
annotations:
  # Format datetime display
  Template.createdAt:
    x-uigen-datetime:
      format: "YYYY-MM-DD HH:mm"
      timezone: "America/New_York"
  
  # Add custom labels
  POST:/api/v1/templates:
    x-uigen-label: "Upload New Template"
  
  # Configure file upload
  Body_upload_template_api_v1_templates_post.file:
    x-uigen-file-types:
      - application/vnd.openxmlformats-officedocument.wordprocessingml.document
    x-uigen-max-file-size: 10485760  # 10MB
```

Save the config. The UI updates:
- Created At shows formatted time with timezone
- Create button shows "Upload New Template"
- File upload only accepts Word documents up to 10MB

No code changes. Just config.

### Adding Custom Logic

Now let's add custom validation using the override system:

```tsx
// src/overrides/template-create.tsx
import { OverrideDefinition, FormView } from '@uigen/react';

export const override: OverrideDefinition = {
  mode: 'hooks',
  hooks: {
    onBeforeSubmit: (data) => {
      // Custom validation: name must not contain "test"
      if (data.name.toLowerCase().includes('test')) {
        throw new Error('Template name cannot contain "test"');
      }
      
      // Custom logic: add timestamp to description
      data.description = `${data.description}\n\nCreated at ${new Date().toISOString()}`;
      
      return data;
    },
    onSuccess: (response) => {
      // Custom side effect: log to analytics
      analytics.track('Template Created', {
        templateId: response.id,
        templateName: response.name
      });
    }
  }
};
```

Add the x-uigen-id to your spec:

```yaml
paths:
  /api/v1/templates:
    post:
      x-uigen-id: template-create
      summary: Create template
```

The override system automatically applies your custom hooks. It is just React. Use hooks, context, state management, whatever you need.

---

## The Future

UIGen's architecture is designed for the future:

**1. AI-First Customization**

AI agents can modify the spec and config to customize the UI. No code editing required.

**2. Multi-Framework Support**

The IR is framework-agnostic. We can build renderers for Vue, Svelte, React Native, Flutter. The same spec drives UIs for all platforms.

**3. Advanced Inference**

As AI models improve, we can infer more from the spec:
- Detect relationships without explicit annotations
- Infer view types from endpoint names
- Suggest optimal widgets based on field names
- Generate validation rules from field descriptions

**4. Real-Time Collaboration**

Multiple developers (or agents) can modify the spec and config simultaneously. The UI updates in real-time for all users.

**5. Visual Config Editor**

A visual editor for the config file. Drag and drop to reorder fields, click to change widgets, no YAML editing required.

---

## Conclusion

UI primitives are finite. Common interactions are also finite. This is not a limitation. It is an opportunity.

If we accept that UI primitives and common interactions are finite, we can build runtimes that automatically handle the boilerplate. Form submissions, validation, pagination, sorting, filtering - all inferred from your API spec.

But complex application-specific flow is infinite. We cannot template away business logic. We need real code, real frameworks, real patterns.

UIGen embraces both truths:
- **Finite primitives and common interactions:** Runtime that eliminates boilerplate
- **Infinite complex flow:** Full framework access for custom logic

The result is a system that is:
- **Fast:** Render UIs in seconds, not days
- **Flexible:** Customize with config or code
- **Maintainable:** Spec is source of truth, no generated code to maintain
- **Future-proof:** AI agents can modify specs, not code
- **Multi-platform:** Same spec works with React, Vue, Svelte, mobile frameworks

This is especially powerful in the age of AI agents. Agents can modify the spec and config to customize the UI without understanding React or the renderer.

The OpenAPI spec is the source of truth. Even in non-API-heavy apps, the spec documents your API and enables tooling. Custom functionality is referenced in the config, keeping everything in one place.

It is easy to modify the UI on the fly. Change the config, the UI updates. No build step, no deployment. Instant feedback.

UIGen does not try to handle every interaction. It handles the 90% that is common boilerplate. You write the 10% that is unique to your domain. This is the right trade-off.

UI primitives are finite. Common interactions are finite. UIGen embraces these truths and eliminates boilerplate for API-driven applications.

---

## Try It Yourself

See it in action:

```bash
# Install UIGen
npm install -g @uigen-dev/cli

# Start UIGen with your OpenAPI spec
uigen serve openapi.yaml

# Open http://localhost:4400
# You have a full CRUD application

# Customize it
echo "annotations:
  User.email:
    x-uigen-label: 'Email Address'" > .uigen/config.yaml

# The UI updates instantly
```

The code is open source. Read it, learn from it, contribute to it:

```bash
git clone https://github.com/darula-hpp/uigen.git
cd uigen/packages/react/src
# Read the React renderer code
```

---

## Further Reading

- [Why UIGen Doesn't Generate Code](/blog/runtime-rendering-vs-code-generation) - Deep dive into runtime rendering
- [UIGen Architecture](/blog/uigen-architecture) - Complete technical architecture
- [Config Reconciliation System](/blog/config-reconciliation-system) - How customizations work
- [Building a Meeting Minutes App](/blog/building-meeting-minutes-app) - Real-world example
