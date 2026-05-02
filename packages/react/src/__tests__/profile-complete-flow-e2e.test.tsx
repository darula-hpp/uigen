/**
 * Complete End-to-End Tests for Profile View Improvements
 * 
 * Task 12.1: Test complete user flow end-to-end
 * - Test login → view profile → edit → save → verify changes
 * - Test error scenarios and recovery
 * - Document browser compatibility (Chrome, Firefox, Safari)
 * - Document mobile device testing results
 * 
 * Requirements: All (1.1-7.6)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import type { UIGenApp } from '@uigen-dev/core';

// Mock the useApiCall hook
vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
  useApiMutation: vi.fn(),
}));

// Mock auth utilities
vi.mock('@/lib/auth', () => ({
  getAuthCredentials: vi.fn(() => ({ token: 'test-token' })),
  isAuthenticated: vi.fn(() => true),
  setAuthCredentials: vi.fn(),
  clearAuthCredentials: vi.fn(),
}));

import { useApiCall, useApiMutation } from '@/hooks/useApiCall';

const mockUseApiCall = useApiCall as ReturnType<typeof vi.fn>;
const mockUseApiMutation = useApiMutation as ReturnType<typeof vi.fn>;

const mockProfileConfig: UIGenApp = {
  meta: {
    title: 'Test API',
    version: '1.0.0',
  },
  resources: [
    {
      name: 'Profile',
      slug: 'profile',
      uigenId: 'profile',
      __profileAnnotation: true,
      operations: [
        {
          id: 'getProfile',
          method: 'GET',
          path: '/api/v1/auth/me',
          viewHint: 'detail',
          parameters: [],
          responses: {
            '200': {
              schema: {
                type: 'object',
                key: 'profile',
                label: 'Profile',
                required: false,
                children: [
                  { type: 'string', key: 'id', label: 'ID', required: true },
                  { type: 'string', key: 'username', label: 'Username', required: true },
                  { type: 'string', key: 'email', label: 'Email', format: 'email', required: false },
                  { type: 'string', key: 'created_at', label: 'Created At', format: 'date-time', required: true },
                ],
              },
            },
          },
        },
        {
          id: 'updateProfile',
          method: 'PUT',
          path: '/api/v1/auth/me',
          viewHint: 'update',
          parameters: [],
          requestBody: {
            schema: {
              type: 'object',
              key: 'profile',
              label: 'Profile',
              required: false,
              children: [
                { type: 'string', key: 'username', label: 'Username', required: false },
                { type: 'string', key: 'email', label: 'Email', format: 'email', required: false },
              ],
            },
          },
          responses: {
            '200': {
              schema: {
                type: 'object',
                key: 'profile',
                label: 'Profile',
                required: false,
                children: [
                  { type: 'string', key: 'id', label: 'ID', required: true },
                  { type: 'string', key: 'username', label: 'Username', required: true },
                  { type: 'string', key: 'email', label: 'Email', format: 'email', required: false },
                  { type: 'string', key: 'created_at', label: 'Created At', format: 'date-time', required: true },
                ],
              },
            },
          },
        },
      ],
      schema: {
        type: 'object',
        key: 'Profile',
        label: 'Profile',
        required: false,
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'username', label: 'Username', required: true },
          { type: 'string', key: 'email', label: 'Email', format: 'email', required: false },
          { type: 'string', key: 'created_at', label: 'Created At', format: 'date-time', required: true },
        ],
      },
      relationships: [],
    },
  ],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {},
  servers: [{ url: 'https://api.example.com' }],
};

describe('Task 12.1: Complete User Flow End-to-End Tests', () => {
  let refetchMock: ReturnType<typeof vi.fn>;
  let mutateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    refetchMock = vi.fn();
    mutateMock = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Flow: Login → View → Edit → Save → Verify', () => {
    it('should complete full user flow successfully', async () => {
      const user = userEvent.setup();

      const mockInitialData = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockUpdatedData = {
        id: '123',
        username: 'johnsmith',
        email: 'john.smith@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      let currentData = { ...mockInitialData };

      // Mock useApiCall for GET requests
      mockUseApiCall.mockImplementation((operation: any) => {
        if (operation?.id === 'getProfile') {
          return {
            data: currentData,
            isLoading: false,
            error: null,
            refetch: refetchMock,
            isError: false,
            isSuccess: true,
          };
        }
        return {
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
          isError: false,
          isSuccess: false,
        };
      });

      // Mock useApiMutation for PUT requests
      mockUseApiMutation.mockImplementation((operation: any) => {
        if (operation?.id === 'updateProfile') {
          return {
            mutate: mutateMock.mockImplementation(async (data: any) => {
              currentData = { ...currentData, ...data };
              return currentData;
            }),
            mutateAsync: mutateMock,
            isPending: false,
            isSuccess: false,
            isError: false,
            error: null,
            data: null,
            reset: vi.fn(),
          };
        }
        return {
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isPending: false,
          isSuccess: false,
          isError: false,
          error: null,
          data: null,
          reset: vi.fn(),
        };
      });

      // Step 1: Navigate to profile (simulating login already completed)
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Step 2: Verify profile data is displayed
      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Step 3: Click Edit button
      const editButton = await screen.findByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Step 4: Verify edit mode is active
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Step 5: Modify username and email
      const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

      await user.clear(usernameInput);
      await user.type(usernameInput, 'johnsmith');

      await user.clear(emailInput);
      await user.type(emailInput, 'john.smith@example.com');

      // Step 6: Save changes
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      await user.click(saveButton);

      // Step 7: Verify mutation was called with correct data
      await waitFor(() => {
        expect(mutateMock).toHaveBeenCalledWith({
          username: 'johnsmith',
          email: 'john.smith@example.com',
        });
      });

      // Step 8: Verify updated data is displayed (after refetch)
      currentData = mockUpdatedData;
      await waitFor(() => {
        expect(screen.getByText('johnsmith')).toBeInTheDocument();
        expect(screen.getByText('john.smith@example.com')).toBeInTheDocument();
      });

      // Step 9: Verify edit mode is exited
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle validation errors and allow correction', async () => {
      const user = userEvent.setup();

      const mockData = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUseApiCall.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
        isError: false,
        isSuccess: true,
      });

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock,
        mutateAsync: mutateMock,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Enter edit mode
      const editButton = await screen.findByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Enter invalid email
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      // Verify validation error is displayed
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      // Verify Save button is disabled
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      expect(saveButton).toBeDisabled();

      // Correct the email
      await user.clear(emailInput);
      await user.type(emailInput, 'valid@example.com');

      // Verify error is cleared
      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
      });

      // Verify Save button is enabled
      expect(saveButton).not.toBeDisabled();
    });

    it('should handle network errors with retry capability', async () => {
      const user = userEvent.setup();

      // Simulate network error
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: refetchMock,
        isError: true,
        isSuccess: false,
      });

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock,
        mutateAsync: mutateMock,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/error loading profile/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Verify refetch was called
      expect(refetchMock).toHaveBeenCalled();
    });

    it('should handle 409 conflict errors (duplicate username)', async () => {
      const user = userEvent.setup();

      const mockData = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUseApiCall.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
        isError: false,
        isSuccess: true,
      });

      const conflictError = {
        status: 409,
        response: {
          error: 'Username already exists',
        },
      };

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock.mockRejectedValue(conflictError),
        mutateAsync: mutateMock,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: conflictError,
        data: null,
        reset: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Enter edit mode
      const editButton = await screen.findByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Change username
      const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
      await user.clear(usernameInput);
      await user.type(usernameInput, 'existinguser');

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      await user.click(saveButton);

      // Verify conflict error is displayed
      await waitFor(() => {
        expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
      });

      // Verify form remains in edit mode for correction
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    it('should handle 422 validation errors from server', async () => {
      const user = userEvent.setup();

      const mockData = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUseApiCall.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
        isError: false,
        isSuccess: true,
      });

      const validationError = {
        status: 422,
        response: {
          detail: [
            {
              loc: ['body', 'username'],
              msg: 'Username must be at least 3 characters',
              type: 'value_error.any_str.min_length',
            },
          ],
        },
      };

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock.mockRejectedValue(validationError),
        mutateAsync: mutateMock,
        isPending: false,
        isSuccess: false,
        isError: true,
        error: validationError,
        data: null,
        reset: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Enter edit mode
      const editButton = await screen.findByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Change username to invalid value
      const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
      await user.clear(usernameInput);
      await user.type(usernameInput, 'ab');

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      await user.click(saveButton);

      // Verify server validation error is displayed
      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('should allow canceling edit mode to discard changes', async () => {
      const user = userEvent.setup();

      const mockData = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUseApiCall.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
        isError: false,
        isSuccess: true,
      });

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock,
        mutateAsync: mutateMock,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Enter edit mode
      const editButton = await screen.findByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Make changes
      const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
      await user.clear(usernameInput);
      await user.type(usernameInput, 'newusername');

      // Cancel
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      await user.click(cancelButtons[0]);

      // Verify edit mode is exited
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });

      // Verify original data is still displayed
      expect(screen.getByText('johndoe')).toBeInTheDocument();

      // Verify mutation was not called
      expect(mutateMock).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should display loading state during profile fetch', () => {
      mockUseApiCall.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: refetchMock,
        isError: false,
        isSuccess: false,
      });

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock,
        mutateAsync: mutateMock,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Verify loading skeleton is displayed
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should display loading state during profile update', async () => {
      const user = userEvent.setup();

      const mockData = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUseApiCall.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
        isError: false,
        isSuccess: true,
      });

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock,
        mutateAsync: mutateMock,
        isPending: true, // Simulating loading state
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Enter edit mode
      const editButton = await screen.findByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Verify loading indicator on Save button
      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });

      // Verify buttons are disabled during loading
      const saveButton = screen.getByRole('button', { name: /save profile changes/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Accessibility Compliance', () => {
    it('should support keyboard navigation through entire flow', async () => {
      const user = userEvent.setup();

      const mockData = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUseApiCall.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
        isError: false,
        isSuccess: true,
      });

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock,
        mutateAsync: mutateMock,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      // Tab to Edit button
      const editButton = await screen.findByRole('button', { name: /edit profile/i });
      editButton.focus();
      expect(document.activeElement).toBe(editButton);

      // Activate with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });

      // Tab through form fields
      const usernameInput = screen.getByLabelText(/username/i);
      const emailInput = screen.getByLabelText(/email/i);

      usernameInput.focus();
      expect(document.activeElement).toBe(usernameInput);

      await user.tab();
      expect(document.activeElement).toBe(emailInput);

      // Escape to cancel
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels and semantic HTML', async () => {
      const mockData = {
        id: '123',
        username: 'johndoe',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockUseApiCall.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: refetchMock,
        isError: false,
        isSuccess: true,
      });

      mockUseApiMutation.mockReturnValue({
        mutate: mutateMock,
        mutateAsync: mutateMock,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/profile']}>
          <App config={mockProfileConfig} />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
      });

      // Check for semantic HTML
      const headings = container.querySelectorAll('h1, h2, h3');
      expect(headings.length).toBeGreaterThan(0);

      // Check for proper button labels
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      expect(editButton).toBeInTheDocument();
    });
  });
});

/**
 * BROWSER COMPATIBILITY TESTING DOCUMENTATION
 * 
 * The following browsers should be tested manually or with automated tools:
 * 
 * 1. Chrome (Latest)
 *    - Full support expected
 *    - Test focus management, keyboard navigation
 *    - Test form validation UI
 * 
 * 2. Firefox (Latest)
 *    - Full support expected
 *    - Test focus management, keyboard navigation
 *    - Verify form validation messages display correctly
 * 
 * 3. Safari (Latest)
 *    - Full support expected
 *    - Test date/time formatting
 *    - Verify focus styles are visible
 *    - Test form validation UI (Safari has different native validation)
 * 
 * 4. Edge (Latest)
 *    - Full support expected (Chromium-based)
 *    - Same testing as Chrome
 * 
 * Testing Approach:
 * - Use BrowserStack or similar service for cross-browser testing
 * - Test complete flow: view → edit → save → verify
 * - Test keyboard navigation (Tab, Enter, Escape)
 * - Test form validation display
 * - Test error handling and recovery
 * - Verify responsive design at different viewport sizes
 * 
 * Known Issues:
 * - Safari may display form validation differently (native vs custom)
 * - Focus styles may need adjustment for Safari
 */

/**
 * MOBILE DEVICE TESTING DOCUMENTATION
 * 
 * The following mobile devices/viewports should be tested:
 * 
 * 1. iOS (iPhone 12/13/14)
 *    - Safari browser
 *    - Test touch interactions
 *    - Test form input focus and keyboard display
 *    - Verify responsive layout (padding, spacing)
 *    - Test scroll behavior in edit mode
 * 
 * 2. Android (Pixel 5/6, Samsung Galaxy S21/S22)
 *    - Chrome browser
 *    - Test touch interactions
 *    - Test form input focus and keyboard display
 *    - Verify responsive layout
 *    - Test scroll behavior in edit mode
 * 
 * 3. Tablet (iPad, Android tablets)
 *    - Test at tablet breakpoints (768px+)
 *    - Verify layout uses appropriate spacing
 *    - Test both portrait and landscape orientations
 * 
 * Testing Approach:
 * - Use real devices when possible
 * - Use Chrome DevTools device emulation for initial testing
 * - Test complete flow: view → edit → save → verify
 * - Test touch interactions (tap, scroll, swipe)
 * - Test form input with on-screen keyboard
 * - Verify text is readable without zooming
 * - Test error message display on small screens
 * - Verify buttons are large enough for touch (min 44x44px)
 * 
 * Responsive Breakpoints:
 * - Mobile: < 640px (sm)
 * - Tablet: 640px - 1024px (sm to lg)
 * - Desktop: > 1024px (lg+)
 * 
 * Known Issues:
 * - iOS Safari may zoom in on input focus if font-size < 16px
 * - Android keyboard may cover form buttons (test scroll behavior)
 * - Touch targets should be minimum 44x44px for accessibility
 */

/**
 * MANUAL TESTING CHECKLIST
 * 
 * Complete User Flow:
 * [ ] Navigate to profile page
 * [ ] Verify profile data loads and displays correctly
 * [ ] Click Edit button
 * [ ] Verify edit mode activates
 * [ ] Modify username field
 * [ ] Modify email field
 * [ ] Click Save button
 * [ ] Verify success message displays
 * [ ] Verify updated data is shown
 * [ ] Verify edit mode exits
 * 
 * Error Scenarios:
 * [ ] Enter invalid email format
 * [ ] Verify validation error displays
 * [ ] Correct the email
 * [ ] Verify error clears
 * [ ] Try to save with validation errors
 * [ ] Verify Save button is disabled
 * [ ] Test network error scenario
 * [ ] Verify error message and retry button
 * [ ] Test duplicate username (409 error)
 * [ ] Verify conflict error message
 * [ ] Test server validation error (422)
 * [ ] Verify server error displays correctly
 * 
 * Cancel/Discard:
 * [ ] Enter edit mode
 * [ ] Make changes
 * [ ] Click Cancel
 * [ ] Verify changes are discarded
 * [ ] Verify original data is displayed
 * 
 * Keyboard Navigation:
 * [ ] Tab to Edit button
 * [ ] Press Enter to activate
 * [ ] Tab through form fields
 * [ ] Press Escape to cancel
 * [ ] Verify focus management
 * 
 * Accessibility:
 * [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
 * [ ] Verify all buttons have labels
 * [ ] Verify form fields have labels
 * [ ] Verify error messages are announced
 * [ ] Verify focus is visible
 * [ ] Check color contrast ratios
 * 
 * Responsive Design:
 * [ ] Test at mobile viewport (375px)
 * [ ] Test at tablet viewport (768px)
 * [ ] Test at desktop viewport (1024px+)
 * [ ] Verify layout adapts appropriately
 * [ ] Verify text is readable at all sizes
 * [ ] Verify buttons are touch-friendly on mobile
 */
