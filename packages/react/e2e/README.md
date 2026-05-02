# End-to-End Testing Guide

This directory contains end-to-end tests that interact with the real backend API. These tests validate the complete integration between frontend and backend, including authentication, data persistence, and error handling.

## Prerequisites

### 1. Backend Server

The FastAPI backend must be running:

```bash
cd examples/apps/fastapi/meeting-minutes
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Verify the server is running:
```bash
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

### 2. Frontend Development Server

The React frontend must be running:

```bash
cd packages/react
pnpm dev
```

The frontend will be available at `http://localhost:5173`

### 3. Test User Account

Create a test user account:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "e2e_test_user",
    "email": "e2e_test@example.com",
    "password": "e2e_test_pass_123"
  }'
```

Or set custom credentials via environment variables (see Configuration below).

## Installation

Install Playwright and its dependencies:

```bash
cd packages/react
pnpm add -D @playwright/test
npx playwright install
```

## Running Tests

### Run All E2E Tests

```bash
cd packages/react
npx playwright test
```

### Run Specific Test File

```bash
npx playwright test e2e/profile-real-backend.spec.ts
```

### Run Tests in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### View Test Report

```bash
npx playwright show-report
```

## Configuration

### Environment Variables

You can customize test configuration using environment variables:

```bash
# Backend URL (default: http://localhost:8000)
export BACKEND_URL=http://localhost:8000

# Frontend URL (default: http://localhost:5173)
export FRONTEND_URL=http://localhost:5173

# Test user credentials
export TEST_USERNAME=e2e_test_user
export TEST_PASSWORD=e2e_test_pass_123
export TEST_EMAIL=e2e_test@example.com
```

### Using .env File

Create a `.env.test` file in `packages/react/`:

```env
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
TEST_USERNAME=e2e_test_user
TEST_PASSWORD=e2e_test_pass_123
TEST_EMAIL=e2e_test@example.com
```

Load it before running tests:

```bash
export $(cat .env.test | xargs) && npx playwright test
```

## Test Structure

### profile-real-backend.spec.ts

This file contains comprehensive E2E tests for the profile view improvements feature:

**Test Suites:**

1. **Profile E2E Tests with Real Backend**
   - Complete profile edit flow with real API
   - Data persistence across page refresh
   - Data persistence across navigation
   - Server validation error handling
   - Client-side validation (invalid email)
   - Cancel edit mode without saving
   - Authentication token handling
   - Network error handling

2. **Profile E2E Tests - Accessibility**
   - Keyboard navigation support
   - ARIA labels and semantic HTML

**Test Flow:**

Each test follows this pattern:
1. Login via UI (beforeEach hook)
2. Navigate to profile page
3. Perform test actions
4. Verify expected outcomes
5. Cleanup (if needed)

## Test Results

After running tests, you'll see output like:

```
Running 10 tests using 1 worker

  ✓ [chromium] › profile-real-backend.spec.ts:50:3 › should complete full profile edit flow (5s)
  ✓ [chromium] › profile-real-backend.spec.ts:95:3 › should persist profile changes across page refresh (3s)
  ✓ [chromium] › profile-real-backend.spec.ts:115:3 › should persist profile changes across navigation (4s)
  ✓ [chromium] › profile-real-backend.spec.ts:140:3 › should handle validation errors from server (2s)
  ✓ [chromium] › profile-real-backend.spec.ts:155:3 › should handle invalid email format (2s)
  ✓ [chromium] › profile-real-backend.spec.ts:170:3 › should allow canceling edit mode (2s)
  ✓ [chromium] › profile-real-backend.spec.ts:190:3 › should handle authentication token correctly (3s)
  ✓ [chromium] › profile-real-backend.spec.ts:210:3 › should handle network errors gracefully (2s)
  ✓ [chromium] › profile-real-backend.spec.ts:235:3 › should support keyboard navigation (3s)
  ✓ [chromium] › profile-real-backend.spec.ts:260:3 › should have proper ARIA labels (2s)

  10 passed (28s)
```

## Troubleshooting

### Backend Not Running

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:8000`

**Solution:** Start the backend server:
```bash
cd examples/apps/fastapi/meeting-minutes
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend Not Running

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5173`

**Solution:** Start the frontend dev server:
```bash
cd packages/react
pnpm dev
```

### Test User Doesn't Exist

**Error:** `401 Unauthorized` during login

**Solution:** Create the test user account:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "e2e_test_user",
    "email": "e2e_test@example.com",
    "password": "e2e_test_pass_123"
  }'
```

### Database State Issues

**Error:** Tests fail due to existing data

**Solution:** Use a test database or reset database state:
```bash
# Reset database (if using SQLite)
rm examples/apps/fastapi/meeting-minutes/test.db

# Or use a separate test database in .env
DATABASE_URL=sqlite:///./test_e2e.db
```

### CORS Errors

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:** Ensure backend CORS settings allow frontend origin:
```python
# In app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Timeout Errors

**Error:** `Test timeout of 30000ms exceeded`

**Solution:** Increase timeout in `playwright.config.ts`:
```typescript
export default defineConfig({
  timeout: 60 * 1000, // 60 seconds
  // ...
});
```

## Best Practices

### 1. Use Test Database

Always run E2E tests against a test database, not production:

```bash
# Set test database URL
export DATABASE_URL=sqlite:///./test_e2e.db
```

### 2. Clean Up Test Data

Clean up test data after tests to avoid conflicts:

```typescript
test.afterEach(async () => {
  // Delete test data created during test
});
```

### 3. Avoid Parallel Execution

Run E2E tests sequentially to avoid database conflicts:

```typescript
// In playwright.config.ts
export default defineConfig({
  fullyParallel: false,
  workers: 1,
});
```

### 4. Use Unique Test Data

Use timestamps or UUIDs to create unique test data:

```typescript
const timestamp = Date.now();
const username = `test_user_${timestamp}`;
```

### 5. Handle Flaky Tests

Add retries for flaky tests in CI:

```typescript
// In playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pnpm install
          cd examples/apps/fastapi/meeting-minutes
          pip install -r requirements.txt
      
      - name: Start backend
        run: |
          cd examples/apps/fastapi/meeting-minutes
          uvicorn app.main:app --port 8000 &
          sleep 5
      
      - name: Start frontend
        run: |
          cd packages/react
          pnpm dev &
          sleep 5
      
      - name: Install Playwright
        run: |
          cd packages/react
          npx playwright install --with-deps
      
      - name: Run E2E tests
        run: |
          cd packages/react
          npx playwright test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: packages/react/playwright-report/
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Test Reporters](https://playwright.dev/docs/test-reporters)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Playwright documentation
3. Check existing GitHub issues
4. Create a new issue with test logs and error messages
