---
title: "Customizing Your UIGen Theme: Brand Your Generated UI"
author: "Olebogeng Mbedzi"
date: "2026-04-19"
excerpt: "Learn how to customize the appearance of your UIGen-generated frontend with the new Theme Editor. Apply your brand colors, adjust spacing, and create a polished UI without touching React code."
tags: ["features", "theming", "customization", "css", "developer-experience"]
---

## Introduction

UIGen generates fully functional frontends from OpenAPI specs with sensible defaults. The generated UI uses a clean, modern design system built on Tailwind CSS with carefully chosen colors, spacing, and typography.

But every product has its own brand identity. Your company colors are not UIGen's default blue. Your design system uses different spacing. Your forms need custom styling to match your existing applications.

Until now, customizing the appearance meant forking the React package or writing complex CSS overrides. The new Theme Editor changes that. It provides a visual interface for writing custom CSS that is automatically applied to your generated UI. Your theme lives in a separate file that is version controlled alongside your config, making it easy to maintain and share across your team.

This post walks through how the Theme Editor works, the two-file architecture that keeps base styles separate from your customizations, and practical examples of common theming scenarios.

---

## The Problem: Styling Generated UIs

Generated UIs face a unique styling challenge. The code is not written by hand, so you cannot just edit component files to change colors or spacing. The generator owns the markup, and regenerating the UI would overwrite your changes.

Traditional approaches have significant drawbacks:

**Forking the generator.** You copy the React package, modify the styles, and maintain your fork. This works until the upstream generator adds features you want. Merging becomes painful.

**CSS overrides.** You write custom CSS with high specificity to override default styles. This is fragile. Class names might change. Specificity wars escalate. Dark mode breaks.

**Theming APIs.** The generator exposes theme variables you can customize. This works well but requires the generator to anticipate every customization point. Unanticipated needs require code changes.

**Preprocessing.** You run a build step that modifies the generated code before serving it. This adds complexity and makes debugging harder.

UIGen takes a different approach: provide a Theme Editor where you write standard CSS that is automatically injected into the generated UI. Your theme file is separate from the base styles, making it easy to understand what you have customized and what is default behavior.

---

## How It Works

The Theme Editor is part of the config GUI. When you run `uigen config`, you get access to four tabs: Annotations, Visual Editor, Preview, and Theme.

```bash
uigen config openapi.yaml
```

The Theme tab provides:

1. A read-only reference section showing the base styles
2. An editable theme section where you write your customizations
3. Syntax highlighting for CSS
4. Auto-save with debouncing (saves 500ms after you stop typing)
5. Status indicators showing save state

When you save changes, they are written to `.uigen/theme.css` in your project directory. The next time you run `uigen serve`, the theme is automatically loaded and injected into the generated UI. The base styles are always included, and your theme is applied on top, allowing you to override any default styling.

---

## Two-File Architecture

The theming system uses a two-file architecture that keeps base styles separate from your customizations:

### Base Styles (Read-Only Reference)

When you first run `uigen config`, a file called `.uigen/base-styles.css` is created. This is a read-only reference copy of UIGen's default styles. It includes:

- Tailwind CSS imports and configuration
- CSS custom properties for colors (light and dark mode)
- Base layer styles for typography and code blocks
- Utility classes for background, text, and border colors

The base styles are displayed in the Theme Editor as a collapsible, read-only section with a gray background. You can expand it to see what styles are available, but you cannot edit it. This file is for reference only and is not injected into the UI (the base styles are already included in the React SPA).

### Theme Overrides (Editable)

Your customizations live in `.uigen/theme.css`. This file starts empty with a helpful comment template:

```css
/* UIGen Custom Theme
 * 
 * Add your custom CSS overrides here.
 * These styles will be applied after the base styles, allowing you to override defaults.
 * 
 * Example:
 * .btn-primary {
 *   background-color: #your-brand-color;
 * }
 */
```

This is where you write your CSS. The theme file is injected into the generated UI via a `<style>` tag in the HTML head, so your styles have higher specificity than the base styles.

### Why Two Files?

This architecture provides several benefits:

**Clarity.** You can see exactly what you have customized. The theme file contains only your changes, not thousands of lines of default styles.

**Maintainability.** When UIGen updates its base styles, your theme file is unaffected. You only need to review changes if you were overriding something that changed.

**Portability.** You can copy your theme file to another project and get the same appearance. The base styles are always the same across projects.

**Version control.** Your theme file is small and focused, making diffs meaningful. You can see exactly what styling changed in each commit.

**Collaboration.** Team members can review theme changes without wading through base styles. The theme file is self-documenting.

---

## Theme Editor Interface

The Theme Editor provides a clean, focused interface for writing CSS:

### Base Styles Section (Collapsible)

At the top of the editor, you will see a collapsible section labeled "Base Styles (Reference Only)". Click to expand and view the default styles. The text is displayed in plain gray without syntax highlighting to emphasize that it is read-only.

This section is useful when you need to:
- See what CSS custom properties are available
- Understand the default color scheme
- Check which utility classes exist
- Reference the base typography styles

### Theme Section (Editable)

Below the base styles, you will see the "Your Custom Theme" section. This is a full-featured code editor with:

**Syntax highlighting.** CSS syntax is highlighted using Prism.js with a custom dark mode theme. Selectors are amber, properties are blue, values are green, numbers are purple, and comments are gray.

**Line numbers.** Each line is numbered for easy reference.

**Auto-save.** Changes are automatically saved 500ms after you stop typing. No need to click a save button.

**Status indicator.** A small badge shows the current state:
- "Saved" (green) when changes are persisted
- "Saving..." (yellow) when a save is in progress
- "Error" (red) if the save failed

**Keyboard shortcuts.** Standard code editor shortcuts work: Tab for indentation, Ctrl+/ for comments, Ctrl+Z for undo.

### Dark Mode Support

The Theme Editor adapts to your system's dark mode preference. In dark mode:
- The editor background is dark gray
- Syntax highlighting uses carefully chosen colors with good contrast
- The base styles section uses a slightly lighter gray to differentiate it
- Status indicators use dark mode colors

The syntax highlighting in dark mode is designed to be easy on the eyes during long editing sessions. No harsh whites or overly bright colors.

---

## CSS Custom Properties

UIGen's base styles define CSS custom properties for all theme colors. You can override these properties in your theme file to change the entire color scheme:

### Light Mode Colors

```css
:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --card: #ffffff;
  --card-foreground: #0a0a0a;
  --primary: #0a0a0a;
  --primary-foreground: #fafafa;
  --secondary: #f5f5f5;
  --secondary-foreground: #1a1a1a;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --accent: #f5f5f5;
  --accent-foreground: #1a1a1a;
  --destructive: #ef4444;
  --destructive-foreground: #fafafa;
  --border: #e5e5e5;
  --input: #e5e5e5;
  --ring: #0a0a0a;
}
```

### Dark Mode Colors

```css
.dark {
  --background: #0a0a0a;
  --foreground: #e5e5e5;
  --card: #171717;
  --card-foreground: #e5e5e5;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --secondary: #262626;
  --secondary-foreground: #e5e5e5;
  --muted: #262626;
  --muted-foreground: #a3a3a3;
  --accent: #2d2d2d;
  --accent-foreground: #e5e5e5;
  --destructive: #dc2626;
  --destructive-foreground: #fafafa;
  --border: #525252;
  --input: #525252;
  --ring: #d4d4d4;
}
```

To customize the color scheme, override these properties in your theme file. The changes will apply to all components that use these colors.

---

## Common Theming Scenarios

Here are practical examples of common customizations:

### Brand Colors

Replace UIGen's default colors with your brand palette:

```css
/* Apply brand colors */
:root {
  --primary: #6366f1; /* Indigo */
  --primary-foreground: #ffffff;
  --accent: #8b5cf6; /* Purple */
  --accent-foreground: #ffffff;
}

.dark {
  --primary: #818cf8; /* Lighter indigo for dark mode */
  --accent: #a78bfa; /* Lighter purple for dark mode */
}
```

### Button Styling

Customize button appearance:

```css
/* Rounded buttons with shadow */
button {
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

button:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* Primary button with gradient */
.bg-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}
```

### Form Styling

Adjust form inputs and labels:

```css
/* Larger, more prominent inputs */
input, select, textarea {
  font-size: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid var(--border);
}

input:focus, select:focus, textarea:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Bold labels */
label {
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.5rem;
}
```

### Table Styling

Customize data tables:

```css
/* Striped table rows */
table tbody tr:nth-child(even) {
  background-color: var(--muted);
}

/* Hover effect on rows */
table tbody tr:hover {
  background-color: var(--accent);
  cursor: pointer;
}

/* Sticky table header */
table thead {
  position: sticky;
  top: 0;
  background-color: var(--card);
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

### Card Styling

Enhance card components:

```css
/* Cards with border and shadow */
.bg-card {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.dark .bg-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

### Typography

Adjust font sizes and weights:

```css
/* Larger headings */
h1 { font-size: 2.5rem; font-weight: 800; }
h2 { font-size: 2rem; font-weight: 700; }
h3 { font-size: 1.5rem; font-weight: 600; }

/* Custom font family */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Tighter line height for headings */
h1, h2, h3, h4, h5, h6 {
  line-height: 1.2;
}
```

### Spacing

Adjust padding and margins:

```css
/* More spacious layout */
.p-6 { padding: 2rem; }
.p-4 { padding: 1.5rem; }
.gap-4 { gap: 1.5rem; }

/* Tighter layout */
.p-6 { padding: 1rem; }
.p-4 { padding: 0.75rem; }
.gap-4 { gap: 0.75rem; }
```

### Dark Mode Customization

Provide different styles for dark mode:

```css
/* Softer dark mode background */
.dark {
  --background: #1a1a1a;
  --card: #262626;
}

/* Warmer dark mode text */
.dark {
  --foreground: #f5f5f5;
  --muted-foreground: #d4d4d4;
}
```

---

## Advanced Techniques

### Scoped Overrides

Target specific components without affecting others:

```css
/* Style only the login form */
[data-view="login"] input {
  border-radius: 2rem;
  padding: 1rem 1.5rem;
}

/* Style only the user table */
[data-resource="User"] table {
  font-size: 0.875rem;
}
```

### Responsive Design

Add responsive overrides:

```css
/* Mobile-first adjustments */
@media (max-width: 640px) {
  h1 { font-size: 1.75rem; }
  .p-6 { padding: 1rem; }
  
  /* Stack form fields on mobile */
  form > div {
    flex-direction: column;
  }
}

/* Desktop enhancements */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
  }
}
```

### Animations

Add subtle animations:

```css
/* Fade in on page load */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

main {
  animation: fadeIn 0.3s ease-out;
}

/* Loading spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading {
  animation: spin 1s linear infinite;
}
```

### CSS Grid Layouts

Override the default layout:

```css
/* Two-column form layout */
form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

/* Full-width fields */
form .full-width {
  grid-column: 1 / -1;
}
```

---

## Best Practices

### Use CSS Custom Properties

Instead of hardcoding colors, override the custom properties. This ensures your theme works in both light and dark mode:

```css
/* Good: Uses custom properties */
:root {
  --primary: #6366f1;
}

/* Avoid: Hardcoded colors */
button {
  background-color: #6366f1;
}
```

### Maintain Specificity

Keep your selectors simple to avoid specificity wars:

```css
/* Good: Simple selector */
button {
  border-radius: 0.5rem;
}

/* Avoid: Overly specific */
body div.container main form button.primary {
  border-radius: 0.5rem;
}
```

### Test Both Modes

Always test your theme in both light and dark mode. Some colors that look great in light mode may have poor contrast in dark mode:

```css
/* Ensure good contrast in both modes */
:root {
  --link-color: #2563eb; /* Blue with good contrast on white */
}

.dark {
  --link-color: #60a5fa; /* Lighter blue with good contrast on dark */
}
```

### Comment Your Code

Add comments explaining why you made certain choices:

```css
/* Increase button padding to match our design system */
button {
  padding: 0.75rem 1.5rem;
}

/* Use brand purple for accent color */
:root {
  --accent: #8b5cf6;
}
```

### Version Control

Commit your theme file to version control so your team shares the same styling:

```bash
git add .uigen/theme.css
git commit -m "Add custom theme with brand colors"
```

### Incremental Changes

Make small, incremental changes and test after each one. This makes it easier to identify what broke if something goes wrong.

---

## Integration with Serve Command

When you run `uigen serve`, the CLI automatically loads your theme file and injects it into the generated UI:

```bash
uigen serve openapi.yaml
```

The serve command:

1. Checks for `.uigen/theme.css` in your project directory
2. Reads the file content if it exists
3. Injects it into the HTML via `window.__UIGEN_CSS__`
4. The React SPA applies the CSS by creating a `<style>` tag in the document head

If the theme file does not exist, the UI uses only the base styles. This is the default behavior, so existing projects are unaffected.

### Hot Reload

When you edit your theme file while the serve command is running, the changes are not automatically reloaded. You need to refresh the browser to see updates.

For a better development experience, use the config GUI's live preview. Changes in the Theme Editor are immediately visible in the Preview tab without needing to restart the serve command.

---

## Troubleshooting

### Theme Not Applied

If your theme is not appearing in the UI:

1. Check that `.uigen/theme.css` exists in your project directory
2. Verify the file is not empty
3. Restart the serve command (it only loads the theme on startup)
4. Check the browser console for CSS syntax errors

### Styles Not Overriding

If your styles are not overriding the base styles:

1. Increase specificity by adding a class or ID
2. Use `!important` as a last resort
3. Check that you are targeting the correct element (use browser DevTools)
4. Ensure your CSS is valid (check for syntax errors)

### Dark Mode Issues

If your theme looks wrong in dark mode:

1. Add dark mode overrides using the `.dark` class
2. Test your theme in both modes
3. Use CSS custom properties instead of hardcoded colors
4. Check contrast ratios for accessibility

### Performance Issues

If the UI feels slow after adding custom CSS:

1. Avoid expensive selectors like `*` or deep nesting
2. Minimize the use of animations on large elements
3. Use `will-change` sparingly
4. Profile with browser DevTools to identify bottlenecks

---

## Accessibility Considerations

When customizing your theme, maintain accessibility:

### Color Contrast

Ensure text has sufficient contrast against backgrounds. WCAG AA requires:
- 4.5:1 for normal text
- 3:1 for large text (18pt or 14pt bold)

```css
/* Good: High contrast */
:root {
  --foreground: #0a0a0a; /* Black on white = 19:1 */
}

/* Avoid: Low contrast */
:root {
  --foreground: #cccccc; /* Light gray on white = 1.6:1 */
}
```

### Focus Indicators

Maintain visible focus indicators for keyboard navigation:

```css
/* Ensure focus is visible */
button:focus, input:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Avoid removing focus styles */
button:focus {
  outline: none; /* Bad for accessibility */
}
```

### Font Sizes

Use relative units for font sizes to respect user preferences:

```css
/* Good: Relative units */
body {
  font-size: 1rem; /* Respects user's browser settings */
}

/* Avoid: Fixed pixels */
body {
  font-size: 16px; /* Ignores user preferences */
}
```

---

## Examples from Real Projects

### SaaS Dashboard

A clean, professional theme for a SaaS product:

```css
/* Brand colors */
:root {
  --primary: #2563eb;
  --accent: #7c3aed;
}

/* Rounded corners everywhere */
* {
  border-radius: 0.5rem;
}

/* Subtle shadows */
.bg-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Prominent CTAs */
button.bg-primary {
  font-weight: 600;
  padding: 0.75rem 2rem;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
}
```

### E-commerce Admin

A data-dense theme for an e-commerce admin panel:

```css
/* Compact spacing */
.p-6 { padding: 1rem; }
.gap-4 { gap: 0.75rem; }

/* Smaller fonts for tables */
table {
  font-size: 0.875rem;
}

/* Highlight important data */
.text-primary {
  font-weight: 600;
  color: #059669; /* Green for revenue */
}

/* Striped tables */
table tbody tr:nth-child(even) {
  background-color: #f9fafb;
}
```

### Mobile-First App

A theme optimized for mobile devices:

```css
/* Larger touch targets */
button, input, select {
  min-height: 44px;
  font-size: 1rem;
}

/* Full-width buttons on mobile */
@media (max-width: 640px) {
  button {
    width: 100%;
  }
}

/* Sticky navigation */
nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: var(--background);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

---

## Roadmap

The Theme Editor is actively being developed. Upcoming features include:

**Theme templates.** Pre-built themes you can apply with one click: Material Design, Bootstrap, Tailwind, Minimal, Corporate.

**Color picker.** Visual color picker for CSS custom properties. No need to remember hex codes.

**Live preview.** See your theme changes in real-time without refreshing the browser.

**CSS validation.** Inline error messages for invalid CSS syntax.

**Theme export/import.** Share themes across projects or with your team.

**Dark mode toggle.** Preview your theme in both light and dark mode within the editor.

**Responsive preview.** See how your theme looks on mobile, tablet, and desktop.

---

## Conclusion

The Theme Editor makes it easy to customize the appearance of your UIGen-generated frontend. The two-file architecture keeps base styles separate from your customizations, making your theme file small, focused, and easy to maintain.

Whether you are applying brand colors, adjusting spacing, or creating a completely custom design, the Theme Editor provides a clean interface for writing CSS that is automatically applied to your UI.

The system is designed to be simple: write standard CSS, save it, and see the results. No build steps, no complex configuration, no forking the generator. Your theme file is version controlled alongside your config, making it easy to share across your team.

If you are using UIGen, try the Theme Editor on your next project. If you are evaluating UIGen, the theming system is a key differentiator: it lets you customize appearance without touching React code or maintaining a fork.

```bash
# Try it now
uigen config openapi.yaml
# Click the "Theme" tab
# Write your CSS
# Run serve to see the result
uigen serve openapi.yaml
```

The Theme Editor is open source and lives in the `packages/config-gui` directory of the UIGen monorepo. Contributions are welcome. If you have ideas for new features or improvements, open an issue or submit a PR on GitHub.
