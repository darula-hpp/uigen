---
title: "Auto-Generate Landing Pages from Your OpenAPI Spec"
author: "Olebogeng Mbedzi"
date: "2026-05-05"
excerpt: "Add a single annotation to your OpenAPI spec and get a complete marketing landing page with hero, features, pricing, testimonials, and more. No React code required."
tags: ["landing-pages", "openapi", "automation", "ai-generation"]
---

## The Problem

You built an API. You generated a complete SaaS frontend from the OpenAPI spec using UIGen. Now you need a landing page to showcase your product before users sign up.

You have two options:

1. **Build it manually**: Write React components for hero, features, pricing, testimonials, FAQ, CTA, and footer sections. Wire up routing so the landing page is at `/` and the application moves to `/dashboard`. Add responsive styles. Test on mobile. Spend 2-3 days.

2. **Use a landing page builder**: Pay $29/month for a drag-and-drop tool. Export static HTML. Figure out how to integrate it with your SaaS app. Deal with inconsistent styling between the landing page and the application.

Both options are tedious. Your API spec already contains most of the information needed for a landing page: the app name, description, features (resources and operations), and structure. Why write it twice?

## The Solution

UIGen now supports landing page generation from OpenAPI specs. Add a single annotation to your spec (or config file), and you get a complete landing page with:

- **Hero section** with headline, subheadline, and CTAs
- **Features section** showcasing your API capabilities
- **How It Works** step-by-step guide
- **Testimonials** from customers
- **Pricing** plans with feature lists
- **FAQ** section for common questions
- **CTA section** to drive conversions
- **Footer** with navigation and legal links

The landing page appears at `/`, your application moves to `/dashboard`, and everything uses your existing theme from `.uigen/theme.css`.

No React code. No separate landing page tool. Just configuration.

## How It Works

### Step 1: Add the Annotation

Add `x-uigen-landing-page` to your OpenAPI spec or `.uigen/config.yaml`:

```yaml
# In your OpenAPI spec (document root)
openapi: 3.0.0
info:
  title: Meeting Minutes API
  description: Automate meeting documentation
x-uigen-landing-page:
  enabled: true
  sections:
    hero:
      enabled: true
      headline: "Streamline Your Meeting Management"
      subheadline: "Capture, organize, and share meeting minutes effortlessly"
      primaryCta:
        text: "Get Started"
        url: "/signup"
      secondaryCta:
        text: "Learn More"
        url: "#features"
```

Or in `.uigen/config.yaml` (recommended for separation of concerns):

```yaml
# .uigen/config.yaml
version: '1.0'
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
        hero:
          enabled: true
          headline: "Streamline Your Meeting Management"
          subheadline: "Capture, organize, and share meeting minutes effortlessly"
          primaryCta:
            text: "Get Started"
            url: "/signup"
```

### Step 2: Generate the UI

```bash
uigen serve openapi.yaml
```

Open `http://localhost:4400` and you see a landing page at `/`. Your application is now at `/dashboard`.

### Step 3: Customize

Each section has granular enable/disable controls and customization options:

```yaml
x-uigen-landing-page:
  enabled: true
  sections:
    hero:
      enabled: true
      headline: "Transform Your Workflow"
      subheadline: "The all-in-one platform for modern teams"
      primaryCta:
        text: "Start Free Trial"
        url: "/signup"
      secondaryCta:
        text: "Watch Demo"
        url: "/demo"
    
    features:
      enabled: true
      title: "Everything You Need"
      items:
        - title: "Real-time Collaboration"
          description: "Work together seamlessly"
          icon: "users"
        - title: "Advanced Analytics"
          description: "Data-driven insights"
          icon: "bar-chart"
        - title: "Secure by Default"
          description: "Enterprise-grade security"
          icon: "shield"
    
    pricing:
      enabled: true
      title: "Simple Pricing"
      plans:
        - name: "Starter"
          price: "$9/month"
          features:
            - "Up to 10 users"
            - "Basic features"
            - "Email support"
          ctaText: "Start Free"
          ctaUrl: "/signup?plan=starter"
        
        - name: "Pro"
          price: "$29/month"
          features:
            - "Unlimited users"
            - "All features"
            - "Priority support"
          highlighted: true
          ctaText: "Start Free"
          ctaUrl: "/signup?plan=pro"
```

## AI-Powered Content Generation

Writing landing page copy is tedious. UIGen includes an AI skill that generates landing page content from your OpenAPI spec.

### How It Works

The AI analyzes your spec:

- **`info.title` and `info.description`** → Hero section
- **`paths` and operations** → Features section
- **Operation flow** → How It Works section
- **Resource count and complexity** → Pricing tiers
- **Common patterns** → FAQ section

### Usage

Tell an AI agent (Kiro, Cursor, GitHub Copilot):

```
"Generate landing page content for my OpenAPI spec"
```

The AI writes a complete `x-uigen-landing-page` annotation to `.uigen/config.yaml`:

```yaml
version: '1.0'
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
        hero:
          enabled: true
          headline: "Simplify Your Task Management"
          subheadline: "Stay organized and productive with our intuitive task manager"
          primaryCta:
            text: "Get Started"
            url: "/signup"
          secondaryCta:
            text: "Learn More"
            url: "#features"
        
        features:
          enabled: true
          title: "Everything You Need"
          items:
            - title: "Task Management"
              description: "Create, organize, and track tasks effortlessly"
              icon: "check-square"
            - title: "Quick Updates"
              description: "Update task status and details in real-time"
              icon: "edit"
            - title: "Stay Organized"
              description: "Keep all your tasks in one place"
              icon: "folder"
        
        pricing:
          enabled: true
          title: "Simple Pricing"
          plans:
            - name: "Free"
              price: "$0/month"
              features:
                - "Up to 50 tasks"
                - "Basic features"
                - "Community support"
              ctaText: "Get Started"
              ctaUrl: "/signup?plan=free"
            
            - name: "Pro"
              price: "$9/month"
              features:
                - "Unlimited tasks"
                - "All features"
                - "Priority support"
              highlighted: true
              ctaText: "Start Free Trial"
              ctaUrl: "/signup?plan=pro"
```

Refresh the page and you have a complete landing page.

### Content Generation Strategy

The AI uses these rules:

**Hero Section:**
- Transform title into benefit-focused headline
- Add action verbs: "Transform", "Streamline", "Simplify"
- Keep headline under 10 words
- Expand description into subheadline (under 20 words)

**Features Section:**
- Group operations by resource/tag
- Identify CRUD patterns
- Generate 3-6 feature items
- Focus on user benefits, not technical details

**Pricing Section:**
- Analyze API complexity (resource count, operation count)
- Simple API (1-3 resources): 2 tiers
- Medium API (4-8 resources): 3 tiers
- Complex API (9+ resources): 3 tiers with enterprise

**FAQ Section:**
- Include 5-8 common questions
- Cover: trial, pricing, security, support, cancellation
- Add domain-specific questions based on API patterns

## Styling Landing Pages

Landing pages use the same `.uigen/theme.css` file as the rest of your application. The `LandingPageView` component renders semantic HTML with CSS classes you can target.

### Available Selectors

```css
/* Landing page container */
.landing-page { }

/* Hero section */
.hero-section { }
.hero-section h1 { }
.hero-section p { }
.hero-section a[data-testid="hero-primary-cta"] { }
.hero-section a[data-testid="hero-secondary-cta"] { }

/* Features section */
.features-section { }
.features-grid { }
.feature-item { }
.feature-item h3 { }
.feature-item p { }

/* Pricing section */
.pricing-section { }
.pricing-grid { }
.pricing-plan { }
.pricing-plan.highlighted { }
.pricing-plan h3 { }
.pricing-plan .price { }
.pricing-plan .features-list { }

/* Testimonials section */
.testimonials-section { }
.testimonials-grid { }
.testimonial-item { }
.testimonial-item blockquote { }
.testimonial-item .author { }
.testimonial-item .rating { }

/* Footer section */
.footer-section { }
.footer-links { }
.social-links { }
.legal-links { }
```

### Example: Modern SaaS Landing Page

```css
/* .uigen/theme.css */

/* Hero with gradient background */
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

.hero-section a[data-testid="hero-primary-cta"] {
  background-color: white;
  color: var(--primary);
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.hero-section a[data-testid="hero-primary-cta"]:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Features with cards */
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

/* Pricing with highlighted plan */
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
```

### AI-Powered Styling

You can also use AI to generate landing page styles:

```
"Style the landing page with a modern gradient hero, card-based features,
and a highlighted pricing plan"
```

The AI writes CSS to `.uigen/theme.css` targeting the landing page selectors.

## Routing Behavior

When `x-uigen-landing-page` is enabled:

- **Landing page** appears at `/` (root route)
- **Application** moves to `/dashboard`
- **All other routes** remain unchanged
- **Landing page** is public (no authentication required)

When disabled or not configured:

- **Application** remains at `/` (backward compatible)
- **No landing page** route is created

This means you can add a landing page to an existing UIGen application without breaking existing routes.

## Real-World Example

Here's a complete landing page configuration for a meeting minutes app:

```yaml
# .uigen/config.yaml
version: '1.0'
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
        hero:
          enabled: true
          headline: "Streamline Your Meeting Management"
          subheadline: "Capture, organize, and share meeting minutes effortlessly with your team"
          primaryCta:
            text: "Get Started"
            url: "/signup"
          secondaryCta:
            text: "Learn More"
            url: "#features"
        
        features:
          enabled: true
          title: "Everything You Need"
          items:
            - title: "Meeting Management"
              description: "Create and organize meetings with ease"
              icon: "calendar"
            - title: "Minute Tracking"
              description: "Capture detailed meeting minutes in real-time"
              icon: "file-text"
            - title: "Action Items"
              description: "Track and manage action items to completion"
              icon: "check-square"
            - title: "Document Generation"
              description: "Generate professional PDFs automatically"
              icon: "file"
            - title: "Template Library"
              description: "Use pre-built templates or create your own"
              icon: "layout"
            - title: "Team Collaboration"
              description: "Share minutes and collaborate with your team"
              icon: "users"
        
        howItWorks:
          enabled: true
          title: "Get Started in Minutes"
          steps:
            - title: "Sign Up"
              description: "Create your account in seconds with email or social login"
            - title: "Create Your First Meeting"
              description: "Set up your meeting and invite participants"
            - title: "Capture Minutes"
              description: "Take notes and track action items in real-time"
            - title: "Generate Documents"
              description: "Export professional PDFs with one click"
        
        testimonials:
          enabled: true
          title: "What Our Customers Say"
          items:
            - quote: "This tool transformed how our team manages meetings. We're so much more organized now."
              author: "Sarah Johnson"
              authorTitle: "Project Manager, TechCorp"
              rating: 5
            - quote: "Simple to use, powerful features. Exactly what we needed for our growing team."
              author: "Michael Chen"
              authorTitle: "CEO, StartupXYZ"
              rating: 5
            - quote: "The action item tracking alone is worth it. Nothing falls through the cracks anymore."
              author: "Emily Rodriguez"
              authorTitle: "Operations Director, BigCo"
              rating: 5
        
        pricing:
          enabled: true
          title: "Simple, Transparent Pricing"
          plans:
            - name: "Starter"
              price: "$9/month"
              features:
                - "Up to 10 users"
                - "50 meetings per month"
                - "Basic features"
                - "Email support"
              ctaText: "Start Free Trial"
              ctaUrl: "/signup?plan=starter"
            
            - name: "Professional"
              price: "$29/month"
              features:
                - "Up to 50 users"
                - "Unlimited meetings"
                - "All features"
                - "Priority support"
                - "Advanced analytics"
              highlighted: true
              ctaText: "Start Free Trial"
              ctaUrl: "/signup?plan=pro"
            
            - name: "Enterprise"
              price: "Custom"
              features:
                - "Unlimited users"
                - "Custom features"
                - "Dedicated support"
                - "SLA guarantee"
                - "On-premise option"
              ctaText: "Contact Sales"
              ctaUrl: "/contact"
        
        faq:
          enabled: true
          title: "Frequently Asked Questions"
          items:
            - question: "How does the free trial work?"
              answer: "You get 14 days of full access to all Professional features, no credit card required."
            - question: "Can I change plans later?"
              answer: "Yes! You can upgrade or downgrade your plan at any time."
            - question: "What payment methods do you accept?"
              answer: "We accept all major credit cards and PayPal."
            - question: "Is my data secure?"
              answer: "Absolutely. We use bank-level encryption and are SOC 2 certified."
            - question: "Do you offer team training?"
              answer: "Yes, Professional and Enterprise plans include onboarding and training sessions."
            - question: "Can I export my data?"
              answer: "Yes, you can export all your data at any time in standard formats."
        
        cta:
          enabled: true
          headline: "Ready to Get Started?"
          subheadline: "Join thousands of teams already using our platform"
          primaryCta:
            text: "Start Your Free Trial"
            url: "/signup"
          secondaryCta:
            text: "Schedule a Demo"
            url: "/demo"
        
        footer:
          enabled: true
          companyName: "Meeting Minutes Inc"
          links:
            - text: "About Us"
              url: "/about"
            - text: "Blog"
              url: "/blog"
            - text: "Contact"
              url: "/contact"
          socialLinks:
            - platform: "Twitter"
              url: "https://twitter.com/meetingminutes"
            - platform: "LinkedIn"
              url: "https://linkedin.com/company/meetingminutes"
          copyrightText: "© 2026 Meeting Minutes Inc. All rights reserved."
          legalLinks:
            - text: "Privacy Policy"
              url: "/privacy"
            - text: "Terms of Service"
              url: "/terms"
```

Run `uigen serve openapi.yaml` and you get a complete landing page with all sections.

## Why This Matters

Landing pages are essential for SaaS applications. They provide a public-facing entry point that showcases your product before users sign up. But building landing pages is tedious:

- Write React components for each section
- Wire up routing
- Add responsive styles
- Test on mobile
- Keep content in sync with your API

UIGen eliminates this work. Your OpenAPI spec already contains the information needed for a landing page. The annotation system lets you configure the presentation without writing code.

This approach has several advantages:

**Faster development**: Add a landing page in minutes, not days

**Consistency**: The landing page uses the same theme as your application

**Maintainability**: Update the config, regenerate the UI

**AI-powered**: Let AI generate content from your spec

**Customization**: Use config files or annotations without forking

## Comparison to Alternatives

### vs. Landing Page Builders (Webflow, Framer, etc.)

**Landing page builders:**
- Drag-and-drop interface
- Export static HTML
- Separate from your app
- Inconsistent styling
- $29-99/month

**UIGen:**
- Configuration-based
- Integrated with your application
- Same theme as the rest of your app
- Free and open source

### vs. Manual React Components

**Manual React:**
- Write components for each section
- Wire up routing
- Add responsive styles
- 2-3 days of work

**UIGen:**
- Add annotation to config
- Run `uigen serve`
- 5 minutes of work

### vs. Static Site Generators (Gatsby, Next.js)

**Static site generators:**
- Separate project
- Different tech stack
- Complex build process
- Requires deployment

**UIGen:**
- Same project
- Same tech stack
- No build process
- Deployed with your application

## Limitations

**Content is generic**: AI-generated content needs customization to match your brand voice

**Testimonials are placeholders**: Use real customer quotes (with permission)

**Pricing is estimated**: Update with actual pricing and feature lists

**No A/B testing**: Use external tools for conversion optimization

**Limited section types**: 8 section types (more coming)

## Future Enhancements

We're working on:

- **More section types**: Logos, integrations, comparison tables, video embeds
- **A/B testing**: Built-in support for testing different headlines and CTAs
- **Analytics**: Track conversions and user behavior
- **Custom sections**: Define your own section types with templates
- **Visual editor**: Drag-and-drop interface for non-technical users

## Try It Yourself

Install UIGen:

```bash
npm install -g @uigen-dev/cli
```

Add the annotation to your OpenAPI spec or `.uigen/config.yaml`:

```yaml
x-uigen-landing-page:
  enabled: true
  sections:
    hero:
      enabled: true
      headline: "Your Headline Here"
      primaryCta:
        text: "Get Started"
        url: "/signup"
```

Generate the UI:

```bash
uigen serve openapi.yaml
```

Open `http://localhost:4400` and see your landing page.

## Conclusion

Landing pages are essential for SaaS applications, but building them is tedious. UIGen eliminates this work by generating landing pages from your OpenAPI spec.

Add a single annotation, run `uigen serve`, and you get a complete landing page with hero, features, pricing, testimonials, FAQ, CTA, and footer sections. Use AI to generate content from your spec, or write it manually. Style the landing page with the same `.uigen/theme.css` file as your dashboard.

No React code. No separate landing page tool. Just configuration.

The full documentation is available at [uigen.dev/docs/spec-annotations/x-uigen-landing-page](https://uigen.dev/docs/spec-annotations/x-uigen-landing-page).

---

## Further Reading

- [x-uigen-landing-page Reference](/docs/spec-annotations/x-uigen-landing-page) - Complete annotation documentation
- [How to Style UIGen Applications](/blog/styling-uigen-apps-with-ai) - Styling guide with AI and manual approaches
- [Building a Meeting Minutes App](/blog/building-meeting-minutes-app) - Real-world example with landing page
- [UIGen Architecture](/blog/uigen-architecture) - How UIGen works under the hood
