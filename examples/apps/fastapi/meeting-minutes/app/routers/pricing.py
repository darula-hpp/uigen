"""
Pricing plans endpoint for Meeting Minutes Pro.
Returns pricing plans for the application.
"""
from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/pricing", tags=["pricing"])


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
