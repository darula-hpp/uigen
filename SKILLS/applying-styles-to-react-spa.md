# Skill: Applying Styles to UIGen Generated React SPA

## Overview
This skill guides AI agents through generating custom CSS styles for the UIGen-generated React SPA. The goal is to **eliminate the need for users to manually configure styles** in the config-gui by having AI agents generate production-ready CSS that works with the generated application.

## Critical Understanding

### The Two SPAs
1. **Config GUI** (`packages/config-gui`) - Tool for configuring annotations and styles
2. **React SPA** (`packages/react`) - The actual generated application that users deploy

**This skill is about styling the React SPA (#2), not the config-gui itself.**

### How Styling Works

```
User Project
└── .uigen/
    └── theme.css  ← AI agents write CSS here
                   ↓
                   CLI injects at runtime
                   ↓
    Generated React SPA loads and applies the CSS
```

## Architecture

### Style Loading Flow

1. **Base Styles** (Bundled in React SPA)
   - Location: `packages/react/src/index.css`
   - Contains Tailwind CSS v4 + theme variables
   - Bundled into the generated SPA
   - Cannot be modified at runtime

2. **Custom Theme** (Runtime Injection)
   - Location: `.uigen/theme.css` (per project)
   - Written by AI agents or users
   - Injected by CLI via `window.__UIGEN_CSS__`
   - Applied after base styles load

3. **Injection Mechanism**
   ```typescript
   // In packages/react/src/main.tsx
   const customCSS = window.__UIGEN_CSS__;
   if (customCSS) {
     const styleElement = document.createElement('style');
     styleElement.id = 'uigen-custom-css';
     styleElement.textContent = customCSS;
     document.head.appendChild(styleElement);
   }
   ```

### CSS Variable System

The React SPA uses a comprehensive CSS variable system for theming:

```css
/* Light theme (default) */
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

/* Dark theme */
.dark {
  --background: #0a0a0a;
  --foreground: #e5e5e5;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  /* ... etc */
}
```

### Available Utility Classes

The React SPA includes custom utility classes:

```css
/* Background colors */
.bg-background, .bg-foreground, .bg-card, .bg-primary, .bg-secondary,
.bg-muted, .bg-accent, .bg-destructive, .bg-border, .bg-input, .bg-ring

/* Text colors */
.text-background, .text-foreground, .text-card, .text-primary, .text-secondary,
.text-muted, .text-accent, .text-destructive, .text-border, .text-input, .text-ring

/* Border colors */
.border-background, .border-foreground, .border-card, .border-primary, .border-secondary,
.border-muted, .border-accent, .border-destructive, .border-border, .border-input, .border-ring

/* Ring colors */
.ring-background, .ring-foreground, .ring-card, .ring-primary, .ring-secondary,
.ring-muted, .ring-accent, .ring-destructive, .ring-border, .ring-input, .ring-ring
```

## AI Agent Workflow

### Step 1: Understand the User's Requirements

Ask clarifying questions:
- What is the desired color scheme?
- Should it support dark mode?
- Are there specific brand colors?
- What components need custom styling?
- Any specific design system (Material, Fluent, etc.)?

### Step 2: Generate CSS for `.uigen/theme.css`

Create CSS that overrides or extends the base styles:

```css
/* Example: Custom brand colors */
:root {
  --primary: #10b981;
  --primary-foreground: #ffffff;
  --secondary: #3b82f6;
  --secondary-foreground: #ffffff;
  --accent: #8b5cf6;
  --accent-foreground: #ffffff;
}

.dark {
  --primary: #34d399;
  --primary-foreground: #0a0a0a;
  --secondary: #60a5fa;
  --secondary-foreground: #0a0a0a;
  --accent: #a78bfa;
  --accent-foreground: #0a0a0a;
}
```

### Step 3: Write the CSS File

```bash
# Create or update the theme file
.uigen/theme.css
```

### Step 4: Test with the Serve Command

```bash
# User runs this to see the styled SPA
uigen serve openapi.yaml
```

## Common Styling Tasks

### Task 1: Change Brand Colors

```css
/* Override primary brand color */
:root {
  --primary: #ff6b6b;
  --primary-foreground: #ffffff;
}

.dark {
  --primary: #ff8787;
  --primary-foreground: #0a0a0a;
}

/* Buttons will automatically use these colors via .bg-primary */
```

### Task 2: Customize Component Appearance

```css
/* Style buttons */
button {
  border-radius: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Style cards */
.bg-card {
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .bg-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

### Task 3: Style Forms

```css
/* Input fields */
input,
select,
textarea {
  border-radius: 0.5rem;
  border: 2px solid var(--border);
  padding: 0.75rem 1rem;
  transition: border-color 0.2s ease;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(var(--primary), 0.1);
}

/* Labels */
label {
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 0.5rem;
  display: block;
}
```

### Task 4: Style Tables (ListView)

```css
/* Table styling */
table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
}

thead {
  background-color: var(--muted);
}

thead th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--foreground);
  border-bottom: 2px solid var(--border);
}

tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover {
  background-color: var(--accent);
}

tbody td {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

/* Alternating row colors */
tbody tr:nth-child(even) {
  background-color: var(--muted);
}

tbody tr:nth-child(even):hover {
  background-color: var(--accent);
}
```

### Task 5: Style Navigation

```css
/* Sidebar navigation */
nav {
  background-color: var(--card);
  border-right: 1px solid var(--border);
}

nav a {
  display: block;
  padding: 0.75rem 1rem;
  color: var(--foreground);
  text-decoration: none;
  border-radius: 0.5rem;
  margin: 0.25rem 0.5rem;
  transition: all 0.2s ease;
}

nav a:hover {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

nav a.active {
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-weight: 600;
}
```

### Task 6: Add Animations

```css
/* Fade in animation */
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

/* Apply to cards */
.bg-card {
  animation: fadeIn 0.3s ease-out;
}

/* Loading spinner */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

/* Smooth transitions */
* {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-duration: 0.2s;
  transition-timing-function: ease-in-out;
}
```

### Task 7: Responsive Design

```css
/* Mobile-first approach */
.container {
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
  
  table {
    font-size: 0.875rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
  }
  
  nav {
    width: 250px;
  }
}

/* Large screens */
@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
    margin: 0 auto;
  }
}
```

## Design System Examples

### Example 1: Material Design Inspired

```css
:root {
  --primary: #6200ee;
  --primary-foreground: #ffffff;
  --secondary: #03dac6;
  --secondary-foreground: #000000;
  --background: #ffffff;
  --foreground: #000000;
  --card: #ffffff;
  --border: #e0e0e0;
  --radius: 0.25rem;
}

.dark {
  --primary: #bb86fc;
  --primary-foreground: #000000;
  --secondary: #03dac6;
  --secondary-foreground: #000000;
  --background: #121212;
  --foreground: #ffffff;
  --card: #1e1e1e;
  --border: #2c2c2c;
}

button {
  border-radius: 0.25rem;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.0892857143em;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

button:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.bg-card {
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

### Example 2: Fluent Design Inspired

```css
:root {
  --primary: #0078d4;
  --primary-foreground: #ffffff;
  --secondary: #605e5c;
  --secondary-foreground: #ffffff;
  --background: #faf9f8;
  --foreground: #323130;
  --card: #ffffff;
  --border: #edebe9;
  --radius: 0.125rem;
}

.dark {
  --primary: #4cc2ff;
  --primary-foreground: #000000;
  --secondary: #8a8886;
  --secondary-foreground: #ffffff;
  --background: #1b1a19;
  --foreground: #ffffff;
  --card: #252423;
  --border: #3b3a39;
}

button {
  border-radius: 0.125rem;
  font-weight: 600;
  border: 1px solid transparent;
}

button:hover {
  background-color: var(--accent);
}

.bg-card {
  border-radius: 0.125rem;
  border: 1px solid var(--border);
  box-shadow: 0 1.6px 3.6px rgba(0, 0, 0, 0.13);
}
```

### Example 3: Minimalist/Clean

```css
:root {
  --primary: #000000;
  --primary-foreground: #ffffff;
  --secondary: #666666;
  --secondary-foreground: #ffffff;
  --background: #ffffff;
  --foreground: #000000;
  --card: #ffffff;
  --border: #e5e5e5;
  --radius: 0;
}

.dark {
  --primary: #ffffff;
  --primary-foreground: #000000;
  --secondary: #999999;
  --secondary-foreground: #000000;
  --background: #000000;
  --foreground: #ffffff;
  --card: #0a0a0a;
  --border: #1a1a1a;
}

button {
  border-radius: 0;
  border: 2px solid var(--foreground);
  background-color: transparent;
  color: var(--foreground);
  font-weight: 600;
  padding: 0.75rem 2rem;
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

input,
select,
textarea {
  border-radius: 0;
  border: 1px solid var(--border);
  border-bottom: 2px solid var(--foreground);
}
```

## Best Practices for AI Agents

### 1. Always Support Dark Mode

```css
/* Define both light and dark variants */
:root {
  --custom-color: #3b82f6;
}

.dark {
  --custom-color: #60a5fa;
}
```

### 2. Use CSS Variables for Consistency

```css
/* Good: Uses theme variables */
button {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

/* Bad: Hardcoded colors */
button {
  background-color: #3b82f6;
  color: white;
}
```

### 3. Maintain Accessibility

```css
/* Ensure sufficient contrast */
:root {
  --primary: #0066cc; /* 4.5:1 contrast ratio */
}

/* Visible focus states */
button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* Don't rely solely on color */
.error {
  color: var(--destructive);
  border-left: 4px solid var(--destructive);
}
```

### 4. Keep Specificity Low

```css
/* Good: Low specificity */
button {
  padding: 0.5rem 1rem;
}

/* Bad: High specificity */
div.container > div.row > button.primary {
  padding: 0.5rem 1rem;
}
```

### 5. Use Transitions for Smooth UX

```css
/* Add transitions to interactive elements */
button,
input,
select,
a {
  transition: all 0.2s ease;
}
```

### 6. Test Responsive Behavior

```css
/* Mobile first */
.grid {
  grid-template-columns: 1fr;
}

/* Tablet and up */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Testing Your Generated CSS

### 1. Create the theme file

```bash
# AI agent writes to:
.uigen/theme.css
```

### 2. Run the serve command

```bash
# User tests with:
uigen serve openapi.yaml
```

### 3. Verify in browser

- Check light mode appearance
- Toggle to dark mode (if supported by the SPA)
- Test responsive behavior (resize browser)
- Verify all components (forms, tables, buttons, navigation)
- Check accessibility (keyboard navigation, focus states)

## Landing Page Styling

### Overview

Landing pages use the same `.uigen/theme.css` file and CSS variable system as the rest of the application. The `LandingPageView` component renders 8 section types, each with semantic CSS classes.

### Landing Page Section Selectors

```css
/* Landing page container */
.landing-page {
  /* Main landing page wrapper */
}

/* Hero section */
.hero-section {
  /* First impression section with headline and CTAs */
}

/* Features section */
.features-section {
  /* Product features showcase */
}

.features-grid {
  /* Grid container for feature items */
}

.feature-item {
  /* Individual feature card */
}

/* How It Works section */
.how-it-works-section {
  /* Step-by-step process explanation */
}

.steps-container {
  /* Container for step items */
}

.step-item {
  /* Individual step card */
}

.step-number {
  /* Step number badge */
}

/* Testimonials section */
.testimonials-section {
  /* Customer testimonials */
}

.testimonials-grid {
  /* Grid container for testimonials */
}

.testimonial-item {
  /* Individual testimonial card */
}

.rating {
  /* Star rating display */
}

/* Pricing section */
.pricing-section {
  /* Pricing plans showcase */
}

.pricing-grid {
  /* Grid container for pricing plans */
}

.pricing-plan {
  /* Individual pricing plan card */
}

.pricing-plan.highlighted {
  /* Featured/recommended plan */
}

/* FAQ section */
.faq-section {
  /* Frequently asked questions */
}

.faq-list {
  /* Container for FAQ items */
}

.faq-item {
  /* Individual FAQ item */
}

/* CTA section */
.cta-section {
  /* Call-to-action section */
}

/* Footer section */
.footer-section {
  /* Landing page footer */
}

.footer-links {
  /* Navigation links in footer */
}

.social-links {
  /* Social media links */
}

.legal-links {
  /* Privacy/Terms links */
}
```

### Landing Page Styling Examples

#### Example 1: Modern SaaS Landing Page

```css
/* Hero section with gradient background */
.hero-section {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  padding: 6rem 2rem;
  text-align: center;
}

.hero-section h1 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.hero-section p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero-section a {
  display: inline-block;
  padding: 1rem 2rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.hero-section a[data-testid="hero-primary-cta"] {
  background-color: white;
  color: var(--primary);
}

.hero-section a[data-testid="hero-secondary-cta"] {
  background-color: transparent;
  color: white;
  border: 2px solid white;
}

.hero-section a:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Features section with cards */
.features-section {
  padding: 4rem 2rem;
  background-color: var(--background);
}

.features-section h2 {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
  color: var(--foreground);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-item {
  background-color: var(--card);
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.feature-item h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--foreground);
}

.feature-item p {
  color: var(--muted-foreground);
  line-height: 1.6;
}

/* Pricing section with highlighted plan */
.pricing-section {
  padding: 4rem 2rem;
  background-color: var(--muted);
}

.pricing-section h2 {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.pricing-plan {
  background-color: var(--card);
  padding: 2rem;
  border-radius: 1rem;
  border: 2px solid var(--border);
  transition: all 0.3s ease;
}

.pricing-plan.highlighted {
  border-color: var(--primary);
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  position: relative;
}

.pricing-plan.highlighted::before {
  content: "Most Popular";
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--primary);
  color: var(--primary-foreground);
  padding: 0.25rem 1rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.pricing-plan h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.pricing-plan .price {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 1.5rem;
}

.pricing-plan .features-list {
  list-style: none;
  padding: 0;
  margin-bottom: 2rem;
}

.pricing-plan .features-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.pricing-plan .features-list li::before {
  content: "✓ ";
  color: var(--primary);
  font-weight: 700;
  margin-right: 0.5rem;
}

/* Testimonials section */
.testimonials-section {
  padding: 4rem 2rem;
  background-color: var(--background);
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.testimonial-item {
  background-color: var(--card);
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.testimonial-item blockquote {
  font-size: 1.125rem;
  font-style: italic;
  margin-bottom: 1rem;
  color: var(--foreground);
}

.testimonial-item .author {
  font-weight: 600;
  color: var(--foreground);
}

.testimonial-item .author-title {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.testimonial-item .rating {
  color: #fbbf24;
  font-size: 1.25rem;
  margin-top: 0.5rem;
}

/* Footer section */
.footer-section {
  background-color: var(--card);
  border-top: 1px solid var(--border);
  padding: 3rem 2rem 2rem;
}

.footer-links,
.social-links,
.legal-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.footer-section a {
  color: var(--muted-foreground);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-section a:hover {
  color: var(--primary);
}

.footer-section .copyright {
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
```

#### Example 2: Minimalist Landing Page

```css
/* Minimalist hero */
.hero-section {
  padding: 8rem 2rem;
  text-align: center;
  background-color: var(--background);
}

.hero-section h1 {
  font-size: 4rem;
  font-weight: 300;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
}

.hero-section p {
  font-size: 1.5rem;
  font-weight: 300;
  color: var(--muted-foreground);
  margin-bottom: 2rem;
}

.hero-section a {
  display: inline-block;
  padding: 1rem 3rem;
  margin: 0.5rem;
  border: 1px solid var(--foreground);
  color: var(--foreground);
  text-decoration: none;
  font-weight: 400;
  transition: all 0.2s ease;
}

.hero-section a[data-testid="hero-primary-cta"] {
  background-color: var(--foreground);
  color: var(--background);
}

.hero-section a:hover {
  transform: scale(1.05);
}

/* Minimalist features */
.features-section {
  padding: 4rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
}

.feature-item {
  border-bottom: 1px solid var(--border);
  padding-bottom: 2rem;
}

.feature-item h3 {
  font-size: 1.5rem;
  font-weight: 400;
  margin-bottom: 0.5rem;
}

.feature-item p {
  color: var(--muted-foreground);
  font-weight: 300;
}
```

#### Example 3: Bold/Vibrant Landing Page

```css
/* Bold hero with large typography */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 8rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.1)"/></svg>');
  opacity: 0.3;
}

.hero-section h1 {
  font-size: 4.5rem;
  font-weight: 900;
  color: white;
  text-transform: uppercase;
  letter-spacing: -0.03em;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
}

.hero-section p {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
}

.hero-section a {
  display: inline-block;
  padding: 1.25rem 3rem;
  margin: 0.5rem;
  border-radius: 50px;
  font-weight: 700;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.hero-section a[data-testid="hero-primary-cta"] {
  background-color: #fbbf24;
  color: #1a202c;
  box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
}

.hero-section a[data-testid="hero-primary-cta"]:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(251, 191, 36, 0.6);
}

/* Bold features with icons */
.features-section {
  padding: 6rem 2rem;
  background: linear-gradient(180deg, var(--background) 0%, var(--muted) 100%);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-item {
  text-align: center;
  padding: 2rem;
  background-color: var(--card);
  border-radius: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-8px) rotate(2deg);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
}

.feature-item h3 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 1rem;
}
```

### Responsive Landing Page Styles

```css
/* Mobile-first responsive design */

/* Mobile (default) */
.hero-section h1 {
  font-size: 2rem;
}

.features-grid,
.pricing-grid,
.testimonials-grid {
  grid-template-columns: 1fr;
}

/* Tablet */
@media (min-width: 768px) {
  .hero-section h1 {
    font-size: 3rem;
  }
  
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .pricing-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .hero-section h1 {
    font-size: 4rem;
  }
  
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .pricing-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .testimonials-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Dark Mode for Landing Pages

```css
/* Ensure landing pages look good in dark mode */
.dark .hero-section {
  background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%);
}

.dark .features-section {
  background-color: var(--background);
}

.dark .feature-item,
.dark .pricing-plan,
.dark .testimonial-item {
  background-color: var(--card);
  border-color: var(--border);
}

.dark .footer-section {
  background-color: var(--card);
  border-top-color: var(--border);
}
```

## Common Component Selectors

### Layout Components

```css
/* Main container */
main {
  /* Main content area */
}

/* Sidebar navigation */
nav {
  /* Navigation sidebar */
}

/* Header */
header {
  /* Page header */
}
```

### Form Components

```css
/* All inputs */
input, select, textarea {
  /* Form inputs */
}

/* Specific input types */
input[type="text"],
input[type="email"],
input[type="password"] {
  /* Text inputs */
}

/* Form labels */
label {
  /* Input labels */
}

/* Form groups */
.form-group {
  /* Form field containers */
}
```

### Table Components

```css
/* Table container */
table {
  /* Data tables */
}

/* Table headers */
thead th {
  /* Column headers */
}

/* Table rows */
tbody tr {
  /* Data rows */
}

/* Table cells */
tbody td {
  /* Data cells */
}
```

### Button Components

```css
/* All buttons */
button {
  /* Generic buttons */
}

/* Primary buttons */
button.bg-primary {
  /* Primary action buttons */
}

/* Secondary buttons */
button.bg-secondary {
  /* Secondary action buttons */
}

/* Destructive buttons */
button.bg-destructive {
  /* Delete/remove buttons */
}
```

### Card Components

```css
/* Card containers */
.bg-card {
  /* Card components */
}

/* Card headers */
.bg-card header {
  /* Card titles */
}

/* Card content */
.bg-card main {
  /* Card body */
}
```

## Discovering Component-Specific Selectors

**IMPORTANT**: The React SPA contains many components (ProfileView, ListView, DetailView, DashboardView, etc.). Rather than documenting every component's selectors, use this discovery workflow:

### Step 1: Inspect the Running Application

When a user asks to style a specific component or view:

1. **Ask the user to run the application**:
   ```bash
   uigen serve openapi.yaml
   ```

2. **Instruct them to use browser DevTools**:
   - Right-click on the element they want to style
   - Select "Inspect" or "Inspect Element"
   - Look at the HTML structure and CSS classes in the Elements/Inspector panel

3. **Identify the selectors**:
   - Look for Tailwind utility classes (e.g., `rounded-lg`, `bg-card`, `text-muted-foreground`)
   - Look for semantic HTML elements (e.g., `dl`, `dt`, `dd`, `button`, `table`)
   - Look for ARIA attributes (e.g., `aria-label`, `role`)
   - Look for data attributes if present

### Step 2: Use Semantic HTML Selectors

UIGen components use semantic HTML, so you can target elements by their purpose:

```css
/* Definition lists (used in detail views, profile views) */
dl { /* Field list container */ }
dt { /* Field labels */ }
dd { /* Field values */ }

/* Tables (used in list views) */
table { /* Data tables */ }
thead { /* Table headers */ }
tbody { /* Table body */ }
tr { /* Table rows */ }
td { /* Table cells */ }

/* Forms (used in create/edit views) */
form { /* Form containers */ }
fieldset { /* Field groups */ }
legend { /* Group labels */ }

/* Buttons with semantic meaning */
button[type="submit"] { /* Submit buttons */ }
button[type="button"] { /* Action buttons */ }
button[aria-label*="Edit"] { /* Edit buttons */ }
button[aria-label*="Delete"] { /* Delete buttons */ }
button[aria-label*="Cancel"] { /* Cancel buttons */ }

/* Alerts and messages */
[role="alert"] { /* Alert messages */ }
[role="status"] { /* Status messages */ }
```

### Step 3: Use Tailwind Utility Class Patterns

UIGen uses consistent Tailwind patterns across all components:

```css
/* Rounded elements (avatars, cards, buttons) */
.rounded-full { /* Circular elements */ }
.rounded-lg { /* Rounded cards */ }
.rounded-md { /* Rounded inputs */ }

/* Spacing patterns */
.space-y-4 { /* Vertical spacing */ }
.gap-4 { /* Flex/grid gaps */ }
.p-4, .p-6 { /* Padding */ }
.m-4, .m-6 { /* Margins */ }

/* Text styles */
.text-sm { /* Small text */ }
.text-base { /* Normal text */ }
.text-lg { /* Large text */ }
.font-medium { /* Medium weight */ }
.font-semibold { /* Semibold weight */ }

/* Colors using theme variables */
.bg-card { /* Card backgrounds */ }
.bg-muted { /* Muted backgrounds */ }
.text-muted-foreground { /* Muted text */ }
.border-border { /* Border colors */ }

/* Interactive states */
.hover\:bg-accent:hover { /* Hover backgrounds */ }
.focus\:ring-2:focus { /* Focus rings */ }
```

### Step 4: Target by Component Context

When styling a specific view or component, use contextual selectors:

```css
/* Style elements only within a specific context */

/* Example: Style tables only in list views */
main > div > table {
  /* List view tables */
}

/* Example: Style forms only in edit mode */
form fieldset {
  /* Edit form field groups */
}

/* Example: Style cards in a specific layout */
.max-w-2xl .border.rounded-lg {
  /* Cards in narrow layouts (like profile view) */
}

/* Example: Style buttons in specific contexts */
header button {
  /* Header action buttons */
}

footer button {
  /* Footer action buttons */
}
```

### Step 5: Use Attribute Selectors for Specificity

```css
/* Target by ARIA labels (semantic and accessible) */
button[aria-label="Edit profile"] {
  /* Specific edit button */
}

/* Target by data attributes if present */
[data-view="profile"] {
  /* Profile view container */
}

/* Target by role */
[role="navigation"] {
  /* Navigation elements */
}

/* Target by type */
input[type="email"] {
  /* Email inputs */
}
```

### Example Workflow: Styling a Specific Component

**User Request**: "I want to style the profile view avatar with a gradient border"

**AI Agent Response**:

1. **Discover the selector**:
   ```
   Please run `uigen serve openapi.yaml` and navigate to the profile view.
   Right-click on the avatar and select "Inspect".
   What CSS classes do you see on the avatar element?
   ```

2. **User provides**: "It has classes `w-20 h-20 rounded-full object-cover border-2 border-border`"

3. **Generate CSS**:
   ```css
   /* Profile avatar with gradient border */
   .w-20.h-20.rounded-full {
     border: 3px solid transparent;
     background-image: 
       linear-gradient(white, white),
       linear-gradient(135deg, var(--primary), var(--secondary));
     background-origin: border-box;
     background-clip: padding-box, border-box;
   }
   
   .dark .w-20.h-20.rounded-full {
     background-image: 
       linear-gradient(var(--background), var(--background)),
       linear-gradient(135deg, var(--primary), var(--secondary));
   }
   ```

### Best Practices for Component Discovery

1. **Start broad, then narrow**: Begin with element selectors (e.g., `button`), then add classes for specificity
2. **Use semantic HTML**: Prefer `dl`, `dt`, `dd`, `table`, `form` over generic `div` selectors
3. **Leverage ARIA attributes**: They're semantic and won't change with styling updates
4. **Combine selectors**: Use descendant selectors for context (e.g., `form button`)
5. **Test in browser**: Always verify selectors in DevTools before writing CSS
6. **Keep specificity low**: Avoid overly specific selectors that are hard to override

### When You Can't Inspect

If the user can't run the application or inspect elements:

1. **Ask for a screenshot**: Visual context helps identify components
2. **Ask which view/page**: Profile, List, Detail, Dashboard, etc.
3. **Ask what element**: Button, card, table, form, etc.
4. **Use common patterns**: Apply the semantic HTML and Tailwind patterns above
5. **Provide multiple options**: Give 2-3 selector variations to try

## Troubleshooting

### Styles Not Applying

1. **Check file location**: Ensure `.uigen/theme.css` exists
2. **Verify CLI command**: Run `uigen serve openapi.yaml`
3. **Check browser console**: Look for CSS injection errors
4. **Inspect element**: Use DevTools to see if styles are loaded
5. **Clear cache**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

### Specificity Issues

```css
/* If your styles aren't applying, increase specificity */

/* Low specificity (might not work) */
button { background: red; }

/* Higher specificity (more likely to work) */
button.bg-primary { background: red; }

/* Even higher (use sparingly) */
button.bg-primary:not(.disabled) { background: red; }

/* Nuclear option (avoid if possible) */
button { background: red !important; }
```

### Dark Mode Not Working

```css
/* Ensure you define dark mode variants */
:root {
  --custom-color: #3b82f6;
}

.dark {
  --custom-color: #60a5fa; /* Don't forget this! */
}
```

## Complete Example: E-commerce Theme

```css
/* E-commerce themed styling for UIGen React SPA */

/* Brand colors */
:root {
  --primary: #ff6b6b;
  --primary-foreground: #ffffff;
  --secondary: #4ecdc4;
  --secondary-foreground: #ffffff;
  --accent: #ffe66d;
  --accent-foreground: #000000;
  --background: #ffffff;
  --foreground: #2d3436;
  --card: #ffffff;
  --border: #dfe6e9;
  --radius: 0.5rem;
}

.dark {
  --primary: #ff7675;
  --primary-foreground: #000000;
  --secondary: #55efc4;
  --secondary-foreground: #000000;
  --accent: #ffeaa7;
  --accent-foreground: #000000;
  --background: #2d3436;
  --foreground: #dfe6e9;
  --card: #34495e;
  --border: #4a5568;
}

/* Buttons */
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

/* Cards (Product cards) */
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

/* Forms */
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
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* Tables (Order lists) */
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

tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover {
  background-color: var(--accent);
}

tbody td {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

/* Navigation */
nav {
  background-color: var(--card);
  border-right: 1px solid var(--border);
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
}

nav a {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: var(--foreground);
  text-decoration: none;
  border-radius: 0.5rem;
  margin: 0.25rem 0.5rem;
  transition: all 0.2s ease;
}

nav a:hover {
  background-color: var(--accent);
  transform: translateX(4px);
}

nav a.active {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: white;
  font-weight: 600;
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.bg-card {
  animation: slideIn 0.3s ease-out;
}

/* Responsive */
@media (max-width: 768px) {
  button {
    width: 100%;
  }
  
  table {
    font-size: 0.875rem;
  }
  
  nav {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}
```

## Conclusion

As an AI agent, your role is to:

1. **Understand user requirements** for styling
2. **Generate production-ready CSS** in `.uigen/theme.css`
3. **Use the CSS variable system** for consistency
4. **Support both light and dark modes**
5. **Ensure accessibility** (contrast, focus states)
6. **Test responsive behavior**
7. **Follow best practices** (low specificity, transitions, etc.)

The CSS you generate will be injected into the React SPA at runtime via `window.__UIGEN_CSS__`, extending the base Tailwind styles and theme variables.

**Key Files:**
- Write CSS to: `.uigen/theme.css`
- Base styles (reference): `packages/react/src/index.css`
- Injection point: `packages/react/src/main.tsx`

**Testing:**
```bash
uigen serve openapi.yaml
```

By following this skill, AI agents can generate beautiful, accessible, and production-ready styles for UIGen applications without requiring users to manually configure anything in the config-gui.
