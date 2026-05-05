# Creating Landing Pages

Learn how to add a professional landing page to your UIGen application using the `x-uigen-landing-page` annotation.

## Overview

Landing pages are essential for SaaS applications, providing a public-facing entry point that showcases your product before users sign up. This guide walks you through creating a complete landing page from scratch.

## Prerequisites

- UIGen CLI installed (`npm install -g @uigen-dev/cli`)
- An existing OpenAPI specification
- Basic understanding of YAML syntax

## Quick Start

### Step 1: Add the Annotation

Open your OpenAPI spec and add the `x-uigen-landing-page` annotation at the document root:

```yaml
openapi: 3.0.0
info:
  title: My SaaS App
  version: 1.0.0
x-uigen-landing-page:
  enabled: true
  sections:
    hero:
      enabled: true
      headline: "Welcome to My SaaS App"
      primaryCta:
        text: "Get Started"
        url: "/signup"
```

### Step 2: Generate Your App

Run the UIGen CLI to generate your application:

```bash
uigen config your-spec.yaml
```

### Step 3: Start the Development Server

```bash
cd .uigen
npm install
npm run dev
```

Visit `http://localhost:5173` to see your landing page!

## Building a Complete Landing Page

Let's build a full-featured landing page step by step.

### Hero Section

The hero section is your first impression. Make it count:

```yaml
x-uigen-landing-page:
  enabled: true
  sections:
    hero:
      enabled: true
      headline: "Transform Your Workflow"
      subheadline: "The all-in-one platform for modern teams to collaborate, track, and deliver"
      primaryCta:
        text: "Start Free Trial"
        url: "/signup"
      secondaryCta:
        text: "Watch Demo"
        url: "#demo"
```

**Tips:**
- Keep headlines short and benefit-focused (under 10 words)
- Subheadlines should expand on the headline (under 20 words)
- Primary CTA should be action-oriented ("Start", "Get", "Try")
- Secondary CTA can be informational ("Learn More", "Watch Demo")

### Features Section

Highlight your key capabilities:

```yaml
    features:
      enabled: true
      title: "Everything You Need to Succeed"
      items:
        - title: "Real-time Collaboration"
          description: "Work together seamlessly with your team, no matter where they are"
          icon: "users"
        - title: "Advanced Analytics"
          description: "Get data-driven insights to make better decisions faster"
          icon: "bar-chart"
        - title: "Secure by Default"
          description: "Enterprise-grade security with SOC 2 compliance built in"
          icon: "shield"
        - title: "Integrations"
          description: "Connect with the tools you already use and love"
          icon: "plug"
```

**Tips:**
- Aim for 3-6 features (odd numbers look better visually)
- Focus on benefits, not just features
- Use consistent icon style
- Keep descriptions concise (under 15 words)

### How It Works Section

Explain your user journey:

```yaml
    howItWorks:
      enabled: true
      title: "Get Started in Minutes"
      steps:
        - title: "Sign Up"
          description: "Create your account in seconds with email or social login"
        - title: "Set Up Your Workspace"
          description: "Customize your workspace and invite your team members"
        - title: "Start Collaborating"
          description: "Begin working together and see results immediately"
```

**Tips:**
- Keep it to 3-4 steps (more feels overwhelming)
- Use action verbs for step titles
- Focus on speed and ease ("in seconds", "immediately")
- Consider adding step images for visual appeal

### Testimonials Section

Build trust with social proof:

```yaml
    testimonials:
      enabled: true
      title: "Loved by Teams Worldwide"
      items:
        - quote: "This product completely transformed how our team works together. We're 10x more productive."
          author: "Sarah Johnson"
          authorTitle: "CEO, TechCorp"
          rating: 5
        - quote: "The best investment we made this year. ROI was immediate and substantial."
          author: "Michael Chen"
          authorTitle: "CTO, StartupXYZ"
          rating: 5
        - quote: "Simple to use, powerful features, and amazing support. Highly recommended!"
          author: "Emily Rodriguez"
          authorTitle: "Product Manager, BigCo"
          rating: 5
```

**Tips:**
- Use real testimonials when possible (with permission)
- Include specific results or metrics ("10x more productive")
- Add job titles for credibility
- Aim for 3-6 testimonials
- Consider adding customer photos

### Pricing Section

Present your pricing clearly:

```yaml
    pricing:
      enabled: true
      title: "Simple, Transparent Pricing"
      plans:
        - name: "Starter"
          price: "$9/month"
          features:
            - "Up to 10 users"
            - "5 GB storage"
            - "Basic features"
            - "Email support"
          ctaText: "Start Free Trial"
          ctaUrl: "/signup?plan=starter"
        
        - name: "Professional"
          price: "$29/month"
          features:
            - "Up to 50 users"
            - "50 GB storage"
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
            - "Unlimited storage"
            - "Custom features"
            - "Dedicated support"
            - "SLA guarantee"
          ctaText: "Contact Sales"
          ctaUrl: "/contact"
```

**Tips:**
- Offer 2-4 pricing tiers
- Highlight your most popular plan
- List features in order of importance
- Include a free trial when possible
- Make pricing clear (no hidden fees)

### FAQ Section

Address common concerns:

```yaml
    faq:
      enabled: true
      title: "Frequently Asked Questions"
      items:
        - question: "How does the free trial work?"
          answer: "You get 14 days of full access to all Professional features, no credit card required. Cancel anytime."
        
        - question: "Can I change plans later?"
          answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately."
        
        - question: "What payment methods do you accept?"
          answer: "We accept all major credit cards (Visa, MasterCard, Amex) and PayPal."
        
        - question: "Do you offer refunds?"
          answer: "Yes, we offer a 30-day money-back guarantee if you're not completely satisfied."
        
        - question: "Is my data secure?"
          answer: "Absolutely. We use bank-level encryption and are SOC 2 certified. Your data is always protected."
```

**Tips:**
- Answer the most common objections
- Keep answers concise but complete
- Address pricing, security, and support
- Aim for 5-8 questions
- Update based on actual customer questions

### CTA Section

Drive conversions with a strong call-to-action:

```yaml
    cta:
      enabled: true
      headline: "Ready to Transform Your Workflow?"
      subheadline: "Join over 10,000 teams already using our platform"
      primaryCta:
        text: "Start Your Free Trial"
        url: "/signup"
      secondaryCta:
        text: "Schedule a Demo"
        url: "/demo"
```

**Tips:**
- Place CTA sections strategically (after features, before footer)
- Use urgency or social proof in subheadline
- Make the primary action crystal clear
- Consider adding a "no credit card required" note

### Footer Section

Provide navigation and legal information:

```yaml
    footer:
      enabled: true
      companyName: "Acme Inc"
      links:
        - text: "About Us"
          url: "/about"
        - text: "Blog"
          url: "/blog"
        - text: "Careers"
          url: "/careers"
        - text: "Contact"
          url: "/contact"
      socialLinks:
        - platform: "Twitter"
          url: "https://twitter.com/acme"
        - platform: "LinkedIn"
          url: "https://linkedin.com/company/acme"
        - platform: "GitHub"
          url: "https://github.com/acme"
      copyrightText: "© 2026 Acme Inc. All rights reserved."
      legalLinks:
        - text: "Privacy Policy"
          url: "/privacy"
        - text: "Terms of Service"
          url: "/terms"
        - text: "Cookie Policy"
          url: "/cookies"
```

**Tips:**
- Include essential links (About, Contact, Legal)
- Add social media links for credibility
- Keep footer organized and scannable
- Ensure legal links are accessible

## Using AI to Generate Content

UIGen includes an AI skill that can generate landing page content from your OpenAPI spec. This is a great starting point:

### Step 1: Prepare Your Spec

Ensure your OpenAPI spec has good metadata:

```yaml
openapi: 3.0.0
info:
  title: Project Management Platform
  description: A comprehensive platform for managing projects, tasks, and team collaboration
  version: 1.0.0
```

### Step 2: Ask AI to Generate Content

In your AI assistant (like Claude or ChatGPT), use the `generate-landing-page-content` skill:

```
"Generate landing page content for my OpenAPI spec at ./my-spec.yaml"
```

### Step 3: Review and Customize

The AI will generate a complete `x-uigen-landing-page` annotation. Review it and customize:

- Adjust headlines to match your brand voice
- Add specific metrics or testimonials
- Update CTAs to match your conversion goals
- Refine feature descriptions

## Customizing Styles

### Using Theme Variables

Landing pages automatically use your theme from `.uigen/theme.css`. Customize colors, fonts, and spacing:

```css
/* .uigen/theme.css */
:root {
  --primary: #667eea;
  --primary-foreground: #ffffff;
  --background: #ffffff;
  --foreground: #1a202c;
}

.hero-section {
  background: linear-gradient(135deg, var(--primary) 0%, #764ba2 100%);
  color: var(--primary-foreground);
  padding: 6rem 2rem;
}

.features-section {
  background-color: #f7fafc;
  padding: 4rem 2rem;
}

.pricing-plan.highlighted {
  border: 2px solid var(--primary);
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}
```

### Adding Custom Sections

You can add custom CSS for specific sections:

```css
/* Custom hero background */
.hero-section {
  background-image: url('/images/hero-bg.jpg');
  background-size: cover;
  background-position: center;
}

/* Feature grid layout */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

/* Testimonial cards */
.testimonial-item {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## Testing Your Landing Page

### Local Testing

1. **Visual Check**: Review on different screen sizes
   ```bash
   # Desktop: http://localhost:5173
   # Mobile: Use browser dev tools responsive mode
   ```

2. **Link Testing**: Click all CTAs and links to ensure they work
   - Hero CTAs
   - Feature links
   - Pricing CTAs
   - Footer links

3. **Content Review**: Check for typos and clarity
   - Headlines are clear and compelling
   - Descriptions are concise
   - CTAs are action-oriented

### Browser Testing

Test on multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if on Mac)

### Mobile Testing

Landing pages are often first viewed on mobile:
- Test on actual devices when possible
- Use browser responsive mode
- Check touch targets are large enough
- Ensure text is readable without zooming

## Deployment

### Build for Production

```bash
cd .uigen
npm run build
```

### Deploy to Hosting

Deploy the `dist` folder to your hosting provider:

**Vercel:**
```bash
vercel deploy
```

**Netlify:**
```bash
netlify deploy --prod
```

**Static Hosting:**
Upload the `dist` folder to your web server.

### Configure Domain

Point your domain to the deployed app:
1. Add DNS records for your domain
2. Configure SSL certificate
3. Test the landing page at your domain

## Optimization Tips

### Performance

1. **Optimize Images**
   - Use WebP format when possible
   - Compress images (aim for <100KB per image)
   - Use lazy loading for below-the-fold images

2. **Minimize Bundle Size**
   - Only enable sections you need
   - Remove unused features
   - Use code splitting

3. **Improve Load Time**
   - Enable CDN for static assets
   - Use browser caching
   - Minimize CSS and JavaScript

### Conversion Optimization

1. **Clear Value Proposition**
   - Lead with benefits, not features
   - Use specific numbers and metrics
   - Address pain points directly

2. **Strong CTAs**
   - Use action verbs ("Start", "Get", "Try")
   - Create urgency ("Start Free Trial Today")
   - Remove friction ("No Credit Card Required")

3. **Social Proof**
   - Add customer logos
   - Include specific testimonials
   - Show user counts or metrics

4. **A/B Testing**
   - Test different headlines
   - Try various CTA text
   - Experiment with section order

### SEO Optimization

1. **Meta Tags**
   Add to your HTML head:
   ```html
   <meta name="description" content="Your compelling description">
   <meta property="og:title" content="Your App Name">
   <meta property="og:description" content="Your description">
   <meta property="og:image" content="/images/og-image.jpg">
   ```

2. **Semantic HTML**
   Landing pages use semantic HTML by default:
   - `<section>` for each section
   - `<h1>` for main headline
   - `<h2>` for section titles

3. **Performance**
   - Fast load times improve SEO
   - Mobile-friendly design is essential
   - Use descriptive alt text for images

## Common Patterns

### SaaS Landing Page

Focus on features, pricing, and free trial:

```yaml
sections:
  hero: { enabled: true }
  features: { enabled: true }
  howItWorks: { enabled: true }
  pricing: { enabled: true }
  faq: { enabled: true }
  cta: { enabled: true }
  footer: { enabled: true }
```

### Product Launch

Emphasize the problem and solution:

```yaml
sections:
  hero: { enabled: true }
  features: { enabled: true }
  testimonials: { enabled: true }
  cta: { enabled: true }
  footer: { enabled: true }
```

### Enterprise Focus

Highlight security, support, and case studies:

```yaml
sections:
  hero: { enabled: true }
  features: { enabled: true }
  testimonials: { enabled: true }
  pricing: { enabled: true }
  faq: { enabled: true }
  footer: { enabled: true }
```

## Troubleshooting

### Landing Page Not Showing

**Problem:** Landing page doesn't appear at `/`

**Solutions:**
1. Check `enabled: true` is set
2. Verify annotation is at document root level
3. Rebuild the app: `npm run build`
4. Clear browser cache

### Sections Not Rendering

**Problem:** Some sections don't appear

**Solutions:**
1. Verify each section has `enabled: true`
2. Check for validation errors in console
3. Ensure required fields are present
4. Review the [annotation reference](../spec-annotations/x-uigen-landing-page.md)

### Styling Issues

**Problem:** Styles don't look right

**Solutions:**
1. Check `.uigen/theme.css` is loaded
2. Inspect elements in browser dev tools
3. Verify CSS class names match documentation
4. Clear browser cache and rebuild

### Routing Conflicts

**Problem:** Dashboard or other routes not working

**Solutions:**
1. Landing page takes precedence at `/`
2. Dashboard automatically moves to `/dashboard`
3. Check for custom route overrides
4. Review routing in browser dev tools

## Next Steps

- [Customize your theme](../blog/customizing-your-theme.md)
- [Add authentication](../authentication/overview.md)
- [Configure layouts](../spec-annotations/x-uigen-layout.md)
- [Deploy to production](../guides/deployment.md)

## Examples

Check out these example landing pages:

- [Meeting Minutes App](https://github.com/uigen-dev/uigen/tree/main/examples/apps/fastapi/meeting-minutes)
- [E-commerce Platform](https://github.com/uigen-dev/uigen/tree/main/examples/ecommerce)
- [Project Management Tool](https://github.com/uigen-dev/uigen/tree/main/examples/project-management)

## Get Help

- [Discord Community](https://discord.gg/uigen)
- [GitHub Discussions](https://github.com/uigen-dev/uigen/discussions)
- [Documentation](https://docs.uigen.dev)
