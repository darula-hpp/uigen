---
title: Payment Integration Overview
description: Add payment processing and monetization to your UIGen application with Stripe, PayPal, or Square
---

# Payment Integration

UIGen provides built-in support for payment processing and monetization through popular payment providers. Add subscriptions, one-time payments, and usage-based billing to your application with just a few lines of configuration.

## Supported Providers

- **Stripe** - Best for SaaS and subscription businesses
- **PayPal** - Best for international and consumer payments
- **Square** - Best for in-person and online payments

## Quick Start

Add payment configuration to your OpenAPI spec:

```yaml
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
      - id: pro
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

That's it! UIGen will automatically generate:
- Auto-generated pricing page at `/pricing`
- Responsive pricing tables
- Payment buttons with loading states
- Subscription management UI
- Payment gates that show upgrade prompts when limits are exceeded

## Key Concepts

### Resource-Based Monetization

UIGen treats payments as a **resource**, similar to authentication. This means:

1. **Auto-Generated Pricing Page** - Define your products in the spec, get a pricing page automatically
2. **Payment Gates** - Mark resources or operations as monetized, backend enforces limits
3. **Upgrade Prompts** - When backend returns 402 Payment Required, frontend shows upgrade prompt
4. **Backend Enforcement** - Backend is the source of truth for payment enforcement

### Security Model

**Frontend-Safe Configuration:**
- Only `publishableKey` is exposed to the frontend (safe for public use)
- Backend secrets (`apiKey`, `webhookSecret`, `clientSecret`) stay in `.env`
- Backend enforces all payment requirements and returns 402 when limits exceeded

**Backend Configuration (in .env):**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Pricing Sources

UIGen supports three pricing source strategies:

1. **Inline (Current)** - Products defined directly in OpenAPI spec
2. **Endpoint (Future)** - Products fetched from backend API for dynamic pricing
3. **Component (Future)** - Fully custom pricing component via override system

## Features

### Multiple Payment Types
- **Subscriptions** - Recurring billing (monthly, yearly, etc.)
- **One-time payments** - Single purchases
- **Usage-based** - Pay per use (Stripe only)

### Automatic UI Generation
- Auto-generated pricing page at `/pricing`
- Responsive pricing tables with feature comparison
- Payment buttons with loading states
- Subscription management dashboard
- Upgrade prompts when limits exceeded
- Success/error handling

### Payment Gates
- **Resource-level gates** - Entire resource requires payment
- **Operation-level gates** - Specific operations require payment
- **Custom messages** - Show custom upgrade messages
- **Custom redirects** - Redirect to custom URLs on 402

### Security Built-in
- API keys in environment variables
- Only frontend-safe keys in spec
- Webhook signature verification
- Backend enforcement (frontend cannot bypass)
- HTTPS enforcement
- PCI compliance (no card data storage)

### Developer-Friendly
- TypeScript support
- React hooks (`usePaymentStatus`)
- Comprehensive error handling
- Test mode for development
- Extensible pricing sources

## How It Works

### 1. Configure Payments

Add `x-uigen-payments` annotation to your OpenAPI spec:

```yaml
x-uigen-payments:
  providers:
    - provider: stripe
      publishableKey: ${STRIPE_PUBLISHABLE_KEY}
      mode: test
  pricingPage:
    enabled: true
    source: inline
    products:
      - id: pro
        name: Professional
        type: subscription
        price: 2900
        interval: month
        features:
          - Unlimited access
          - Priority support
```

### 2. Mark Resources as Monetized

Add `x-uigen-monetized` to paths or operations:

```yaml
paths:
  /api/v1/meetings:
    x-uigen-monetized: true  # Entire resource requires payment
    
  /api/v1/templates:
    post:
      x-uigen-monetized: true  # Only creation requires payment
```

### 3. Backend Enforcement

Your backend enforces limits and returns 402 when exceeded:

```python
@router.post("/api/v1/meetings")
async def create_meeting(user: User):
    # Check user's plan
    if user.plan == "free" and user.meeting_count >= 10:
        raise HTTPException(
            status_code=402,
            detail="Upgrade to Professional to create more meetings"
        )
    
    # Create meeting
    return create_meeting(user)
```

### 4. Frontend Reacts

UIGen automatically:
- Intercepts 402 responses
- Shows upgrade prompt with custom message
- Links to `/pricing` page
- Handles user upgrade flow

## Runtime Flow

```
User attempts monetized operation
  ↓
API call to backend
  ↓
Backend checks user's plan/limits
  ↓
If exceeded: Backend returns 402 Payment Required
  ↓
Frontend intercepts 402
  ↓
Upgrade prompt shown with link to /pricing
  ↓
User clicks "View Plans"
  ↓
Navigates to auto-generated pricing page
  ↓
User selects plan and subscribes
  ↓
Backend webhook updates user's plan
  ↓
User can now access monetized features
```

## Next Steps

- [Payment Gates Guide](/payments/payment-gates) - Learn about resource and operation-level gates
- [Stripe Setup Guide](/payments/stripe-setup) - Get started with Stripe
- [PayPal Setup Guide](/payments/paypal-setup) - Get started with PayPal
- [Webhook Implementation](/payments/webhooks) - Handle payment events
- [Security Best Practices](/payments/security) - Keep your integration secure

## Example

See the [Meeting Minutes example app](https://github.com/darula-hpp/uigen/tree/main/examples/apps/fastapi/meeting-minutes) for a complete implementation with Stripe integration and payment gates.
