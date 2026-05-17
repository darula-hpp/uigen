---
title: PayPal Setup Guide
description: Configure PayPal payment processing in your UIGen application
---

# PayPal Setup Guide

This guide walks you through setting up PayPal as a payment provider in your UIGen application.

## Prerequisites

- A PayPal Business account
- Access to the PayPal Developer Dashboard
- Your UIGen application with payment configuration

## Step 1: Create PayPal App

1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Log in with your PayPal Business account
3. Navigate to **Apps & Credentials**
4. Click **Create App**
5. Enter your app name (e.g., "My UIGen App")
6. Select **Merchant** as the app type
7. Click **Create App**

## Step 2: Get API Credentials

### Sandbox Credentials (for testing)

1. In your app dashboard, ensure **Sandbox** is selected
2. Copy your **Client ID** (starts with `A...`)
3. Click **Show** under **Secret** and copy the **Client Secret**
4. Save these credentials securely

### Live Credentials (for production)

1. Switch to **Live** mode in the dashboard
2. Copy your **Live Client ID**
3. Click **Show** under **Secret** and copy the **Live Client Secret**
4. Save these credentials securely

## Step 3: Configure Webhooks

1. In your app dashboard, scroll to **Webhooks**
2. Click **Add Webhook**
3. Enter your webhook URL: `https://your-api.com/webhooks/paypal`
4. Select the following event types:
   - `PAYMENT.SALE.COMPLETED`
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
5. Click **Save**
6. Copy the **Webhook ID** (you'll need this for verification)

## Step 4: Add Configuration to UIGen

Add PayPal configuration to your OpenAPI spec:

```yaml
info:
  title: My API
  version: 1.0.0
  x-uigen-payments:
    providers:
      - provider: paypal
        clientId: ${PAYPAL_CLIENT_ID}
        clientSecret: ${PAYPAL_CLIENT_SECRET}
        webhookSecret: ${PAYPAL_WEBHOOK_ID}
        mode: sandbox  # or 'live' for production
        currency: usd
        enabled: true
    products:
      - id: pro-monthly
        name: Professional
        type: subscription
        price: 2900
        interval: month
        features:
          - Unlimited access
          - Priority support
```

## Step 5: Set Environment Variables

Create or update your `.env` file:

```bash
# PayPal Configuration
PAYPAL_CLIENT_ID=your-client-id-here
PAYPAL_CLIENT_SECRET=your-client-secret-here
PAYPAL_WEBHOOK_ID=your-webhook-id-here
```

For production, use your live credentials:

```bash
# PayPal Production Configuration
PAYPAL_CLIENT_ID=your-live-client-id-here
PAYPAL_CLIENT_SECRET=your-live-client-secret-here
PAYPAL_WEBHOOK_ID=your-live-webhook-id-here
```

## Step 6: Create Subscription Plans

PayPal requires you to create subscription plans in the dashboard:

1. Go to **Products & Services** > **Subscriptions**
2. Click **Create Plan**
3. Fill in plan details:
   - **Plan name**: Professional
   - **Plan ID**: `pro-monthly` (must match your config)
   - **Billing cycle**: Monthly
   - **Price**: $29.00
4. Click **Save**
5. Copy the **Plan ID** and update your UIGen configuration

## Step 7: Implement Webhook Handler

Create a webhook endpoint in your backend to handle PayPal events:

### FastAPI Example

```python
from fastapi import APIRouter, Request, HTTPException
import os
import json
from paypalrestsdk import WebhookEvent

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/paypal")
async def paypal_webhook(request: Request):
    payload = await request.body()
    headers = dict(request.headers)
    
    # Verify webhook signature
    webhook_id = os.getenv('PAYPAL_WEBHOOK_ID')
    
    try:
        # PayPal webhook verification
        event = json.loads(payload)
        event_type = event.get('event_type')
        
        # Handle different event types
        if event_type == 'PAYMENT.SALE.COMPLETED':
            sale = event['resource']
            # Grant access to user
            await grant_access(sale['custom_id'], sale['id'])
        
        elif event_type == 'BILLING.SUBSCRIPTION.CREATED':
            subscription = event['resource']
            # Activate subscription
            await activate_subscription(subscription['custom_id'], subscription['id'])
        
        elif event_type == 'BILLING.SUBSCRIPTION.CANCELLED':
            subscription = event['resource']
            # Revoke access
            await revoke_access(subscription['custom_id'])
        
        return {"status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Express.js Example

```javascript
const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');

const router = express.Router();

router.post('/webhooks/paypal', express.json(), async (req, res) => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const event = req.body;
  
  try {
    // Verify webhook (implement verification logic)
    
    // Handle event types
    switch (event.event_type) {
      case 'PAYMENT.SALE.COMPLETED':
        const sale = event.resource;
        // Grant access
        await grantAccess(sale.custom_id, sale.id);
        break;
      
      case 'BILLING.SUBSCRIPTION.CREATED':
        const subscription = event.resource;
        // Activate subscription
        await activateSubscription(subscription.custom_id, subscription.id);
        break;
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        const cancelledSub = event.resource;
        // Revoke access
        await revokeAccess(cancelledSub.custom_id);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router;
```

## Step 8: Test Your Integration

### Using PayPal Sandbox

1. Ensure your environment variables use sandbox credentials
2. Set `mode: sandbox` in your configuration
3. Run your application: `uigen serve openapi.yaml`
4. Navigate to your pricing page
5. Click a payment button
6. Log in with a PayPal sandbox test account
7. Complete the payment flow
8. Verify your webhook receives the event

### Create Test Accounts

1. Go to [PayPal Sandbox Accounts](https://developer.paypal.com/dashboard/accounts)
2. Click **Create Account**
3. Select **Personal** (for buyer) or **Business** (for seller)
4. Fill in details and create
5. Use these accounts for testing

### Test Account Credentials

PayPal provides default test accounts:
- **Buyer**: `sb-buyer@personal.example.com`
- **Seller**: `sb-seller@business.example.com`

Check your dashboard for the passwords.

## Step 9: Go Live

When ready for production:

1. Complete PayPal's business verification process
2. Switch to **Live** mode in the PayPal dashboard
3. Get your live API credentials
4. Update environment variables with live credentials
5. Update configuration: `mode: live`
6. Create live webhook endpoint
7. Create live subscription plans
8. Test with real PayPal accounts

## Configuration Reference

### Provider Configuration

```typescript
{
  provider: 'paypal',
  clientId: string,        // PayPal Client ID
  clientSecret: string,    // PayPal Client Secret
  webhookSecret: string,   // PayPal Webhook ID
  mode: 'sandbox' | 'live',
  currency: string,        // Default: 'usd'
  enabled: boolean         // Default: true
}
```

### Supported Currencies

PayPal supports 25+ currencies including:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- JPY (Japanese Yen)

See [PayPal Currency Codes](https://developer.paypal.com/docs/reports/reference/paypal-supported-currencies/) for the complete list.

### Supported Payment Types

- ✅ **One-time payments** - Single purchases
- ✅ **Subscriptions** - Recurring billing
- ❌ **Usage-based** - Not supported by PayPal

## Troubleshooting

### Issue: "Invalid client credentials"

**Solution:**
- Verify your Client ID and Client Secret are correct
- Ensure you're using the right credentials for your mode (sandbox vs live)
- Check that environment variables are set correctly

### Issue: Webhook not receiving events

**Solution:**
- Verify webhook URL is publicly accessible
- Check that webhook ID is correct
- Ensure selected event types include the ones you need
- Check your server logs for incoming requests

### Issue: Subscription plan not found

**Solution:**
- Verify the plan ID in your config matches the plan ID in PayPal
- Ensure the plan is active in PayPal dashboard
- Check that you're using the right mode (sandbox vs live)

### Issue: Payment button redirects to error page

**Solution:**
- Check browser console for errors
- Verify API credentials are valid
- Ensure the product ID exists in PayPal
- Check that the currency is supported

## Best Practices

### 1. Use Sandbox for Development

Always test with sandbox credentials before going live:

```yaml
mode: sandbox
clientId: ${PAYPAL_SANDBOX_CLIENT_ID}
```

### 2. Implement Proper Error Handling

```typescript
<PaymentButton
  productId="pro-monthly"
  onError={(error) => {
    console.error('Payment failed:', error);
    // Show user-friendly error message
  }}
/>
```

### 3. Verify Webhooks

Always verify webhook signatures to prevent fraud:

```python
def verify_paypal_webhook(payload, headers, webhook_id):
    # Implement PayPal webhook verification
    # See: https://developer.paypal.com/docs/api/webhooks/v1/
    pass
```

### 4. Handle All Subscription States

```python
SUBSCRIPTION_STATES = {
    'ACTIVE': 'active',
    'SUSPENDED': 'suspended',
    'CANCELLED': 'cancelled',
    'EXPIRED': 'expired'
}
```

### 5. Store Subscription IDs

Always store PayPal subscription IDs in your database for future reference:

```python
class User:
    paypal_subscription_id: str
    subscription_status: str
    subscription_plan: str
```

## Resources

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api/webhooks/v1/)
- [PayPal Sandbox Testing](https://developer.paypal.com/docs/api-basics/sandbox/)
- [UIGen Payment Security](/payments/security)

## Next Steps

- [Implement Webhooks](/payments/webhooks) - Handle payment events
- [Security Best Practices](/payments/security) - Secure your integration
- [Payment Overview](/payments/overview) - Learn about other providers

