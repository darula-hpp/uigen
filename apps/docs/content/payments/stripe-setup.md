---
title: Stripe Setup Guide
description: Complete guide to integrating Stripe payments with UIGen
---

# Stripe Setup Guide

Stripe is the recommended payment provider for SaaS applications and subscription businesses. This guide will walk you through setting up Stripe with UIGen.

## Prerequisites

- A Stripe account ([sign up here](https://dashboard.stripe.com/register))
- UIGen installed and configured
- An OpenAPI spec for your API

## Step 1: Get Your API Keys

### Test Mode Keys (Development)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **Test mode** (toggle in the top right)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Copy your **Publishable key** (starts with `pk_test_`)

### Live Mode Keys (Production)

1. Switch to **Live mode** in the Stripe Dashboard
2. Go to [API Keys](https://dashboard.stripe.com/apikeys)
3. Copy your **Secret key** (starts with `sk_live_`)
4. Copy your **Publishable key** (starts with `pk_live_`)

## Step 2: Configure Webhooks

Webhooks allow Stripe to notify your backend when payment events occur.

1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set **Endpoint URL**: `https://your-api.com/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

## Step 3: Set Environment Variables

Create a `.env` file in your project root:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Important**: Never commit your `.env` file to version control!

## Step 4: Add Payment Configuration

Add the `x-uigen-payments` annotation to your OpenAPI spec:

```yaml
info:
  title: My API
  version: 1.0.0
  x-uigen-payments:
    providers:
      - provider: stripe
        apiKey: ${STRIPE_SECRET_KEY}
        publishableKey: ${STRIPE_PUBLISHABLE_KEY}
        webhookSecret: ${STRIPE_WEBHOOK_SECRET}
        mode: test
        currency: usd
    products:
      - id: free
        name: Free
        type: subscription
        price: 0
        interval: month
        features:
          - Up to 10 projects
          - Basic support
      
      - id: pro-monthly
        name: Professional
        type: subscription
        price: 2900
        interval: month
        highlighted: true
        features:
          - Unlimited projects
          - Priority support
          - Advanced features
      
      - id: enterprise
        name: Enterprise
        type: subscription
        price: custom
        features:
          - Everything in Professional
          - Custom integrations
          - Dedicated support
          - SLA guarantee
    
    defaultCurrency: usd
    successUrl: /payment/success
    cancelUrl: /payment/cancel
```

## Step 5: Create Products in Stripe

For each product in your configuration, create a corresponding product in Stripe:

1. Go to [Products](https://dashboard.stripe.com/products)
2. Click **Add product**
3. Fill in product details:
   - **Name**: Professional
   - **Description**: Full access to all features
4. Set pricing:
   - **Price**: $29.00
   - **Billing period**: Monthly
5. Click **Save product**
6. Copy the **Price ID** (starts with `price_`)

**Note**: Use the Price ID when creating checkout sessions in your backend.

## Step 6: Implement Webhook Handler

Create a webhook endpoint in your backend to handle Stripe events:

### FastAPI Example

```python
from fastapi import APIRouter, Request, HTTPException
import stripe
import os

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail=str(e))
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail=str(e))
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        await handle_checkout_completed(session)
    
    elif event['type'] == 'customer.subscription.created':
        subscription = event['data']['object']
        await handle_subscription_created(subscription)
    
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        await handle_subscription_updated(subscription)
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        await handle_subscription_deleted(subscription)
    
    elif event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        await handle_payment_succeeded(invoice)
    
    elif event['type'] == 'invoice.payment_failed':
        invoice = event['data']['object']
        await handle_payment_failed(invoice)
    
    return {"status": "success"}

async def handle_checkout_completed(session):
    """Grant access to user after successful checkout"""
    customer_id = session['customer']
    subscription_id = session['subscription']
    
    # Update user in database
    # Grant access to premium features
    print(f"Checkout completed for customer {customer_id}")

async def handle_subscription_created(subscription):
    """Handle new subscription"""
    customer_id = subscription['customer']
    status = subscription['status']
    
    print(f"Subscription created for customer {customer_id}: {status}")

async def handle_subscription_updated(subscription):
    """Handle subscription updates (plan changes, etc.)"""
    customer_id = subscription['customer']
    status = subscription['status']
    
    print(f"Subscription updated for customer {customer_id}: {status}")

async def handle_subscription_deleted(subscription):
    """Revoke access when subscription is canceled"""
    customer_id = subscription['customer']
    
    # Update user in database
    # Revoke access to premium features
    print(f"Subscription deleted for customer {customer_id}")

async def handle_payment_succeeded(invoice):
    """Handle successful payment"""
    customer_id = invoice['customer']
    amount = invoice['amount_paid']
    
    print(f"Payment succeeded for customer {customer_id}: ${amount/100}")

async def handle_payment_failed(invoice):
    """Handle failed payment"""
    customer_id = invoice['customer']
    
    # Notify user about failed payment
    print(f"Payment failed for customer {customer_id}")
```

### Express.js Example

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.post('/webhooks/stripe', 
  express.raw({type: 'application/json'}), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      
      case 'customer.subscription.created':
        const subscription = event.data.object;
        await handleSubscriptionCreated(subscription);
        break;
      
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({received: true});
  }
);

async function handleCheckoutCompleted(session) {
  // Grant access to user
  console.log('Checkout completed:', session.id);
}

async function handleSubscriptionCreated(subscription) {
  // Handle new subscription
  console.log('Subscription created:', subscription.id);
}

async function handleSubscriptionDeleted(subscription) {
  // Revoke access
  console.log('Subscription deleted:', subscription.id);
}
```

## Step 7: Test the Integration

### Using Stripe Test Cards

Stripe provides test card numbers for different scenarios:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Insufficient funds |

### Test Flow

1. Start your API with UIGen: `uigen serve openapi.yaml`
2. Navigate to the pricing page
3. Click "Subscribe" on a plan
4. Use test card: `4242 4242 4242 4242`
5. Use any future expiry date (e.g., `12/34`)
6. Use any 3-digit CVC (e.g., `123`)
7. Complete the checkout
8. Verify webhook is called in your logs
9. Verify user gets access in your database

## Step 8: Go Live

When you're ready for production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Get Live API Keys** (start with `sk_live_` and `pk_live_`)
3. **Update Environment Variables**:
   ```bash
   STRIPE_SECRET_KEY=sk_live_your_live_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
   ```
4. **Update Configuration**:
   ```yaml
   mode: live  # Change from 'test' to 'live'
   ```
5. **Create Live Webhook Endpoint** in Stripe Dashboard
6. **Test with Real Payment Methods**

## Advanced Features

### Customer Portal

Stripe provides a customer portal for managing subscriptions:

```typescript
import { PaymentStrategyFactory } from '@uigen-dev/react';

const strategy = PaymentStrategyFactory.create('stripe');
await strategy.initialize(config);

// Get portal URL
const portalUrl = await strategy.getCustomerPortalUrl(customerId);

// Redirect user
window.location.href = portalUrl;
```

UIGen's `SubscriptionManager` component automatically includes a "Manage Subscription" button that opens the customer portal.

### Proration

When users upgrade or downgrade, Stripe automatically prorates the charges:

```typescript
await strategy.updateSubscription(subscriptionId, {
  priceId: 'price_new_plan',
  prorate: true  // Enable proration
});
```

### Trial Periods

Offer free trials to new subscribers:

```yaml
products:
  - id: pro-monthly
    name: Professional
    price: 2900
    interval: month
    metadata:
      trial_period_days: 14  # 14-day free trial
```

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
- Is your webhook URL publicly accessible?
- Is the webhook secret correct?
- Are you using the raw request body (not parsed JSON)?
- Are the correct events selected in Stripe Dashboard?

**Test webhook locally:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8000/webhooks/stripe
```

### Payment Fails Silently

**Check:**
- Are API keys correct and for the right mode (test/live)?
- Is the Price ID valid in Stripe?
- Check browser console for errors
- Check Stripe Dashboard logs

### Customer Portal Not Working

**Check:**
- Customer portal is only available in Stripe (not PayPal/Square)
- Customer must have an active subscription
- Customer ID must be valid

## Best Practices

1. **Always verify webhooks** - Never trust webhook data without signature verification
2. **Handle idempotency** - Webhooks may be sent multiple times
3. **Log everything** - Keep detailed logs of all payment events
4. **Test thoroughly** - Use all test card scenarios
5. **Monitor in production** - Set up alerts for failed payments
6. **Keep keys secure** - Never commit API keys to version control

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

## Next Steps

- [Webhook Implementation Guide](/payments/webhooks)
- [Security Best Practices](/payments/security)
- [PayPal Setup Guide](/payments/paypal-setup)
