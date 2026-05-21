# Skill: Configure Payment Integration

## Overview
This skill guides AI agents through automatically detecting and configuring payment providers (Stripe, PayPal, Square) in OpenAPI specifications. It adds the `x-uigen-payments` annotation to enable payment processing and subscription management in UIGen applications.

## Critical Understanding

### What This Skill Does
Analyzes an OpenAPI spec and automatically configures payment integration by:
- Detecting if the API needs payment processing (has subscription/pricing endpoints)
- Prompting user for payment provider preferences
- Prompting user for product/pricing configuration
- Generating `x-uigen-payments` annotation with proper configuration
- Adding payment configuration to both OpenAPI spec and config.yaml
- Providing setup instructions for each selected provider

### Payment Configuration Locations

**Option 1: OpenAPI Spec (Recommended)**
```yaml
openapi: 3.0.0
# Document-level payment configuration
x-uigen-payments:
  providers:
    - provider: stripe
      publishableKey: ${STRIPE_PUBLISHABLE_KEY}  # Frontend-safe public key
      mode: test
      currency: usd
  pricingPage:
    enabled: true
    source: inline
    products:
      - id: free
        name: Free
        description: Get started with basic features
        type: subscription
        price: 0
        interval: month
        features:
          - Up to 10 meetings per month
          - 3 custom templates
      - id: pro-monthly
        name: Professional
        description: Full access to all features
        type: subscription
        price: 2900
        interval: month
        highlighted: true
        features:
          - Unlimited meetings
          - Unlimited templates
          - Priority support

# Mark resources or operations as monetized
paths:
  /api/v1/meetings:
    x-uigen-monetized: true
    post:
      summary: Create meeting
      # Backend enforces limits, returns 402 if exceeded
```

**Backend Configuration (in .env):**
```bash
# Backend secrets (never exposed to frontend)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Option 2: Config.yaml**
```yaml
version: '1.0'
payments:
  providers:
    - provider: stripe
      publishableKey: ${STRIPE_PUBLISHABLE_KEY}  # Frontend-safe public key
      mode: test
      currency: usd
  pricingPage:
    enabled: true
    source: inline
    products:
      - id: free
        name: Free
        type: subscription
        price: 0
        interval: month
        features:
          - Up to 10 meetings per month
      - id: pro-monthly
        name: Professional
        type: subscription
        price: 2900
        interval: month
        highlighted: true
        features:
          - Unlimited meetings
          - Priority support
  checkoutEndpoint: /api/v1/pricing/create-checkout  # Full path including /api prefix
  defaultCurrency: usd  # Optional: defaults to provider currency
  successUrl: /payment/success  # Optional: relative path, defaults to {origin}/payment/success
  cancelUrl: /payment/cancel  # Optional: relative path, defaults to {origin}/payment/cancel
```

**Security Note:** Only `publishableKey` is exposed to the frontend. Backend secrets (`apiKey`, `webhookSecret`, `clientSecret`) must stay in `.env` and never be added to the spec or config.yaml.

## AI Agent Workflow

### Step 1: Detect Need for Payments

Check if the API would benefit from payment integration:

**Indicators that payments are needed:**
- Has subscription/pricing endpoints (`/subscriptions`, `/plans`, `/pricing`)
- Has user management with tiers/plans
- Has usage limits or quotas
- Has premium features
- User explicitly requests payment setup
- API description mentions "subscription", "payment", "billing", "premium"

**Skip payments if:**
- API is purely public (no monetization)
- Payments are already configured (`x-uigen-payments` exists)
- API is internal/enterprise only

### Step 2: Ask User for Provider Preferences

Use interactive prompts to gather payment configuration:

```typescript
// Prompt 1: Which provider?
"Which payment provider would you like to use?"
Options:
  - Stripe (recommended for most use cases)
  - PayPal (recommended for international/consumer payments)
  - Square (recommended for in-person + online)
  - Multiple providers

// Prompt 2: Operating mode
"Which mode would you like to start with?"
Options:
  - Test/Sandbox mode (recommended for development)
  - Live/Production mode

// Prompt 3: Default currency
"What is your default currency?"
Default: "usd"
Options: usd, eur, gbp, cad, aud, jpy, etc.
```

### Step 3: Ask for Product Configuration

```typescript
// Prompt 1: Do you want to define products now?
"Would you like to define your pricing plans now?"
Options:
  - Yes, define products
  - No, I'll add them later

// If yes, for each product:
"Let's configure your pricing plans. I'll ask about each plan."

// Product 1
"Product ID (e.g., 'pro-monthly'):"
"Product name (e.g., 'Professional'):"
"Product type:"
  Options:
    - Subscription (recurring billing)
    - One-time (single payment)
    - Usage-based (pay per use)

// If subscription:
"Price (in cents, e.g., 2900 for $29.00):"
"Billing interval:"
  Options:
    - month
    - year
    - week
    - day

"Features (comma-separated, e.g., 'Unlimited meetings, Priority support'):"

"Is this the recommended plan?"
  Options:
    - Yes (will be highlighted)
    - No

"Add another product?"
  Options:
    - Yes
    - No
```

### Step 4: Generate Payment Configuration

Based on user selections, generate the payment configuration:

**Provider-Specific Configuration:**

**Stripe:**
```typescript
{
  provider: 'stripe',
  publishableKey: '${STRIPE_PUBLISHABLE_KEY}',  // Frontend-safe public key
  mode: 'test', // or 'live'
  currency: 'usd',
  enabled: true
}

// Backend secrets in .env (never in spec/config)
// STRIPE_SECRET_KEY=sk_test_...
// STRIPE_WEBHOOK_SECRET=whsec_...
```

**PayPal:**
```typescript
{
  provider: 'paypal',
  publishableKey: '${PAYPAL_CLIENT_ID}',  // Frontend-safe client ID
  mode: 'sandbox', // or 'live'
  currency: 'usd',
  enabled: true
}

// Backend secrets in .env (never in spec/config)
// PAYPAL_CLIENT_SECRET=...
// PAYPAL_WEBHOOK_SECRET=...
```

**Square:**
```typescript
{
  provider: 'square',
  publishableKey: '${SQUARE_APPLICATION_ID}',  // Frontend-safe application ID
  mode: 'sandbox', // or 'production'
  currency: 'usd',
  enabled: true
}

// Backend secrets in .env (never in spec/config)
// SQUARE_ACCESS_TOKEN=...
// SQUARE_WEBHOOK_SECRET=...
```

**Product Configuration Template:**
```typescript
{
  id: 'pro-monthly',
  name: 'Professional',
  description: 'Full access to all features',
  type: 'subscription', // or 'one-time', 'usage-based'
  price: 2900, // in cents
  currency: 'usd', // optional, overrides provider default
  interval: 'month', // for subscriptions
  intervalCount: 1, // optional, e.g., 3 for "every 3 months"
  features: [
    'Unlimited meetings',
    'Unlimited templates',
    'Priority support'
  ],
  highlighted: true // optional, marks as recommended
}
```

### Step 5: Add Configuration to Spec

**Preferred Method: Add to OpenAPI spec document level**

```yaml
# Document-level payment configuration
x-uigen-payments:
  providers:
    - provider: stripe
      publishableKey: ${STRIPE_PUBLISHABLE_KEY}
      mode: test
      currency: usd
  pricingPage:
    enabled: true
    source: inline
    products:
      - id: free
        name: Free
        type: subscription
        price: 0
        interval: month
        features:
          - Up to 10 meetings per month
          - 3 custom templates
      - id: pro-monthly
        name: Professional
        type: subscription
        price: 2900
        interval: month
        highlighted: true
        features:
          - Unlimited meetings
          - Unlimited templates
          - Priority support
      - id: enterprise
        name: Enterprise
        type: subscription
        price: custom
        features:
          - Everything in Professional
          - Custom integrations
          - Dedicated support
  defaultCurrency: usd
  successUrl: /payment/success
  cancelUrl: /payment/cancel

# Mark resources or operations as monetized
paths:
  /api/v1/meetings:
    x-uigen-monetized: true
    post:
      summary: Create meeting
      # Backend enforces limits, returns 402 if exceeded
  
  /api/v1/templates:
    post:
      summary: Create template
      x-uigen-monetized:
        monetized: true
        message: "Upgrade to Professional to create custom templates"
      # Only creation requires payment, listing is free
```

**Backend Configuration (in .env):**
```bash
# Backend secrets (never exposed to frontend)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Alternative: Add to config.yaml**

If user prefers config.yaml or spec is read-only:

```yaml
version: '1.0'
payments:
  providers:
    - provider: stripe
      publishableKey: ${STRIPE_PUBLISHABLE_KEY}
      mode: test
      currency: usd
  pricingPage:
    enabled: true
    source: inline
    products:
      - id: free
        name: Free
        type: subscription
        price: 0
        interval: month
        features:
          - Up to 10 meetings per month
      - id: pro-monthly
        name: Professional
        type: subscription
        price: 2900
        interval: month
        highlighted: true
        features:
          - Unlimited meetings
          - Priority support
  checkoutEndpoint: /api/v1/pricing/create-checkout  # Full path including /api prefix
  defaultCurrency: usd  # Optional: defaults to provider currency
  successUrl: /payment/success  # Optional: relative path, defaults to {origin}/payment/success
  cancelUrl: /payment/cancel  # Optional: relative path, defaults to {origin}/payment/cancel
```

**Note:** Payment gates (`x-uigen-monetized`) must be defined in the OpenAPI spec, not config.yaml.

### Step 6: Provide Setup Instructions

Generate provider-specific setup instructions:

```markdown
✓ Payment configuration added successfully!

## What Was Generated

1. **Auto-Generated Pricing Page** at `/pricing`
   - Displays all products from your configuration
   - Responsive pricing table with feature comparison
   - Payment buttons for each plan
   - Highlights recommended plan

2. **Payment Gates** (if `x-uigen-monetized` annotations added)
   - Backend enforces limits and returns 402 when exceeded
   - Frontend shows upgrade prompt automatically
   - Links to pricing page for easy upgrade

3. **Security Configuration**
   - Only frontend-safe keys in spec/config
   - Backend secrets stay in .env
   - Backend is source of truth for enforcement

## Payment Gates

You added payment gates to the following resources/operations:

- `/api/v1/meetings` - Entire resource requires payment
- `/api/v1/templates` (POST) - Only creation requires payment

**How Payment Gates Work:**

1. User attempts monetized operation
2. Backend checks user's plan/limits
3. If exceeded, backend returns 402 Payment Required
4. Frontend intercepts 402 and shows upgrade prompt
5. User clicks "View Plans" and navigates to `/pricing`
6. User subscribes and gains access

**Backend Enforcement Example:**

```python
@router.post("/api/v1/meetings")
async def create_meeting(user: User = Depends(get_current_user)):
    # Check user's plan and limits
    if user.plan == "free":
        meeting_count = await get_user_meeting_count(user.id)
        if meeting_count >= 10:
            raise HTTPException(
                status_code=402,
                detail="Upgrade to Professional to create more meetings"
            )
    
    # Create meeting
    return await create_meeting(user, meeting)
```

Next steps to complete payment setup:

## 1. Stripe Setup

### Get API Keys
1. Go to Stripe Dashboard: https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)

### Get Webhook Secret
1. Go to Webhooks: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-api.com/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)

### Set Environment Variables
```bash
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_PUBLISHABLE_KEY="pk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Create Products in Stripe
For each product in your configuration, create a corresponding product in Stripe:

1. Go to Products: https://dashboard.stripe.com/products
2. Click "Add product"
3. Set product name: "Professional"
4. Set pricing: $29.00 / month
5. Copy the **Price ID** (starts with `price_`)
6. Update your config to use this Price ID as the `productId`

## 2. Implement Webhook Endpoint

Create a webhook endpoint in your backend to handle payment events:

### FastAPI Example
```python
from fastapi import APIRouter, Request, HTTPException
import stripe
import os

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle different event types
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        # Grant access to user
        await grant_access(session['customer'], session['subscription'])
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        # Revoke access
        await revoke_access(subscription['customer'])
    
    return {"status": "success"}
```

### Express.js Example
```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/webhooks/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Grant access
      break;
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      // Revoke access
      break;
  }
  
  res.json({received: true});
});
```

## 3. Test Payment Flow

1. Set environment variables
2. Run your API: `uigen serve openapi.yaml`
3. Navigate to the pricing page
4. Click "Subscribe" on a plan
5. Use Stripe test card: `4242 4242 4242 4242`
6. Verify webhook is called
7. Verify user gets access

## 4. Go Live

When ready for production:

1. Switch to live mode in Stripe Dashboard
2. Get live API keys (start with `sk_live_` and `pk_live_`)
3. Update environment variables
4. Update `mode: live` in your config
5. Create live webhook endpoint
6. Test with real payment methods

## Testing

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### PayPal Sandbox
- Use PayPal sandbox accounts for testing
- Create test accounts at: https://developer.paypal.com/dashboard/accounts

## Documentation

For detailed information, refer to:
- Stripe Documentation: https://stripe.com/docs
- PayPal Documentation: https://developer.paypal.com/docs
- UIGen Payment Guide: (link to your docs)
```

## Detection Rules

### Rule 1: Detect Payment Need

```typescript
function needsPayments(spec: OpenAPISpec): boolean {
  // Check if payments already configured
  if (spec.info['x-uigen-payments']) {
    return false;
  }
  
  // Check for subscription/pricing endpoints
  const hasSubscriptionEndpoints = Object.entries(spec.paths).some(([path, methods]) =>
    /\/(subscription|plan|pricing|billing|payment)/.test(path.toLowerCase())
  );
  
  // Check for tier/premium endpoints
  const hasTierEndpoints = Object.entries(spec.paths).some(([path]) =>
    /\/(tier|premium|upgrade|downgrade)/.test(path.toLowerCase())
  );
  
  // Check description for payment keywords
  const description = spec.info.description?.toLowerCase() || '';
  const hasPaymentKeywords = /subscription|payment|billing|premium|pricing|monetization/.test(description);
  
  return hasSubscriptionEndpoints || hasTierEndpoints || hasPaymentKeywords;
}
```

### Rule 2: Suggest Provider Based on Use Case

```typescript
function suggestProvider(spec: OpenAPISpec): string {
  const title = spec.info.title.toLowerCase();
  const description = spec.info.description?.toLowerCase() || '';
  const allText = title + ' ' + description;
  
  // SaaS/B2B → Stripe (best for subscriptions)
  if (/saas|b2b|enterprise|software|platform/.test(allText)) {
    return 'stripe';
  }
  
  // E-commerce/Consumer → PayPal (widely accepted)
  if (/ecommerce|shop|store|marketplace|consumer/.test(allText)) {
    return 'paypal';
  }
  
  // In-person/Retail → Square (POS integration)
  if (/retail|pos|in-person|physical|store/.test(allText)) {
    return 'square';
  }
  
  // Default to Stripe (most versatile)
  return 'stripe';
}
```

### Rule 3: Detect Existing Products

```typescript
function detectProducts(spec: OpenAPISpec): PaymentProduct[] {
  const products: PaymentProduct[] = [];
  
  // Look for pricing/plan schemas
  const schemas = spec.components?.schemas || {};
  
  for (const [name, schema] of Object.entries(schemas)) {
    if (/plan|tier|subscription|pricing/i.test(name)) {
      // Extract product info from schema
      const properties = (schema as any).properties || {};
      
      if (properties.price || properties.amount) {
        products.push({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: name,
          type: 'subscription',
          price: 0, // User will need to fill this in
        });
      }
    }
  }
  
  return products;
}
```

## Implementation Example

```typescript
async function configurePayments(specPath: string): Promise<void> {
  // Step 1: Load and parse spec
  const spec = await loadOpenAPISpec(specPath);
  
  // Step 2: Check if payments needed
  if (!needsPayments(spec)) {
    console.log('Payments not needed or already configured');
    return;
  }
  
  // Step 3: Suggest provider
  const suggestedProvider = suggestProvider(spec);
  
  // Step 4: Ask user for provider
  const provider = await askUserForProvider(suggestedProvider);
  
  // Step 5: Ask for mode
  const mode = await askUserForMode(); // 'test' or 'live'
  
  // Step 6: Ask for currency
  const currency = await askUserForCurrency(); // default 'usd'
  
  // Step 7: Ask if user wants to define products
  const defineProducts = await askUserYesNo('Would you like to define your pricing plans now?');
  
  let products: PaymentProduct[] = [];
  if (defineProducts) {
    products = await askUserForProducts();
  }
  
  // Step 8: Generate configuration
  const paymentsConfig = {
    providers: [
      {
        provider,
        apiKey: `\${${provider.toUpperCase()}_SECRET_KEY}`,
        publishableKey: provider === 'stripe' ? `\${${provider.toUpperCase()}_PUBLISHABLE_KEY}` : undefined,
        clientId: provider === 'paypal' ? `\${${provider.toUpperCase()}_CLIENT_ID}` : undefined,
        clientSecret: provider === 'paypal' ? `\${${provider.toUpperCase()}_CLIENT_SECRET}` : undefined,
        webhookSecret: `\${${provider.toUpperCase()}_WEBHOOK_SECRET}`,
        mode,
        currency,
      }
    ],
    products,
    defaultCurrency: currency,
    successUrl: '/payment/success',
    cancelUrl: '/payment/cancel',
  };
  
  // Step 9: Add to spec
  spec.info['x-uigen-payments'] = paymentsConfig;
  await writeOpenAPISpec(specPath, spec);
  
  // Step 10: Provide setup instructions
  printSetupInstructions(provider, products);
}
```

## User Interaction Flow

```
AI: I noticed your API could benefit from payment integration. Would you like to add payment processing?

User: Yes

AI: Which payment provider would you like to use?
    1. Stripe (recommended for SaaS/subscriptions)
    2. PayPal (recommended for international/consumer)
    3. Square (recommended for in-person + online)

User: 1

AI: Which mode would you like to start with?
    1. Test/Sandbox mode (recommended for development)
    2. Live/Production mode

User: 1

AI: What is your default currency? (default: usd)

User: [Enter] (uses default)

AI: Would you like to define your pricing plans now?
    1. Yes, define products
    2. No, I'll add them later

User: 1

AI: Let's configure your first pricing plan.
    
    Product ID (e.g., 'pro-monthly'): 

User: pro-monthly

AI: Product name (e.g., 'Professional'):

User: Professional

AI: Product type:
    1. Subscription (recurring billing)
    2. One-time (single payment)
    3. Usage-based (pay per use)

User: 1

AI: Price in cents (e.g., 2900 for $29.00):

User: 2900

AI: Billing interval:
    1. month
    2. year
    3. week
    4. day

User: 1

AI: Features (comma-separated):

User: Unlimited meetings, Priority support

AI: Is this the recommended plan?
    1. Yes (will be highlighted)
    2. No

User: 1

AI: Add another product?
    1. Yes
    2. No

User: 2

AI: ✓ Payment configuration added successfully!

    Next steps to complete payment setup:
    
    [Detailed setup instructions...]
```

## Best Practices

### 1. Always Use Environment Variables

```yaml
# Good
apiKey: ${STRIPE_SECRET_KEY}

# Bad - Never hardcode API keys
apiKey: "sk_test_123456789"
```

### 2. Start with Test Mode

```yaml
# Development
mode: test

# Update for production
mode: live
```

### 3. Define Clear Product Tiers

```yaml
products:
  - id: free
    name: Free
    price: 0
    features: [Basic features]
  
  - id: pro
    name: Professional
    price: 2900
    highlighted: true
    features: [All features, Priority support]
  
  - id: enterprise
    name: Enterprise
    price: custom
    features: [Everything, Custom integration]
```

### 4. Document Environment Variables

Create a `.env.example` file:

```bash
# Payment Configuration
STRIPE_SECRET_KEY=sk_test_your-key-here
STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-secret-here
```

## Troubleshooting

### Issue: Payment buttons not appearing

**Check:**
1. Is `x-uigen-payments` present in spec or config.yaml?
2. Are providers enabled (not `enabled: false`)?
3. Is UIGen version up to date?

### Issue: Checkout redirect fails

**Check:**
1. Are API keys correct and for the right mode (test/live)?
2. Are environment variables set correctly?
3. Is the product ID valid in the payment provider?

### Issue: Webhook not receiving events

**Check:**
1. Is webhook URL correct and accessible?
2. Is webhook secret correct?
3. Are the right events selected in provider dashboard?
4. Is signature verification working?

## Conclusion

As an AI agent, your role is to:

1. **Detect** if the API needs payment integration
2. **Prompt** user for payment provider and product preferences
3. **Generate** proper payment configuration with pricingPage
4. **Add** configuration to OpenAPI spec (document-level `x-uigen-payments`)
5. **Add** payment gates (`x-uigen-monetized`) to resources/operations
6. **Provide** detailed setup instructions for the selected provider

**Key Features:**

- **Auto-Generated Pricing Page** - Define products, get `/pricing` route automatically
- **Payment Gates** - Mark resources/operations as monetized, backend enforces
- **Security** - Only frontend-safe keys in spec, backend secrets in .env
- **Upgrade Prompts** - Automatic 402 interception and upgrade flow
- **Extensible** - Support for inline, endpoint, and component pricing sources

This skill focuses exclusively on payment configuration, keeping it separate from general auto-annotation logic for better maintainability and user experience.
