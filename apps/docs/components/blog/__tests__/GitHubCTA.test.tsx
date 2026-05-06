import { render, screen, fireEvent } from '@testing-library/react';
import { GitHubCTA } from '../GitHubCTA';

// Mock PostHog
const mockCapture = jest.fn();
jest.mock('posthog-js/react', () => ({
  usePostHog: () => ({
    capture: mockCapture,
  }),
}));

describe('GitHubCTA', () => {
  beforeEach(() => {
    mockCapture.mockClear();
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/blog/test-post' },
      writable: true,
    });
  });

  it('renders the open source message', () => {
    render(<GitHubCTA />);
    expect(screen.getByText('UIGen is open source')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<GitHubCTA />);
    expect(
      screen.getByText('Star us on GitHub to follow development')
    ).toBeInTheDocument();
  });

  it('renders a link to GitHub repository', () => {
    render(<GitHubCTA />);
    const link = screen.getByRole('link', { name: /Star/i });
    expect(link).toHaveAttribute('href', 'https://github.com/darula-hpp/uigen');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders star icons', () => {
    render(<GitHubCTA />);
    const svgs = screen.getAllByRole('link')[0].querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('has subtle styling appropriate for dev sites', () => {
    const { container } = render(<GitHubCTA />);
    const ctaContainer = container.firstChild as HTMLElement;
    expect(ctaContainer).toHaveClass('border');
    expect(ctaContainer).toHaveClass('border-[var(--border)]');
  });

  it('tracks click event with PostHog', () => {
    render(<GitHubCTA />);
    const link = screen.getByRole('link', { name: /Star/i });
    
    fireEvent.click(link);
    
    expect(mockCapture).toHaveBeenCalledWith('github_star_click', {
      source: 'blog_cta',
      location: '/blog/test-post',
    });
  });

  it('handles missing PostHog gracefully', () => {
    // Mock usePostHog to return null
    jest.resetModules();
    jest.doMock('posthog-js/react', () => ({
      usePostHog: () => null,
    }));
    
    const { GitHubCTA: GitHubCTAWithoutPostHog } = require('../GitHubCTA');
    
    render(<GitHubCTAWithoutPostHog />);
    const link = screen.getByRole('link', { name: /Star/i });
    
    // Should not throw error when clicking
    expect(() => fireEvent.click(link)).not.toThrow();
  });
});
