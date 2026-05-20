# Skill: Generate Landing Page Content

## Purpose

Analyze an OpenAPI specification and generate appropriate landing page content for the `x-uigen-landing-page` annotation. This skill helps developers quickly bootstrap a professional landing page by inferring content from their API structure and metadata.

## When to Use This Skill

- Starting a new UIGen project and need landing page content
- Converting an existing API into a SaaS application
- Need inspiration for landing page copy
- Want to quickly prototype a landing page structure

## Input

An OpenAPI specification (YAML or JSON) with:
- `info.title` - Application name
- `info.description` - Application description
- `paths` - API endpoints and operations
- `components.schemas` - Data models (optional)
- `tags` - Resource groupings (optional)

## Output

A complete `x-uigen-landing-page` annotation in YAML format, ready to add to `.uigen/config.yaml` under the `annotations.document` path.

The output should be placed in your project's `.uigen/config.yaml` file under the document-level annotations section. UIGen's reconciliation system will merge this configuration with your OpenAPI spec at runtime.

**File Location:** `.uigen/config.yaml`

**Structure:**
```yaml
version: '1.0'
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
        # ... generated content here
```

## Content Generation Strategy

### 1. Hero Section

**Source:** Extract from `info.title` and `info.description`

**Strategy:**
- **Headline:** Transform title into benefit-focused headline
  - Add action verbs: "Transform", "Streamline", "Simplify"
  - Focus on outcomes, not features
  - Keep under 10 words
  
- **Subheadline:** Expand on description
  - Explain who it's for and what problem it solves
  - Keep under 20 words
  
- **Primary CTA:** Always "Get Started" or "Start Free Trial" → `/signup`
- **Secondary CTA:** "Learn More" → `#features` or "Watch Demo" → `/demo`

**Example:**
```yaml
# Input (from OpenAPI spec)
info:
  title: Meeting Minutes API
  description: API for managing meeting minutes and action items

# Output (add to .uigen/config.yaml)
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
```

### 2. Features Section

**Source:** Analyze `paths` and `tags` to identify key capabilities

**Strategy:**
- Group operations by resource/tag
- Identify CRUD patterns and special operations
- Generate 3-6 feature items
- Focus on user benefits, not technical details

**Mapping Rules:**
- **POST operations** → "Create and Manage [Resource]"
- **GET operations** → "View and Track [Resource]"
- **PUT/PATCH operations** → "Update and Edit [Resource]"
- **DELETE operations** → "Remove and Archive [Resource]"
- **Search operations** → "Search and Filter [Resource]"
- **File upload** → "Upload and Attach Files"
- **Batch operations** → "Bulk Operations"

**Example:**
```yaml
# Input (from OpenAPI spec)
paths:
  /meetings:
    get: { summary: "List meetings" }
    post: { summary: "Create meeting" }
  /minutes:
    get: { summary: "List minutes" }
    post: { summary: "Create minutes" }
  /action-items:
    get: { summary: "List action items" }
    post: { summary: "Create action item" }

# Output (add to .uigen/config.yaml)
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
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
```

### 3. How It Works Section

**Source:** Infer user journey from operation flow

**Strategy:**
- Identify typical workflow: Create → Configure → Use
- Generate 3-4 steps
- Use action verbs for step titles
- Focus on simplicity and speed

**Common Patterns:**
1. **Sign Up** - "Create your account in seconds"
2. **Set Up** - "Configure your [workspace/settings/preferences]"
3. **Start Using** - "Begin [main action] immediately"
4. **Collaborate** (if multi-user) - "Invite your team and work together"

**Example:**
```yaml
# Add to .uigen/config.yaml
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
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
```

### 4. Testimonials Section

**Source:** Generate placeholder structure (user provides real quotes)

**Strategy:**
- Create 3 testimonial placeholders
- Use generic but realistic personas
- Include job titles relevant to target audience
- Add 5-star ratings by default

**Example:**
```yaml
# Add to .uigen/config.yaml
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
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
```

### 5. Pricing Section

**Source:** Analyze operation complexity and resource count

**Strategy:**
- Generate 2-3 pricing tiers based on API complexity
- **Simple API** (1-3 resources): Starter + Pro
- **Medium API** (4-8 resources): Starter + Pro + Enterprise
- **Complex API** (9+ resources): Free + Pro + Enterprise

**Tier Structure:**
- **Starter/Free:** Basic features, limited usage
- **Professional:** All features, higher limits
- **Enterprise:** Custom features, unlimited usage

**Example:**
```yaml
# Input: 5 resources (meetings, minutes, action-items, users, teams)

# Output (add to .uigen/config.yaml)
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
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
```

### 6. FAQ Section

**Source:** Generate common questions based on API patterns

**Strategy:**
- Include 5-8 common questions
- Cover: trial, pricing, security, support, cancellation
- Adapt questions to API domain

**Standard Questions:**
1. How does the free trial work?
2. Can I change plans later?
3. What payment methods do you accept?
4. Is my data secure?
5. Do you offer refunds?
6. Can I cancel anytime?

**Domain-Specific Questions:**
- **File handling API:** "What file formats are supported?"
- **Multi-tenant API:** "Can I have multiple workspaces?"
- **Integration API:** "What integrations are available?"

**Example:**
```yaml
# Add to .uigen/config.yaml
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
        faq:
          enabled: true
          title: "Frequently Asked Questions"
          items:
            - question: "How does the free trial work?"
              answer: "You get 14 days of full access to all Professional features, no credit card required."
            
            - question: "Can I change plans later?"
              answer: "Yes! You can upgrade or downgrade your plan at any time."
            
            - question: "Is my data secure?"
              answer: "Absolutely. We use bank-level encryption and are SOC 2 certified."
            
            - question: "What happens to my data if I cancel?"
              answer: "You can export all your data before canceling. We retain it for 30 days after cancellation."
            
            - question: "Do you offer team training?"
              answer: "Yes, Professional and Enterprise plans include onboarding and training sessions."
```

### 7. CTA Section

**Source:** Generic conversion-focused copy

**Strategy:**
- Use urgency or social proof
- Clear primary action
- Optional secondary action

**Example:**
```yaml
# Add to .uigen/config.yaml
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
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
```

### 8. Footer Section

**Source:** Extract from `info.contact` and common patterns

**Strategy:**
- Use company name from `info.contact.name` or title
- Generate standard navigation links
- Include common social platforms
- Add standard legal links

**Example:**
```yaml
# Input (from OpenAPI spec)
info:
  contact:
    name: "Acme Inc"
    email: "support@acme.com"

# Output (add to .uigen/config.yaml)
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
        footer:
          enabled: true
          companyName: "Acme Inc"
          links:
            - text: "About"
              url: "/about"
            - text: "Blog"
              url: "/blog"
            - text: "Contact"
              url: "/contact"
          socialLinks:
            - platform: "Twitter"
              url: "https://twitter.com/acme"
            - platform: "LinkedIn"
              url: "https://linkedin.com/company/acme"
          copyrightText: "© 2026 Acme Inc. All rights reserved."
          legalLinks:
            - text: "Privacy Policy"
              url: "/privacy"
            - text: "Terms of Service"
              url: "/terms"
```

## Usage Examples

### Example 1: Simple API

**Input:**
```yaml
openapi: 3.0.0
info:
  title: Task Manager
  description: Simple task management API
paths:
  /tasks:
    get: { summary: "List tasks" }
    post: { summary: "Create task" }
  /tasks/{id}:
    get: { summary: "Get task" }
    put: { summary: "Update task" }
    delete: { summary: "Delete task" }
```

**Generated Output (add to `.uigen/config.yaml`):**
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
        
        howItWorks:
          enabled: true
          title: "Get Started in Seconds"
          steps:
            - title: "Sign Up"
              description: "Create your account instantly"
            - title: "Add Tasks"
              description: "Start adding your tasks"
            - title: "Stay Productive"
              description: "Track and complete your work"
        
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
        
        faq:
          enabled: true
          title: "FAQ"
          items:
            - question: "Is there a free plan?"
              answer: "Yes! Our free plan includes up to 50 tasks and basic features."
            - question: "Can I upgrade later?"
              answer: "Absolutely. Upgrade anytime to unlock unlimited tasks and advanced features."
        
        cta:
          enabled: true
          headline: "Ready to Get Organized?"
          subheadline: "Join thousands of productive users"
          primaryCta:
            text: "Start Free"
            url: "/signup"
        
        footer:
          enabled: true
          companyName: "Task Manager"
          links:
            - text: "About"
              url: "/about"
            - text: "Contact"
              url: "/contact"
          copyrightText: "© 2026 Task Manager. All rights reserved."
          legalLinks:
            - text: "Privacy"
              url: "/privacy"
            - text: "Terms"
              url: "/terms"
```

### Example 2: Complex SaaS API

**Input:**
```yaml
openapi: 3.0.0
info:
  title: Project Management Platform
  description: Comprehensive project management and team collaboration platform
  contact:
    name: "ProjectHub Inc"
paths:
  /projects: { ... }
  /tasks: { ... }
  /teams: { ... }
  /users: { ... }
  /files: { ... }
  /comments: { ... }
  /analytics: { ... }
```

**Generated Output (add to `.uigen/config.yaml`):**
```yaml
version: '1.0'
annotations:
  document:
    x-uigen-landing-page:
      enabled: true
      sections:
        hero:
          enabled: true
          headline: "Transform Your Project Management"
          subheadline: "The all-in-one platform for teams to plan, collaborate, and deliver projects successfully"
          primaryCta:
            text: "Start Free Trial"
            url: "/signup"
          secondaryCta:
            text: "Watch Demo"
            url: "/demo"
        
        features:
          enabled: true
          title: "Everything Your Team Needs"
          items:
            - title: "Project Management"
              description: "Plan and track projects from start to finish"
              icon: "briefcase"
            - title: "Task Tracking"
              description: "Assign and monitor tasks across your team"
              icon: "check-square"
            - title: "Team Collaboration"
              description: "Work together seamlessly in real-time"
              icon: "users"
            - title: "File Sharing"
              description: "Share and organize project files securely"
              icon: "file"
            - title: "Analytics & Reporting"
              description: "Get insights into team performance and progress"
              icon: "bar-chart"
            - title: "Comments & Feedback"
              description: "Communicate and provide feedback instantly"
              icon: "message-square"
        
        howItWorks:
          enabled: true
          title: "Get Started in Minutes"
          steps:
            - title: "Create Your Workspace"
              description: "Set up your team workspace and invite members"
            - title: "Plan Your Projects"
              description: "Create projects and break them down into tasks"
            - title: "Collaborate & Deliver"
              description: "Work together and track progress to completion"
        
        testimonials:
          enabled: true
          title: "Trusted by Teams Worldwide"
          items:
            - quote: "This platform completely transformed how we manage projects. Our team is 10x more productive."
              author: "Sarah Johnson"
              authorTitle: "VP of Engineering, TechCorp"
              rating: 5
            - quote: "The best project management tool we've used. Intuitive, powerful, and great support."
              author: "Michael Chen"
              authorTitle: "CEO, StartupXYZ"
              rating: 5
            - quote: "Finally, a tool that our entire team actually wants to use. Game changer for us."
              author: "Emily Rodriguez"
              authorTitle: "Product Manager, BigCo"
              rating: 5
        
        pricing:
          enabled: true
          title: "Plans for Teams of All Sizes"
          plans:
            - name: "Starter"
              price: "$9/month"
              features:
                - "Up to 10 users"
                - "10 projects"
                - "5 GB storage"
                - "Basic features"
                - "Email support"
              ctaText: "Start Free Trial"
              ctaUrl: "/signup?plan=starter"
            
            - name: "Professional"
              price: "$29/month"
              features:
                - "Up to 50 users"
                - "Unlimited projects"
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
                - "Unlimited projects"
                - "Unlimited storage"
                - "Custom features"
                - "Dedicated support"
                - "SLA guarantee"
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
              answer: "Yes, Professional and Enterprise plans include onboarding and training."
            - question: "Can I export my data?"
              answer: "Yes, you can export all your data at any time in standard formats."
        
        cta:
          enabled: true
          headline: "Ready to Transform Your Team's Productivity?"
          subheadline: "Join over 10,000 teams already using our platform"
          primaryCta:
            text: "Start Your Free Trial"
            url: "/signup"
          secondaryCta:
            text: "Schedule a Demo"
            url: "/demo"
        
        footer:
          enabled: true
          companyName: "ProjectHub Inc"
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
              url: "https://twitter.com/projecthub"
            - platform: "LinkedIn"
              url: "https://linkedin.com/company/projecthub"
            - platform: "GitHub"
              url: "https://github.com/projecthub"
          copyrightText: "© 2026 ProjectHub Inc. All rights reserved."
          legalLinks:
            - text: "Privacy Policy"
              url: "/privacy"
            - text: "Terms of Service"
              url: "/terms"
            - text: "Security"
              url: "/security"
```

## Customization Guidelines

After generating the initial content, customize it to match your brand:

1. **Headlines:** Adjust tone and voice to match your brand personality
2. **Features:** Add specific metrics or unique selling points
3. **Testimonials:** Replace with real customer quotes (with permission)
4. **Pricing:** Update with actual pricing and feature lists
5. **FAQ:** Add questions specific to your product or industry
6. **CTAs:** Optimize based on your conversion goals

## How It Works: Config Reconciliation

UIGen uses a **reconciliation system** to merge your `.uigen/config.yaml` annotations with your OpenAPI spec at runtime:

1. **Separation of Concerns:** Your OpenAPI spec stays clean and focused on API definition
2. **Document-Level Annotations:** Annotations like `x-uigen-landing-page` and `x-uigen-layout` that apply to the entire application go in `config.yaml` under `annotations.document`
3. **Runtime Merging:** The reconciler combines the config with your spec when the app loads
4. **Path Support:** Use `document` or `#/` as the path for document-level annotations

This approach keeps your API spec portable while allowing rich UI customization through the config file.

## Best Practices

1. **Start with Generation:** Use AI to create initial structure
2. **Review and Refine:** Don't use generated content as-is
3. **Add Specifics:** Replace generic copy with specific benefits
4. **Test and Iterate:** A/B test different headlines and CTAs
5. **Keep It Updated:** Refresh content as your product evolves

## Limitations

- Generated content is generic and needs customization
- Testimonials are placeholders (use real quotes)
- Pricing is estimated (update with actual plans)
- May not capture unique value propositions
- Requires human review for brand voice consistency

## Related Skills

- `auto-annotate` - Automatically annotate OpenAPI specs
- `applying-styles-to-react-spa` - Customize landing page styles

## See Also

- [x-uigen-landing-page Reference](../apps/docs/content/spec-annotations/x-uigen-landing-page.md)
- [Creating Landing Pages Tutorial](../apps/docs/content/guides/creating-landing-pages.md)
