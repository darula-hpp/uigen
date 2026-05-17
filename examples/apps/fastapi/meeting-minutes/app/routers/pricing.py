"""
Pricing plans endpoint for Meeting Minutes Pro.
Returns pricing plans for the application.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
import stripe
import os
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/pricing", tags=["pricing"])

# Initialize Stripe with API key from environment
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


class PricingPlan(BaseModel):
    """Pricing plan model"""
    id: str
    name: str
    description: str
    type: str  # "one-time", "subscription", or "usage-based"
    price: int | str  # in cents or "custom"
    interval: str | None = None
    features: List[str]
    highlighted: bool = False


class CreateCheckoutRequest(BaseModel):
    """Request model for creating a checkout session"""
    product_id: str
    success_url: str
    cancel_url: str


class CreateCheckoutResponse(BaseModel):
    """Response model for checkout session creation"""
    checkout_url: str
    session_id: str


@router.get("/plans", response_model=List[PricingPlan])
async def get_pricing_plans():
    """
    Get all available pricing plans.
    
    Returns a list of pricing plans with their features and pricing.
    This endpoint is public and does not require authentication.
    """
    return [
        {
            "id": "free",
            "name": "Free",
            "description": "Get started with basic features",
            "type": "subscription",
            "price": 0,
            "interval": "month",
            "features": [
                "Up to 10 meetings per month",
                "3 custom templates",
                "Basic AI generation",
                "PDF export",
                "Email support"
            ],
            "highlighted": False
        },
        {
            "id": "pro",
            "name": "Professional",
            "description": "Full access to all features",
            "type": "subscription",
            "price": 2900,  # $29.00
            "interval": "month",
            "features": [
                "Unlimited meetings",
                "Unlimited templates",
                "Unlimited AI generation",
                "Priority support",
                "Advanced analytics",
                "Team collaboration"
            ],
            "highlighted": True
        },
        {
            "id": "enterprise",
            "name": "Enterprise",
            "description": "Custom solutions for large teams",
            "type": "subscription",
            "price": "custom",
            "interval": None,
            "features": [
                "Everything in Professional",
                "Custom integrations",
                "Dedicated support",
                "SLA guarantee",
                "On-premise deployment",
                "Training & onboarding"
            ],
            "highlighted": False
        }
    ]


@router.post("/create-checkout", response_model=CreateCheckoutResponse)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create a Stripe checkout session for a pricing plan.
    
    This endpoint creates a Stripe checkout session and returns the URL
    to redirect the user to complete payment.
    
    Requires authentication.
    """
    try:
        # Map product IDs to Stripe price IDs
        # In production, these would come from environment variables or database
        price_id_map = {
            "free": None,  # Free plan doesn't need checkout
            "pro": os.getenv("STRIPE_PRICE_ID_PRO"),
            "enterprise": None,  # Enterprise requires custom quote
        }
        
        # Validate product ID
        if request.product_id not in price_id_map:
            raise HTTPException(status_code=400, detail="Invalid product ID")
        
        # Handle free plan
        if request.product_id == "free":
            raise HTTPException(
                status_code=400,
                detail="Free plan does not require checkout"
            )
        
        # Handle enterprise plan
        if request.product_id == "enterprise":
            raise HTTPException(
                status_code=400,
                detail="Enterprise plan requires contacting sales"
            )
        
        # Get Stripe price ID
        price_id = price_id_map[request.product_id]
        if not price_id:
            raise HTTPException(
                status_code=500,
                detail=f"Stripe price ID not configured for {request.product_id}"
            )
        
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            customer_email=current_user.email,
            client_reference_id=str(current_user.id),
            metadata={
                "user_id": str(current_user.id),
                "product_id": request.product_id,
            },
            allow_promotion_codes=True,
        )
        
        return CreateCheckoutResponse(
            checkout_url=session.url,
            session_id=session.id
        )
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")
