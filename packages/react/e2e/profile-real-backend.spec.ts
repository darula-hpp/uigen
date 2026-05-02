/**
 * End-to-End Tests for Profile View with Real Backend API
 * 
 * Task 12.3: Write end-to-end tests
 * - Test complete profile edit flow with real API
 * - Test authentication integration
 * - Test data persistence across sessions
 * 
 * Prerequisites:
 * 1. Backend server running at http://localhost:8000
 * 2. Test user account created
 * 3. Frontend dev server running at http://localhost:5173
 * 
 * Run with: npx playwright test e2e/profile-real-backend.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TEST_USERNAME = process.env.TEST_USERNAME || 'e2e_test_user';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'e2e_test_pass_123';
const TEST_EMAIL = process.env.TEST_EMAIL || 'e2e_test@example.com';

/**
 * Helper function to login via UI
 */
async function loginViaUI(page: Page, username: string, password: string) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForURL(`${FRONTEND_URL}/`, { timeout: 5000 });
}

/**
 * Helper function to create test user via API
 */
async function createTestUser(username: string, email: string, password: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    
    if (response.status === 409) {
      // User already exists, that's okay
      return true;
    }
    
    return response.ok;
  } catch (error) {
    console.error('Failed to create test user:', error);
    return false;
  }
}

/**
 * Helper function to delete test user via API (cleanup)
 */
async function deleteTestUser(username: string, password: string) {
  try {
    // Login to get token
    const loginResponse = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    if (!loginResponse.ok) return;
    
    const { access_token } = await loginResponse.json();
    
    // Delete user (if endpoint exists)
    await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
  } catch (error) {
    console.error('Failed to delete test user:', error);
  }
}

test.describe('Profile E2E Tests with Real Backend', () => {
  test.beforeAll(async () => {
    // Ensure test user exists
    await createTestUser(TEST_USERNAME, TEST_EMAIL, TEST_PASSWORD);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginViaUI(page, TEST_USERNAME, TEST_PASSWORD);
  });

  test('should complete full profile edit flow with real API', async ({ page }) => {
    // Navigate to profile page
    await page.click('a[href="/profile"]');
    await expect(page).toHaveURL(`${FRONTEND_URL}/profile`);

    // Verify initial profile data is displayed
    await expect(page.locator(`text=${TEST_USERNAME}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${TEST_EMAIL}`)).toBeVisible();

    // Click Edit Profile button
    const editButton = page.locator('button', { hasText: 'Edit Profile' });
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Verify edit mode is active
    await expect(page.locator('text=Edit Profile')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Save' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Cancel' })).toBeVisible();

    // Modify username
    const timestamp = Date.now();
    const newUsername = `${TEST_USERNAME}_${timestamp}`;
    const newEmail = `e2e_test_${timestamp}@example.com`;

    const usernameInput = page.locator('input[name="username"]');
    await usernameInput.clear();
    await usernameInput.fill(newUsername);

    // Modify email
    const emailInput = page.locator('input[name="email"]');
    await emailInput.clear();
    await emailInput.fill(newEmail);

    // Save changes
    const saveButton = page.locator('button', { hasText: 'Save' });
    await saveButton.click();

    // Wait for save to complete (loading state)
    await expect(page.locator('text=Saving')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=Saving')).not.toBeVisible({ timeout: 5000 });

    // Verify success message appears
    await expect(page.locator('text=/profile.*updated.*successfully/i')).toBeVisible({ timeout: 5000 });

    // Verify edit mode exits
    await expect(page.locator('text=Edit Profile')).not.toBeVisible();
    await expect(page.locator('button', { hasText: 'Edit Profile' })).toBeVisible();

    // Verify updated data is displayed
    await expect(page.locator(`text=${newUsername}`)).toBeVisible();
    await expect(page.locator(`text=${newEmail}`)).toBeVisible();
  });

  test('should persist profile changes across page refresh', async ({ page }) => {
    // Navigate to profile
    await page.goto(`${FRONTEND_URL}/profile`);

    // Get current username
    const currentUsername = await page.locator('text=/^[a-zA-Z0-9_]+$/').first().textContent();

    // Edit profile
    await page.click('button:has-text("Edit Profile")');
    
    const timestamp = Date.now();
    const newUsername = `persist_test_${timestamp}`;
    
    await page.fill('input[name="username"]', newUsername);
    await page.click('button:has-text("Save")');

    // Wait for save to complete
    await expect(page.locator(`text=${newUsername}`)).toBeVisible({ timeout: 5000 });

    // Refresh the page
    await page.reload();

    // Verify data persists after refresh
    await expect(page.locator(`text=${newUsername}`)).toBeVisible({ timeout: 5000 });
  });

  test('should persist profile changes across navigation', async ({ page }) => {
    // Navigate to profile
    await page.goto(`${FRONTEND_URL}/profile`);

    // Edit profile
    await page.click('button:has-text("Edit Profile")');
    
    const timestamp = Date.now();
    const newUsername = `nav_test_${timestamp}`;
    
    await page.fill('input[name="username"]', newUsername);
    await page.click('button:has-text("Save")');

    // Wait for save to complete
    await expect(page.locator(`text=${newUsername}`)).toBeVisible({ timeout: 5000 });

    // Navigate away to home page
    await page.goto(`${FRONTEND_URL}/`);
    await expect(page).toHaveURL(`${FRONTEND_URL}/`);

    // Navigate back to profile
    await page.goto(`${FRONTEND_URL}/profile`);

    // Verify data persists after navigation
    await expect(page.locator(`text=${newUsername}`)).toBeVisible({ timeout: 5000 });
  });

  test('should handle validation errors from server', async ({ page }) => {
    // Navigate to profile
    await page.goto(`${FRONTEND_URL}/profile`);

    // Edit profile
    await page.click('button:has-text("Edit Profile")');

    // Enter invalid username (too short)
    await page.fill('input[name="username"]', 'ab');
    await page.click('button:has-text("Save")');

    // Verify validation error appears
    await expect(page.locator('text=/username.*at least.*3.*characters/i')).toBeVisible({ timeout: 5000 });

    // Verify form stays in edit mode
    await expect(page.locator('text=Edit Profile')).toBeVisible();
  });

  test('should handle invalid email format', async ({ page }) => {
    // Navigate to profile
    await page.goto(`${FRONTEND_URL}/profile`);

    // Edit profile
    await page.click('button:has-text("Edit Profile")');

    // Enter invalid email
    await page.fill('input[name="email"]', 'invalid-email');

    // Verify client-side validation error
    await expect(page.locator('text=/valid email/i')).toBeVisible({ timeout: 2000 });

    // Verify Save button is disabled
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeDisabled();
  });

  test('should allow canceling edit mode without saving', async ({ page }) => {
    // Navigate to profile
    await page.goto(`${FRONTEND_URL}/profile`);

    // Get original username
    const originalUsername = await page.locator('text=/^[a-zA-Z0-9_]+$/').first().textContent();

    // Edit profile
    await page.click('button:has-text("Edit Profile")');

    // Make changes
    await page.fill('input[name="username"]', 'temporary_name');

    // Cancel
    await page.click('button:has-text("Cancel")');

    // Verify edit mode exits
    await expect(page.locator('text=Edit Profile')).not.toBeVisible();

    // Verify original data is still displayed
    await expect(page.locator(`text=${originalUsername}`)).toBeVisible();
  });

  test('should handle authentication token correctly', async ({ page }) => {
    // Navigate to profile
    await page.goto(`${FRONTEND_URL}/profile`);

    // Verify profile loads (authenticated)
    await expect(page.locator('button:has-text("Edit Profile")')).toBeVisible({ timeout: 5000 });

    // Check localStorage for auth token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();

    // Clear auth token
    await page.evaluate(() => localStorage.removeItem('auth_token'));

    // Reload page
    await page.reload();

    // Verify redirected to login (or error shown)
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Navigate to profile
    await page.goto(`${FRONTEND_URL}/profile`);

    // Edit profile
    await page.click('button:has-text("Edit Profile")');

    // Simulate network failure by blocking API requests
    await context.route(`${BACKEND_URL}/api/v1/auth/me`, route => route.abort());

    // Try to save
    await page.fill('input[name="username"]', 'network_test');
    await page.click('button:has-text("Save")');

    // Verify error message appears
    await expect(page.locator('text=/error|failed|network/i')).toBeVisible({ timeout: 5000 });

    // Verify form stays in edit mode
    await expect(page.locator('text=Edit Profile')).toBeVisible();
  });
});

test.describe('Profile E2E Tests - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, TEST_USERNAME, TEST_PASSWORD);
    await page.goto(`${FRONTEND_URL}/profile`);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab to Edit button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify Edit button is focused
    const editButton = page.locator('button:has-text("Edit Profile")');
    await expect(editButton).toBeFocused();

    // Press Enter to activate
    await page.keyboard.press('Enter');

    // Verify edit mode is active
    await expect(page.locator('text=Edit Profile')).toBeVisible();

    // Tab through form fields
    await page.keyboard.press('Tab');
    const usernameInput = page.locator('input[name="username"]');
    await expect(usernameInput).toBeFocused();

    // Press Escape to cancel
    await page.keyboard.press('Escape');

    // Verify edit mode exits
    await expect(page.locator('text=Edit Profile')).not.toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Check Edit button has aria-label
    const editButton = page.locator('button:has-text("Edit Profile")');
    const ariaLabel = await editButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Enter edit mode
    await editButton.click();

    // Check form inputs have labels
    const usernameInput = page.locator('input[name="username"]');
    const usernameLabel = await page.locator('label[for="username"]').textContent();
    expect(usernameLabel).toBeTruthy();

    const emailInput = page.locator('input[name="email"]');
    const emailLabel = await page.locator('label[for="email"]').textContent();
    expect(emailLabel).toBeTruthy();
  });
});

/**
 * Test Data Cleanup
 * 
 * Note: This cleanup is optional and depends on whether you want to
 * preserve test data or clean it up after tests.
 */
test.afterAll(async () => {
  // Optionally clean up test user
  // await deleteTestUser(TEST_USERNAME, TEST_PASSWORD);
});
