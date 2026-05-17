"""
Webhook endpoints for payment processing.
"""
from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
import stripe
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None)
):
    """
    Handle Stripe webhook events.
    
    This endpoint receives webhook events from Stripe for payment processing.
    Events include:
    - checkout.session.completed: Payment successful
    - customer.subscription.created: New subscription
    - customer.subscription.updated: Subscription changed
    - customer.subscription.deleted: Subscription cancelled
    - invoice.payment_succeeded: Recurring payment successful
    - invoice.payment_failed: Payment failed
    
    Args:
        request: FastAPI request object
        stripe_signature: Stripe signature header for verification
        
    Returns:
        Success status
        
    Raises:
        HTTPException: If signature verification fails
    """
    payload = await request.body()
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    if not webhook_secret:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured, skipping verification")
        # In development, you might want to process without verification
        # In production, this should raise an error
        event_data = await request.json()
        event = stripe.Event.construct_from(event_data, stripe.api_key)
    else:
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, webhook_secret
            )
        except ValueError:
            # Invalid payload
            logger.error("Invalid webhook payload")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            logger.error("Invalid webhook signature")
            raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    event_type = event["type"]
    event_data = event["data"]["object"]
    
    logger.info(f"Received Stripe webhook: {event_type}")
    
    if event_type == "checkout.session.completed":
        # Payment successful
        session = event_data
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        
        logger.info(f"Payment successful for customer {customer_id}, subscription {subscription_id}")
        
        # TODO: Grant access to user
        # await grant_user_access(customer_id, subscription_id)
        
    elif event_type == "customer.subscription.created":
        # New subscription
        subscription = event_data
        customer_id = subscription["customer"]
        
        logger.info(f"New subscription created for customer {customer_id}")
        
        # TODO: Activate subscription
        # await activate_subscription(customer_id, subscription["id"])
        
    elif event_type == "customer.subscription.updated":
        # Subscription updated (plan change, etc.)
        subscription = event_data
        customer_id = subscription["customer"]
        status = subscription["status"]
        
        logger.info(f"Subscription updated for customer {customer_id}, status: {status}")
        
        # TODO: Update subscription status
        # await update_subscription_status(customer_id, status)
        
    elif event_type == "customer.subscription.deleted":
        # Subscription cancelled
        subscription = event_data
        customer_id = subscription["customer"]
        
        logger.info(f"Subscription cancelled for customer {customer_id}")
        
        # TODO: Revoke access
        # await revoke_user_access(customer_id)
        
    elif event_type == "invoice.payment_succeeded":
        # Recurring payment successful
        invoice = event_data
        customer_id = invoice["customer"]
        
        logger.info(f"Recurring payment successful for customer {customer_id}")
        
        # TODO: Extend subscription
        # await extend_subscription(customer_id)
        
    elif event_type == "invoice.payment_failed":
        # Payment failed
        invoice = event_data
        customer_id = invoice["customer"]
        
        logger.warning(f"Payment failed for customer {customer_id}")
        
        # TODO: Notify user of payment failure
        # await notify_payment_failed(customer_id)
    
    else:
        logger.info(f"Unhandled event type: {event_type}")
    
    return {"status": "success"}
