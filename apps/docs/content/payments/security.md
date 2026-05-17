---
title: Payment Security Best Practices
description: Keep your payment integration secure and PCI compliant
---

# Payment Security Best Practices

Security is critical when handling payments. This guide covers best practices for keeping your UIGen payment integration secure and PCI compliant.

## API Key Management

### ✅ DO: Use Environment Variables

**Always** store API keys in environment variables, never in code:

```yaml
# Good ✅
x-uigen-payments:
  providers:
    - provider: stripe
      apiKey: ${STRIPE_SECRET_KEY}
      publishableKey: ${STRIPE_PUBLISHABLE_KEY}
```

```yaml
# Bad ❌ - Never do this!
x-uigen-payments:
  providers:
    - provider: stripe
      apiKey: "sk_live_abc123..."
      publishableKey: "pk_live_xyz789..."
```

### ✅ DO: Use Different Keys for Test and Production

Maintain separate API keys for development and production:

```bash
# Development (.env.development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Production (.env.production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### ✅ DO: Rotate Keys Regularly

Rotate your API keys periodically (every 90 days recommended):

1. Generate new keys in provider dashboard
2. Update environment variables
3. Deploy with new keys
4. Revoke old keys after verification

### ❌ DON'T: Commit Keys to Version Control

Add `.env` to your `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# API keys
*.key
*.pem
```

Provide a `.env.example` template instead:

```bash
# .env.example
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

## Webhook Security

### ✅ DO: Verify Webhook Signatures

**Always** verify webhook signatures to ensure requests are from your payment provider:

```python
# Stripe example
import stripe

def verify_stripe_webhook(payload, signature, secret):
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, secret
        )
        return event
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")
```

### ✅ DO: Use HTTPS for Webhooks

**Always** use HTTPS for webhook endpoints in production:

```yaml
# Good ✅
webhookUrl: https://api.example.com/webhooks/stripe

# Bad ❌
webhookUrl: http://api.example.com/webhooks/stripe
```

### ✅ DO: Handle Idempotency

Webhooks may be sent multiple times. Use idempotency keys to prevent duplicate processing:

```python
processed_events = set()

async def handle_webhook(event):
    event_id = event['id']
    
    # Check if already processed
    if event_id in processed_events:
        return {"status": "already_processed"}
    
    # Process event
    await process_event(event)
    
    # Mark as processed
    processed_events.add(event_id)
    
    return {"status": "success"}
```

### ❌ DON'T: Trust Webhook Data Without Verification

Never process webhook data without signature verification:

```python
# Bad ❌ - Don't do this!
@app.post("/webhooks/stripe")
async def webhook(data: dict):
    # Processing data without verification
    await grant_access(data['customer_id'])
```

## PCI Compliance

### ✅ DO: Use Provider-Hosted Checkout

UIGen uses provider-hosted checkout pages, which means:
- Card data never touches your servers
- You don't need PCI certification
- Provider handles all card security

```typescript
// UIGen automatically redirects to provider checkout
<PaymentButton productId="pro-monthly">
  Subscribe
</PaymentButton>
```

### ❌ DON'T: Store Card Data

**Never** store credit card numbers, CVV codes, or full card data:

```python
# Bad ❌ - Never do this!
user.card_number = "4242424242424242"
user.cvv = "123"
user.save()
```

Instead, store only:
- Customer ID from payment provider
- Last 4 digits (if needed for display)
- Card brand (Visa, Mastercard, etc.)

```python
# Good ✅
user.stripe_customer_id = "cus_abc123"
user.card_last4 = "4242"
user.card_brand = "visa"
user.save()
```

### ✅ DO: Use Tokenization

If you need to collect card data, use provider SDKs for tokenization:

```javascript
// Stripe.js example (client-side)
const stripe = Stripe('pk_test_...');
const {token} = await stripe.createToken(cardElement);

// Send only the token to your server
await fetch('/api/save-card', {
  method: 'POST',
  body: JSON.stringify({token: token.id})
});
```

## HTTPS and TLS

### ✅ DO: Enforce HTTPS in Production

UIGen validates that payment URLs use HTTPS (except localhost):

```yaml
# Good ✅
successUrl: https://app.example.com/payment/success
cancelUrl: https://app.example.com/payment/cancel

# Bad ❌ (will fail validation in production)
successUrl: http://app.example.com/payment/success
```

### ✅ DO: Use TLS 1.2 or Higher

Ensure your server supports TLS 1.2 or higher:

```nginx
# Nginx example
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

## Access Control

### ✅ DO: Verify User Ownership

Always verify that users can only access their own payment data:

```python
async def get_subscription(subscription_id: str, current_user: User):
    subscription = await db.get_subscription(subscription_id)
    
    # Verify ownership
    if subscription.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return subscription
```

### ✅ DO: Implement Rate Limiting

Protect payment endpoints from abuse:

```python
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@app.post("/api/checkout")
@limiter.limit("5/minute")  # Max 5 checkout attempts per minute
async def create_checkout(request: Request):
    # Create checkout session
    pass
```

### ✅ DO: Log Payment Events

Keep detailed logs of all payment events:

```python
import logging

logger = logging.getLogger(__name__)

async def handle_payment_succeeded(invoice):
    logger.info(
        "Payment succeeded",
        extra={
            "customer_id": invoice['customer'],
            "amount": invoice['amount_paid'],
            "invoice_id": invoice['id'],
            "timestamp": datetime.now()
        }
    )
```

## Error Handling

### ✅ DO: Handle Errors Gracefully

Don't expose sensitive information in error messages:

```python
# Good ✅
try:
    await process_payment(customer_id)
except Exception as e:
    logger.error(f"Payment processing failed: {e}")
    raise HTTPException(
        status_code=500,
        detail="Payment processing failed. Please try again."
    )
```

```python
# Bad ❌
try:
    await process_payment(customer_id)
except Exception as e:
    # Exposing internal details
    raise HTTPException(
        status_code=500,
        detail=f"Database error: {str(e)}"
    )
```

### ✅ DO: Validate Input

Validate all payment-related input:

```python
from pydantic import BaseModel, validator

class CheckoutRequest(BaseModel):
    product_id: str
    customer_id: str
    
    @validator('product_id')
    def validate_product_id(cls, v):
        if not v.startswith('price_'):
            raise ValueError('Invalid product ID')
        return v
```

## Monitoring and Alerts

### ✅ DO: Monitor Failed Payments

Set up alerts for failed payments:

```python
async def handle_payment_failed(invoice):
    customer_id = invoice['customer']
    amount = invoice['amount_due']
    
    # Log failure
    logger.error(f"Payment failed for customer {customer_id}")
    
    # Send alert
    await send_alert(
        f"Payment failed: ${amount/100} for customer {customer_id}"
    )
    
    # Notify customer
    await send_email(customer_id, "payment_failed")
```

### ✅ DO: Track Suspicious Activity

Monitor for unusual patterns:

```python
async def check_suspicious_activity(customer_id: str):
    # Check for multiple failed attempts
    failed_attempts = await db.count_failed_payments(
        customer_id,
        since=datetime.now() - timedelta(hours=1)
    )
    
    if failed_attempts > 3:
        logger.warning(f"Suspicious activity: {customer_id}")
        await flag_for_review(customer_id)
```

### ✅ DO: Set Up Uptime Monitoring

Monitor your webhook endpoints:

```yaml
# Example: UptimeRobot configuration
monitors:
  - name: Stripe Webhook
    url: https://api.example.com/webhooks/stripe
    type: HTTP
    interval: 5  # minutes
    alert_contacts:
      - email: alerts@example.com
```

## Data Protection

### ✅ DO: Encrypt Sensitive Data

Encrypt sensitive payment data at rest:

```python
from cryptography.fernet import Fernet

# Generate key (store securely)
key = Fernet.generate_key()
cipher = Fernet(key)

# Encrypt customer ID
encrypted_id = cipher.encrypt(customer_id.encode())

# Decrypt when needed
decrypted_id = cipher.decrypt(encrypted_id).decode()
```

### ✅ DO: Implement Data Retention Policies

Delete old payment data according to your retention policy:

```python
async def cleanup_old_payment_data():
    # Delete payment records older than 7 years
    cutoff_date = datetime.now() - timedelta(days=7*365)
    
    await db.delete_payments(
        where={"created_at": {"$lt": cutoff_date}}
    )
```

### ✅ DO: Comply with GDPR/CCPA

Implement data deletion for user requests:

```python
async def delete_user_payment_data(user_id: str):
    # Delete from database
    await db.delete_user_payments(user_id)
    
    # Delete from payment provider
    customer = await get_stripe_customer(user_id)
    await stripe.Customer.delete(customer.id)
    
    logger.info(f"Deleted payment data for user {user_id}")
```

## Testing Security

### ✅ DO: Test Webhook Signature Verification

```python
def test_webhook_signature_verification():
    # Test with invalid signature
    with pytest.raises(HTTPException) as exc:
        verify_webhook(payload, "invalid_signature", secret)
    
    assert exc.value.status_code == 400
```

### ✅ DO: Test Access Control

```python
def test_subscription_access_control():
    # User A tries to access User B's subscription
    response = client.get(
        f"/api/subscriptions/{user_b_subscription_id}",
        headers={"Authorization": f"Bearer {user_a_token}"}
    )
    
    assert response.status_code == 403
```

### ✅ DO: Perform Security Audits

Regular security audits:
- Review API key usage
- Check for exposed secrets
- Verify HTTPS enforcement
- Test webhook security
- Review access controls

## Incident Response

### ✅ DO: Have an Incident Response Plan

1. **Detect** - Monitor for security incidents
2. **Contain** - Revoke compromised keys immediately
3. **Investigate** - Determine scope of breach
4. **Notify** - Inform affected users if required
5. **Recover** - Restore normal operations
6. **Learn** - Update security practices

### ✅ DO: Revoke Compromised Keys Immediately

If API keys are compromised:

1. Generate new keys in provider dashboard
2. Update environment variables
3. Deploy immediately
4. Revoke old keys
5. Review logs for suspicious activity
6. Notify users if necessary

## Compliance Checklist

- [ ] API keys stored in environment variables
- [ ] Webhook signatures verified
- [ ] HTTPS enforced in production
- [ ] No card data stored
- [ ] Access control implemented
- [ ] Rate limiting enabled
- [ ] Error handling doesn't expose secrets
- [ ] Logging implemented
- [ ] Monitoring and alerts set up
- [ ] Data encryption at rest
- [ ] Data retention policy implemented
- [ ] GDPR/CCPA compliance
- [ ] Security tests written
- [ ] Incident response plan documented

## Resources

- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Stripe Security](https://stripe.com/docs/security)
- [PayPal Security](https://developer.paypal.com/docs/api-basics/security/)
- [GDPR Compliance](https://gdpr.eu/)

## Next Steps

- [Stripe Setup Guide](/payments/stripe-setup)
- [Webhook Implementation](/payments/webhooks)
- [Payment Overview](/payments/overview)
