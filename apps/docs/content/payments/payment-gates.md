---
title: Payment Gates
description: Control access to resources and operations with payment gates
---

# Payment Gates

Payment gates allow you to control access to specific resources or operations based on user subscription status. UIGen provides a flexible system for marking resources and operations as monetized, with backend enforcement and automatic upgrade prompts.

## Overview

Payment gates work through a simple flow:

1. **Mark resources/operations as monetized** in your OpenAPI spec
2. **Backend enforces limits** and returns 402 Payment Required when exceeded
3. **Frontend intercepts 402** and shows upgrade prompt
4. **User upgrades** via auto-generated pricing page

## Resource-Level Gates

Mark an entire resource as monetized to require payment for all operations:

```yaml
paths:
  /api/v1/meetings:
    x-uigen-monetized: true
    get:
      summary: List meetings
      # Requires payment
    post:
      summary: Create meeting
      # Requires payment
    
  /api/v1/meetings/{id}:
    x-uigen-monetized: true
    get:
      summary: Get meeting
      # Requires payment
    put:
      summary: Update meeting
      # Requires payment
    delete:
      summary: Delete meeting
      # Requires payment
```

**Result:**
- All meeting operations require payment
- Backend enforces limits on all operations
- 402 responses trigger upgrade prompt

## Operation-Level Gates

Mark specific operations as monetized for fine-grained control:

```yaml
paths:
  /api/v1/templates:
    get:
      summary: List templates
      # Free for all users
    
    post:
      summary: Create template
      x-uigen-monetized: true
      # Requires payment
    
  /api/v1/templates/{id}:
    get:
      summary: Get template
      # Free for all users
    
    put:
      summary: Update template
      x-uigen-monetized: true
      # Requires payment
    
    delete:
      summary: Delete template
      x-uigen-monetized: true
      # Requires payment
```

**Result:**
- Users can list and view templates for free
- Creating, updating, and deleting templates requires payment
- Backend enforces limits only on monetized operations

## Custom Messages

Provide custom upgrade messages for better user experience:

```yaml
paths:
  /api/v1/meetings:
    x-uigen-monetized:
      monetized: true
      message: "Upgrade to Professional to create unlimited meetings"
    post:
      summary: Create meeting
```

**Result:**
- When backend returns 402, frontend shows custom message
- Message appears in upgrade prompt
- Helps users understand why they need to upgrade

## Custom Redirects

Redirect users to custom URLs instead of the default pricing page:

```yaml
paths:
  /api/v1/enterprise-features:
    x-uigen-monetized:
      monetized: true
      message: "This feature is only available on Enterprise plans"
      redirectTo: "/contact-sales"
    post:
      summary: Use enterprise feature
```

**Result:**
- When backend returns 402, frontend redirects to `/contact-sales`
- Useful for custom pricing, enterprise sales, etc.

## Backend Enforcement

The backend is the source of truth for payment enforcement. Here's how to implement it:

### FastAPI Example

```python
from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user
from app.models import User

router = APIRouter()

@router.post("/api/v1/meetings")
async def create_meeting(
    meeting: MeetingCreate,
    user: User = Depends(get_current_user)
):
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

@router.post("/api/v1/templates")
async def create_template(
    template: TemplateCreate,
    user: User = Depends(get_current_user)
):
    # Only paid users can create templates
    if user.plan == "free":
        raise HTTPException(
            status_code=402,
            detail="Upgrade to Professional to create custom templates"
        )
    
    # Create template
    return await create_template(user, template)
```

### Express.js Example

```javascript
const express = require('express');
const router = express.Router();

router.post('/api/v1/meetings', async (req, res) => {
  const user = req.user;
  
  // Check user's plan and limits
  if (user.plan === 'free') {
    const meetingCount = await getUserMeetingCount(user.id);
    if (meetingCount >= 10) {
      return res.status(402).json({
        error: 'Upgrade to Professional to create more meetings'
      });
    }
  }
  
  // Create meeting
  const meeting = await createMeeting(user, req.body);
  res.json(meeting);
});

router.post('/api/v1/templates', async (req, res) => {
  const user = req.user;
  
  // Only paid users can create templates
  if (user.plan === 'free') {
    return res.status(402).json({
      error: 'Upgrade to Professional to create custom templates'
    });
  }
  
  // Create template
  const template = await createTemplate(user, req.body);
  res.json(template);
});
```

## Frontend Behavior

UIGen automatically handles 402 responses:

### Upgrade Prompt

When backend returns 402, UIGen shows an upgrade prompt:

```
┌─────────────────────────────────────┐
│  🔒                                 │
│  Upgrade Required                   │
│                                     │
│  Upgrade to Professional to create  │
│  unlimited meetings                 │
│                                     │
│  [ View Plans ]                     │
└─────────────────────────────────────┘
```

### Inline Mode

For operation-level gates, upgrade prompt appears inline:

```
┌─────────────────────────────────────┐
│  Create Meeting                     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🔒 Upgrade Required          │ │
│  │  Upgrade to Professional to   │ │
│  │  create unlimited meetings    │ │
│  │  [ View Plans ]               │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Full-Page Mode

For resource-level gates, upgrade prompt appears full-page:

```
┌─────────────────────────────────────┐
│                                     │
│         🔒                          │
│    Upgrade Required                 │
│                                     │
│  Upgrade to Professional to access  │
│  meetings                           │
│                                     │
│      [ View Plans ]                 │
│                                     │
└─────────────────────────────────────┘
```

## Best Practices

### 1. Use Resource-Level Gates for Core Features

```yaml
# Good - Entire resource requires payment
paths:
  /api/v1/meetings:
    x-uigen-monetized: true
```

### 2. Use Operation-Level Gates for Freemium

```yaml
# Good - Read is free, write requires payment
paths:
  /api/v1/templates:
    get:
      summary: List templates
      # Free
    post:
      summary: Create template
      x-uigen-monetized: true
      # Paid
```

### 3. Provide Clear Messages

```yaml
# Good - Clear, actionable message
x-uigen-monetized:
  monetized: true
  message: "Upgrade to Professional to create unlimited meetings"

# Bad - Vague message
x-uigen-monetized:
  monetized: true
  message: "Payment required"
```

### 4. Backend Enforces, Frontend Reacts

```python
# Good - Backend enforces limits
if user.plan == "free" and meeting_count >= 10:
    raise HTTPException(status_code=402)

# Bad - Frontend-only checks (can be bypassed)
# Don't rely on frontend checks alone
```

### 5. Use Custom Redirects for Special Cases

```yaml
# Good - Enterprise features redirect to sales
x-uigen-monetized:
  monetized: true
  redirectTo: "/contact-sales"

# Good - Custom pricing redirects to custom page
x-uigen-monetized:
  monetized: true
  redirectTo: "/custom-pricing"
```

## Advanced Patterns

### Plan Hierarchy

Check for specific plans in backend:

```python
PLAN_HIERARCHY = {
    "free": 0,
    "pro": 1,
    "enterprise": 2
}

def has_access(user_plan: str, required_plan: str) -> bool:
    return PLAN_HIERARCHY.get(user_plan, 0) >= PLAN_HIERARCHY.get(required_plan, 0)

@router.post("/api/v1/advanced-features")
async def use_advanced_feature(user: User = Depends(get_current_user)):
    if not has_access(user.plan, "enterprise"):
        raise HTTPException(
            status_code=402,
            detail="This feature requires an Enterprise plan"
        )
    
    # Use feature
```

### Usage-Based Limits

Track usage and enforce limits:

```python
@router.post("/api/v1/ai-generations")
async def generate_ai_content(user: User = Depends(get_current_user)):
    # Get user's monthly usage
    usage = await get_monthly_usage(user.id)
    
    # Check limits based on plan
    limits = {
        "free": 10,
        "pro": 100,
        "enterprise": float('inf')
    }
    
    if usage >= limits.get(user.plan, 0):
        raise HTTPException(
            status_code=402,
            detail=f"Upgrade to increase your monthly limit from {limits[user.plan]} generations"
        )
    
    # Generate content
    result = await generate_content(user, request)
    await increment_usage(user.id)
    return result
```

### Feature Flags

Combine with feature flags for gradual rollout:

```python
@router.post("/api/v1/beta-features")
async def use_beta_feature(user: User = Depends(get_current_user)):
    # Check if user has access to beta
    if not user.has_beta_access:
        raise HTTPException(
            status_code=402,
            detail="Beta features are only available to Pro and Enterprise users"
        )
    
    # Use beta feature
```

## Testing

### Test 402 Responses

```python
# Test that free users get 402
def test_free_user_limit():
    # Create free user with 10 meetings
    user = create_free_user()
    create_meetings(user, count=10)
    
    # Attempt to create 11th meeting
    response = client.post("/api/v1/meetings", auth=user)
    
    assert response.status_code == 402
    assert "Upgrade" in response.json()["detail"]

# Test that paid users don't get 402
def test_paid_user_no_limit():
    # Create pro user with 100 meetings
    user = create_pro_user()
    create_meetings(user, count=100)
    
    # Attempt to create 101st meeting
    response = client.post("/api/v1/meetings", auth=user)
    
    assert response.status_code == 201
```

### Test Upgrade Flow

```typescript
// Test that 402 shows upgrade prompt
test('shows upgrade prompt on 402', async () => {
  // Mock API to return 402
  mockApi.post('/api/v1/meetings').reply(402, {
    detail: 'Upgrade to Professional'
  });
  
  // Attempt to create meeting
  render(<CreateMeetingForm />);
  await userEvent.click(screen.getByText('Create'));
  
  // Verify upgrade prompt shown
  expect(screen.getByText('Upgrade Required')).toBeInTheDocument();
  expect(screen.getByText('View Plans')).toBeInTheDocument();
});
```

## Troubleshooting

### Issue: Upgrade prompt not showing

**Check:**
1. Is backend returning 402 status code?
2. Is `x-uigen-monetized` annotation present?
3. Is MonetizationHandler wrapping the component?

### Issue: Custom message not displaying

**Check:**
1. Is message field set in `x-uigen-monetized`?
2. Is backend returning the message in 402 response?
3. Is message being passed to UpgradePrompt component?

### Issue: Redirect not working

**Check:**
1. Is `redirectTo` field set in `x-uigen-monetized`?
2. Is the redirect URL valid?
3. Is navigation working correctly?

## Summary

Payment gates provide a flexible way to monetize your application:

- **Resource-level gates** - Entire resource requires payment
- **Operation-level gates** - Specific operations require payment
- **Custom messages** - Clear upgrade prompts
- **Custom redirects** - Flexible upgrade flows
- **Backend enforcement** - Secure, cannot be bypassed
- **Automatic UI** - No frontend code needed

The backend is always the source of truth, ensuring secure payment enforcement while providing a seamless user experience.
