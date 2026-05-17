---
title: Webhook Implementation Guide
description: Handle payment events securely with webhooks
---

# Webhook Implementation Guide

Webhooks are essential for handling payment events like successful payments, subscription cancellations, and failed charges. This guide shows you how to implement secure webhook handlers for all supported payment providers.

## Why Webhooks?

Payment providers use webhooks to notify your backend about important events:

- ✅ **Reliable** - Events are delivered even if the user closes their browser
- ✅ **Secure** - Cryptographically signed to prevent tampering
- ✅ **Asynchronous** - Don't block the payment flow
- ✅ **Complete** - Receive all payment lifecycle events

## Webhook Flow

```
Payment Provider → Your Webhook Endpoint → Verify Signature → Process Event → Update Database → Return 200 OK
```

## Stripe Webhooks

### Setup

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter URL: `https://your-api.com/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

### Implementation

#### FastAPI

```python
from fastapi import APIRouter, Request, HTTPException
import stripe
import os

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Set your secret key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    event_type = event['type']
    event_data = event['data']['object']
    
    if event_type == 'checkout.session.completed':
        # Payment successful
        session = event_data
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        
        # Grant access to user
        await grant_user_access(customer_id, subscription_id)
        
    elif event_type == 'customer.subscription.created':
        # New subscription
        subscription = event_data
        customer_id = subscription['customer']
        
        await activate_subscription(customer_id, subscription['id'])
        
    elif event_type == 'customer.subscription.updated':
        # Subscription updated (plan change, etc.)
        subscription = event_data
        customer_id = subscription['customer']
        status = subscription['status']
        
        await update_subscription_status(customer_id, status)
        
    elif event_type == 'customer.subscription.deleted':
        # Subscription cancelled
        subscription = event_data
        customer_id = subscription['customer']
        
        await revoke_user_access(customer_id)
        
    elif event_type == 'invoice.payment_succeeded':
        # Recurring payment successful
        invoice = event_data
        customer_id = invoice['customer']
        
        await extend_subscription(customer_id)
        
    elif event_type == 'invoice.payment_failed':
        # Payment failed
        invoice = event_data
        customer_id = invoice['customer']
        
        await notify_payment_failed(customer_id)
    
    return {"status": "success"}


# Helper functions
async def grant_user_access(customer_id: str, subscription_id: str):
    """Grant user access after successful payment"""
    # Update user in database
    user = await get_user_by_stripe_customer_id(customer_id)
    user.subscription_id = subscription_id
    user.subscription_status = 'active'
    user.subscription_start = datetime.now()
    await save_user(user)
    
    # Send welcome email
    await send_email(user.email, 'Welcome to Premium!')


async def revoke_user_access(customer_id: str):
    """Revoke user access after cancellation"""
    user = await get_user_by_stripe_customer_id(customer_id)
    user.subscription_status = 'cancelled'
    user.subscription_end = datetime.now()
    await save_user(user)
    
    # Send cancellation email
    await send_email(user.email, 'Subscription Cancelled')
```

#### Express.js

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

router.post('/webhooks/stripe', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await grantUserAccess(session.customer, session.subscription);
        break;
        
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await revokeUserAccess(subscription.customer);
        break;
        
      case 'invoice.payment_failed':
        const invoice = event.data.object;
        await notifyPaymentFailed(invoice.customer);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  }
);

module.exports = router;
```

## PayPal Webhooks

### Setup

1. Go to your app in [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Scroll to **Webhooks**
3. Click **Add Webhook**
4. Enter URL: `https://your-api.com/webhooks/paypal`
5. Select events:
   - `PAYMENT.SALE.COMPLETED`
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
6. Copy the **Webhook ID**

### Implementation

#### FastAPI

```python
from fastapi import APIRouter, Request, HTTPException
import os
import json
import hmac
import hashlib

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/paypal")
async def paypal_webhook(request: Request):
    payload = await request.body()
    headers = dict(request.headers)
    
    # Verify webhook (PayPal verification is more complex)
    webhook_id = os.getenv('PAYPAL_WEBHOOK_ID')
    
    try:
        event = json.loads(payload)
        event_type = event.get('event_type')
        resource = event.get('resource', {})
        
        # Handle different event types
        if event_type == 'PAYMENT.SALE.COMPLETED':
            # One-time payment completed
            sale_id = resource.get('id')
            custom_id = resource.get('custom_id')  # Your user ID
            
            await grant_user_access(custom_id, sale_id)
            
        elif event_type == 'BILLING.SUBSCRIPTION.CREATED':
            # Subscription created
            subscription_id = resource.get('id')
            custom_id = resource.get('custom_id')
            
            await activate_subscription(custom_id, subscription_id)
            
        elif event_type == 'BILLING.SUBSCRIPTION.UPDATED':
            # Subscription updated
            subscription_id = resource.get('id')
            status = resource.get('status')
            
            await update_subscription_status(subscription_id, status)
            
        elif event_type == 'BILLING.SUBSCRIPTION.CANCELLED':
            # Subscription cancelled
            subscription_id = resource.get('id')
            
            await revoke_subscription_access(subscription_id)
            
        elif event_type == 'BILLING.SUBSCRIPTION.SUSPENDED':
            # Subscription suspended (payment failed)
            subscription_id = resource.get('id')
            
            await suspend_subscription(subscription_id)
        
        return {"status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

#### Express.js

```javascript
const express = require('express');
const router = express.Router();

router.post('/webhooks/paypal', express.json(), async (req, res) => {
  const event = req.body;
  const eventType = event.event_type;
  const resource = event.resource || {};
  
  try {
    // Verify webhook (implement PayPal verification)
    
    switch (eventType) {
      case 'PAYMENT.SALE.COMPLETED':
        await grantUserAccess(resource.custom_id, resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.CREATED':
        await activateSubscription(resource.custom_id, resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await revokeSubscriptionAccess(resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await suspendSubscription(resource.id);
        break;
        
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router;
```

## Security Best Practices

### 1. Always Verify Signatures

Never trust webhook payloads without verification:

```python
# Good - Verify signature
event = stripe.Webhook.construct_event(payload, sig, secret)

# Bad - Trust payload blindly
event = json.loads(payload)  # ❌ Insecure!
```

### 2. Use HTTPS

Webhooks must use HTTPS in production:

```yaml
# Good
webhookUrl: https://api.example.com/webhooks/stripe

# Bad
webhookUrl: http://api.example.com/webhooks/stripe  # ❌ Insecure!
```

### 3. Return 200 Quickly

Process events asynchronously to avoid timeouts:

```python
@router.post("/stripe")
async def stripe_webhook(request: Request):
    # Verify signature
    event = verify_webhook(request)
    
    # Queue for async processing
    await queue_event_processing(event)
    
    # Return 200 immediately
    return {"status": "success"}
```

### 4. Handle Idempotency

Events may be delivered multiple times:

```python
async def process_event(event_id: str, event_type: str, data: dict):
    # Check if already processed
    if await is_event_processed(event_id):
        return
    
    # Process event
    await handle_event(event_type, data)
    
    # Mark as processed
    await mark_event_processed(event_id)
```

### 5. Log Everything

Keep detailed logs for debugging:

```python
import logging

logger = logging.getLogger(__name__)

@router.post("/stripe")
async def stripe_webhook(request: Request):
    logger.info(f"Received webhook: {request.headers.get('stripe-signature')[:20]}...")
    
    try:
        event = verify_webhook(request)
        logger.info(f"Event type: {event['type']}, ID: {event['id']}")
        
        await process_event(event)
        
        logger.info(f"Successfully processed event {event['id']}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        raise
```

## Testing Webhooks

### Stripe CLI

Install the Stripe CLI for local testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8000/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
```

### PayPal Webhook Simulator

Use PayPal's webhook simulator:

1. Go to [PayPal Webhooks](https://developer.paypal.com/dashboard/webhooks)
2. Click on your webhook
3. Click **Webhook Simulator**
4. Select event type
5. Click **Send Test**

### Manual Testing

Use curl to test your endpoint:

```bash
# Test with sample payload
curl -X POST http://localhost:8000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "customer": "cus_test123",
        "subscription": "sub_test123"
      }
    }
  }'
```

## Common Event Types

### Stripe

| Event | Description | Action |
|-------|-------------|--------|
| `checkout.session.completed` | Payment successful | Grant access |
| `customer.subscription.created` | New subscription | Activate subscription |
| `customer.subscription.updated` | Subscription changed | Update status |
| `customer.subscription.deleted` | Subscription cancelled | Revoke access |
| `invoice.payment_succeeded` | Recurring payment successful | Extend subscription |
| `invoice.payment_failed` | Payment failed | Notify user |

### PayPal

| Event | Description | Action |
|-------|-------------|--------|
| `PAYMENT.SALE.COMPLETED` | One-time payment completed | Grant access |
| `BILLING.SUBSCRIPTION.CREATED` | Subscription created | Activate subscription |
| `BILLING.SUBSCRIPTION.UPDATED` | Subscription updated | Update status |
| `BILLING.SUBSCRIPTION.CANCELLED` | Subscription cancelled | Revoke access |
| `BILLING.SUBSCRIPTION.SUSPENDED` | Payment failed | Suspend access |
| `BILLING.SUBSCRIPTION.EXPIRED` | Subscription expired | Revoke access |

## Error Handling

### Retry Logic

Payment providers retry failed webhooks:

- Stripe: Retries for up to 3 days
- PayPal: Retries for up to 10 days

Return appropriate status codes:

```python
@router.post("/stripe")
async def stripe_webhook(request: Request):
    try:
        event = verify_webhook(request)
        await process_event(event)
        return {"status": "success"}  # 200 OK
    except TemporaryError:
        # Retry later
        raise HTTPException(status_code=500)  # 500 triggers retry
    except PermanentError:
        # Don't retry
        raise HTTPException(status_code=400)  # 400 stops retries
```

### Dead Letter Queue

Store failed events for manual review:

```python
async def process_event(event: dict):
    try:
        await handle_event(event)
    except Exception as e:
        # Store in dead letter queue
        await store_failed_event(event, str(e))
        raise
```

## Monitoring

### Track Webhook Health

Monitor webhook delivery and processing:

```python
from prometheus_client import Counter, Histogram

webhook_received = Counter('webhook_received_total', 'Webhooks received', ['provider', 'event_type'])
webhook_processed = Counter('webhook_processed_total', 'Webhooks processed', ['provider', 'event_type', 'status'])
webhook_duration = Histogram('webhook_duration_seconds', 'Webhook processing time', ['provider'])

@router.post("/stripe")
async def stripe_webhook(request: Request):
    webhook_received.labels(provider='stripe', event_type=event['type']).inc()
    
    start_time = time.time()
    try:
        await process_event(event)
        webhook_processed.labels(provider='stripe', event_type=event['type'], status='success').inc()
    except Exception:
        webhook_processed.labels(provider='stripe', event_type=event['type'], status='error').inc()
        raise
    finally:
        duration = time.time() - start_time
        webhook_duration.labels(provider='stripe').observe(duration)
```

### Alert on Failures

Set up alerts for webhook failures:

```python
if failure_rate > 0.1:  # 10% failure rate
    send_alert("High webhook failure rate detected")
```

## Troubleshooting

### Issue: Webhook signature verification fails

**Solutions:**
- Verify webhook secret is correct
- Check that you're using raw request body (not parsed JSON)
- Ensure no middleware is modifying the request body
- Verify the signature header name is correct

### Issue: Webhooks not being received

**Solutions:**
- Check that webhook URL is publicly accessible
- Verify firewall allows incoming requests
- Check webhook is enabled in provider dashboard
- Review provider's webhook logs for delivery attempts

### Issue: Duplicate event processing

**Solutions:**
- Implement idempotency using event IDs
- Use database transactions
- Check for race conditions

### Issue: Webhook timeouts

**Solutions:**
- Return 200 immediately, process asynchronously
- Optimize database queries
- Use background job queue
- Increase timeout limits

## Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [PayPal Webhooks Documentation](https://developer.paypal.com/docs/api/webhooks/v1/)
- [Webhook Security Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [UIGen Payment Security](/payments/security)

## Next Steps

- [Security Best Practices](/payments/security) - Secure your integration
- [Stripe Setup](/payments/stripe-setup) - Configure Stripe
- [PayPal Setup](/payments/paypal-setup) - Configure PayPal

