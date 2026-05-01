---
title: "How to Style UIGen Applications"
author: "Olebogeng Mbedzi"
date: "2026-05-01"
excerpt: "A practical guide to styling UIGen applications using AI agents or manual CSS. Learn where styles are stored, how they're injected, and how to customize your app's appearance."
tags: ["styling", "customization", "theming", "css", "how-to"]
---

## Introduction

UIGen applications can be styled by writing custom CSS that extends the base theme. Your custom styles live in `.uigen/theme.css` and are injected into the React SPA at runtime.

You can generate these styles using AI agents (by describing what you want in natural language) or write them manually. Both approaches use the same underlying system.

This guide covers:

- Where styles are stored and how they're injected
- How to use AI to generate styles
- How to write styles manually
- How to access styles in the config GUI
- Common styling patterns and examples

---

## How UIGen Styling Works

UIGen uses a three-layer styling system:

**Layer 1: Base Styles**

The React SPA includes base styles with Tailwind CSS v4 and CSS variables. These are bundled into the application at build time.

Location: `packages/react/src/index.css`

```css
:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --primary: #0a0a0a;
  --primary-foreground: #fafafa;
  /* ... more variables */
}

.dark {
  --background: #0a0a0a;
  --foreground: #e5e5e5;
  /* ... dark mode variants */
}
```

**Layer 2: Custom Theme**

Your custom styles live in `.uigen/theme.css` in your project directory. This is where you write CSS to customize the appearance.

Location: `.uigen/theme.css`

```css
/* Your custom styles */
:root {
  --primary: #ff6b6b;
  --primary-foreground: #ffffff;
}

button {
  border-radius: 0.75rem;
  font-weight: 600;
}
```

**Layer 3: Runtime Injection**

The CLI reads `.uigen/theme.css` and injects it into the React SPA via `window.__UIGEN_CSS__`. The SPA applies these styles at startup.

```typescript
// packages/react/src/main.tsx
const customCSS = window.__UIGEN_CSS__;
if (customCSS) {
  const styleElement = document.createElement('style');
  styleElement.id = 'uigen-custom-css';
  styleElement.textContent = customCSS;
  document.head.appendChild(styleElement);
}
```

This means:
- No build step required for style changes
- Refresh the page to see updates
- Styles are version-controlled in your project
- Same CSS works across all UIGen apps

---

## Method 1: Using AI to Generate Styles

If you have AI agents available (like Kiro, Cursor, or GitHub Copilot), you can describe what you want and let AI generate the CSS.

### Step 1: Install the Styling Skill (Optional)

The styling skill teaches AI agents about UIGen's styling system. Install it in your project:

```bash
mkdir -p .kiro/skills
cp /path/to/uigen/SKILLS/applying-styles-to-react-spa.md .kiro/skills/
```

### Step 2: Describe What You Want

Tell the AI agent what styling you want:

```
"Style this app with a modern blue theme, rounded buttons with shadows,
alternating table rows, and dark mode support"
```

or

```
"Apply Material Design styling"
```

or

```
"Use our brand colors: primary #00A651, secondary #003B5C"
```

### Step 3: AI Generates CSS

The AI agent writes CSS to `.uigen/theme.css`:

```css
/* Modern blue theme */
:root {
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --radius: 0.5rem;
}

.dark {
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
}

button {
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

tbody tr:nth-child(even) {
  background-color: var(--muted);
}
```

### Step 4: See the Result

```bash
uigen serve openapi.yaml
```

Open `http://localhost:4400` to see your styled application.

### Step 5: Iterate

Want changes? Tell the AI:

```
"Make the buttons more rounded"
"Use a darker blue"
"Add hover effects to cards"
```

---

## Method 2: Writing Styles Manually

You can also write CSS manually in `.uigen/theme.css`.

### Available CSS Variables

Override these variables to customize colors:

```css
:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
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
  --radius: 0.5rem;
}
```

### Component Selectors

Target specific components:

```css
/* Buttons */
button { }
button.bg-primary { }
button.bg-secondary { }

/* Forms */
input, select, textarea { }
label { }

/* Tables */
table { }
thead th { }
tbody tr { }
tbody td { }

/* Cards */
.bg-card { }

/* Navigation */
nav { }
nav a { }
nav a.active { }
```

### Example: Custom Brand Colors

```css
:root {
  --primary: #00A651;
  --primary-foreground: #ffffff;
  --secondary: #003B5C;
  --secondary-foreground: #ffffff;
}

.dark {
  --primary: #00C766;
  --primary-foreground: #000000;
  --secondary: #004A73;
  --secondary-foreground: #ffffff;
}
```

---

## Accessing Styles in the Config GUI

The config GUI also provides access to your theme CSS. You can view and edit `.uigen/theme.css` directly in the GUI.

**To access:**

1. Run `uigen config openapi.yaml`
2. Open the config GUI in your browser
3. Navigate to the "Styles" or "Theme" tab
4. View or edit `.uigen/theme.css`

Changes made in the GUI are saved to `.uigen/theme.css` and applied when you run `uigen serve`.

---

## Common Styling Patterns

### Pattern 1: Corporate Branding

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

:root {
  --primary: #00A651;
  --primary-foreground: #ffffff;
  --secondary: #003B5C;
  --secondary-foreground: #ffffff;
  --radius: 0.25rem;
}

* {
  font-family: 'Roboto', sans-serif;
}

button {
  border-radius: 0.25rem;
  font-weight: 500;
  text-transform: uppercase;
}
```

### Pattern 2: Modern SaaS

```css
:root {
  --primary: #8b5cf6;
  --primary-foreground: #ffffff;
  --radius: 0.75rem;
}

button.bg-primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);
}

.bg-card {
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.bg-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}
```

### Pattern 3: Minimalist

```css
:root {
  --primary: #000000;
  --primary-foreground: #ffffff;
  --radius: 0;
}

button {
  border-radius: 0;
  border: 2px solid var(--foreground);
  background-color: transparent;
  font-weight: 600;
}

button:hover {
  background-color: var(--foreground);
  color: var(--background);
}

.bg-card {
  border-radius: 0;
  border: 1px solid var(--border);
  box-shadow: none;
}
```

---

## Dark Mode Support

Always define dark mode variants for your custom colors:

```css
:root {
  --custom-color: #3b82f6;
}

.dark {
  --custom-color: #60a5fa;
}
```

The React SPA automatically applies the `.dark` class when dark mode is enabled.

---

## Responsive Design

Use media queries for responsive styling:

```css
/* Mobile (default) */
.container {
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
  }
}
```

---

## Best Practices

**1. Use CSS Variables**

Use theme variables instead of hardcoded colors:

```css
/* Good */
button {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

/* Avoid */
button {
  background-color: #3b82f6;
  color: white;
}
```

**2. Support Dark Mode**

Always define dark mode variants:

```css
:root {
  --custom-color: #3b82f6;
}

.dark {
  --custom-color: #60a5fa;
}
```

**3. Keep Specificity Low**

Use simple selectors:

```css
/* Good */
button {
  padding: 0.5rem 1rem;
}

/* Avoid */
div.container > div.row > button.primary {
  padding: 0.5rem 1rem;
}
```

**4. Add Transitions**

Make interactions smooth:

```css
button, input, select, a {
  transition: all 0.2s ease;
}
```

**5. Ensure Accessibility**

Maintain sufficient contrast and visible focus states:

```css
:root {
  --primary: #0066cc; /* 4.5:1 contrast ratio */
}

button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

---

## Troubleshooting

### Styles Not Applying

**Check file location:**
```bash
ls -la .uigen/theme.css
```

**Verify CLI command:**
```bash
uigen serve openapi.yaml
```

**Check browser console:**
Open DevTools and look for "UIGen custom CSS injected"

**Inspect element:**
Right-click → Inspect → Styles tab → Look for `#uigen-custom-css`

### Specificity Issues

If your styles aren't applying, increase specificity:

```css
/* Low specificity */
button { background: red; }

/* Higher specificity */
button.bg-primary { background: red; }
```

### Dark Mode Not Working

Ensure you defined dark mode variants:

```css
:root {
  --custom-color: #3b82f6;
}

.dark {
  --custom-color: #60a5fa; /* Don't forget this */
}
```

---

## Complete Example

Here's a complete example for a corporate-branded application:

```css
/* Corporate Brand Theme */

@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

:root {
  --primary: #00A651;
  --primary-foreground: #ffffff;
  --secondary: #003B5C;
  --secondary-foreground: #ffffff;
  --accent: #00A651;
  --accent-foreground: #ffffff;
  --radius: 0.25rem;
}

.dark {
  --primary: #00C766;
  --primary-foreground: #000000;
  --secondary: #004A73;
  --secondary-foreground: #ffffff;
  --accent: #00C766;
  --accent-foreground: #000000;
}

* {
  font-family: 'Roboto', sans-serif;
}

button {
  border-radius: 0.25rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

button:hover {
  opacity: 0.9;
}

.bg-card {
  border-radius: 0.25rem;
  border: 1px solid var(--border);
}

table {
  border-collapse: collapse;
}

thead {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
}

thead th {
  padding: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

tbody tr:hover {
  background-color: var(--accent);
}
```

---

## Conclusion

UIGen applications are styled by writing CSS in `.uigen/theme.css`. You can generate this CSS using AI agents or write it manually. Both approaches use the same system.

Key points:

- Styles live in `.uigen/theme.css`
- CSS is injected at runtime via `window.__UIGEN_CSS__`
- Override CSS variables to customize colors
- Target component selectors to style specific elements
- Access styles in the config GUI for visual editing
- Always support dark mode
- Use responsive design patterns

---

## Further Reading

- [Customizing Your Theme](/blog/customizing-your-theme) - Advanced theming techniques
- [UIGen Architecture](/blog/uigen-architecture) - How UIGen works
- [Building a Meeting Minutes App](/blog/building-meeting-minutes-app) - Real-world example

### How It Works

```
User Project
└── .uigen/
    └── theme.css  ← AI agents write CSS here
                   ↓
                   CLI injects at runtime
                   ↓
    Generated React SPA loads and applies the CSS
```

The styling system has three layers:

**Layer 1: Base Styles (Bundled)**

The React SPA includes base styles with Tailwind CSS v4 and a comprehensive CSS variable system. These styles are bundled into the application and cannot be modified at runtime.

```css
/* packages/react/src/index.css */
:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --primary: #0a0a0a;
  --primary-foreground: #fafafa;
  --secondary: #f5f5f5;
  --secondary-foreground: #1a1a1a;
  /* ... more variables */
}

.dark {
  --background: #0a0a0a;
  --foreground: #e5e5e5;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  /* ... dark mode variants */
}
```

**Layer 2: Custom Theme (Runtime Injection)**

Your custom styles live in `.uigen/theme.css`. The CLI reads this file and injects it into the application via `window.__UIGEN_CSS__`.

```css
/* .uigen/theme.css */
:root {
  --primary: #ff6b6b;
  --primary-foreground: #ffffff;
}

button {
  border-radius: 0.75rem;
  font-weight: 600;
}
```

**Layer 3: Injection Mechanism**

The React SPA checks for custom CSS at startup and injects it into the DOM:

```typescript
// packages/react/src/main.tsx
const customCSS = window.__UIGEN_CSS__;
if (customCSS) {
  const styleElement = document.createElement('style');
  styleElement.id = 'uigen-custom-css';
  styleElement.textContent = customCSS;
  document.head.appendChild(styleElement);
}
```



```css
/* Corporate brand theme */

@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

:root {
  --primary: #00A651;
  --primary-foreground: #ffffff;
  --secondary: #003B5C;
  --secondary-foreground: #ffffff;
  --accent: #00A651;
  --accent-foreground: #ffffff;
  --radius: 0.25rem;
}

.dark {
  --primary: #00C766;
  --primary-foreground: #000000;
  --secondary: #004A73;
  --secondary-foreground: #ffffff;
  --accent: #00C766;
  --accent-foreground: #000000;
}

* {
  font-family: 'Roboto', sans-serif;
}

button {
  border-radius: 0.25rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

button:hover {
  opacity: 0.9;
}

.bg-card {
  border-radius: 0.25rem;
  border: 1px solid var(--border);
}

table {
  border-collapse: collapse;
}

thead {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
}

thead th {
  padding: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```



```css
/* Modern SaaS theme */

:root {
  --primary: #8b5cf6;
  --primary-foreground: #ffffff;
  --secondary: #6366f1;
  --secondary-foreground: #ffffff;
  --accent: #a78bfa;
  --accent-foreground: #ffffff;
  --radius: 0.75rem;
}

.dark {
  --primary: #a78bfa;
  --primary-foreground: #000000;
  --secondary: #818cf8;
  --secondary-foreground: #000000;
  --accent: #c4b5fd;
  --accent-foreground: #000000;
}

/* Gradient buttons */
button.bg-primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);
}

button.bg-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4);
}

/* Cards with shadows and hover effects */
.bg-card {
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
}

.bg-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

/* Smooth animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bg-card {
  animation: fadeIn 0.3s ease-out;
}

/* Form inputs */
input,
select,
textarea {
  border-radius: 0.5rem;
  border: 2px solid var(--border);
  padding: 0.75rem 1rem;
  transition: all 0.2s ease;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}
```



```css
/* E-commerce theme */

:root {
  --primary: #ff6b6b;
  --primary-foreground: #ffffff;
  --secondary: #4ecdc4;
  --secondary-foreground: #ffffff;
  --accent: #ffe66d;
  --accent-foreground: #000000;
  --radius: 0.5rem;
}

.dark {
  --primary: #ff7675;
  --primary-foreground: #000000;
  --secondary: #55efc4;
  --secondary-foreground: #000000;
  --accent: #ffeaa7;
  --accent-foreground: #000000;
}

/* Prominent buttons */
button {
  border-radius: 0.5rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

button.bg-primary {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
}

/* Product cards with hover effects */
.bg-card {
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
}

.bg-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

/* Price tags */
.text-primary {
  font-weight: 700;
  font-size: 1.25rem;
}

/* Add to cart buttons */
button.bg-secondary {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a3a0 100%);
}

/* Tables (order lists) */
table {
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 0.5rem;
  overflow: hidden;
}

thead {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
}

thead th {
  padding: 1rem;
  font-weight: 600;
}

tbody tr:hover {
  background-color: var(--accent);
}
```


