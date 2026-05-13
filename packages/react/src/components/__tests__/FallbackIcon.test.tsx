import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FallbackIcon } from '../FallbackIcon';

/**
 * Unit tests for FallbackIcon component
 * Validates Requirements 6.1, 6.2, 6.4
 */
describe('FallbackIcon', () => {
  describe('Default rendering', () => {
    it('should render with default props', () => {
      // Validates Requirement 6.1: Render fallback icon
      const { container } = render(<FallbackIcon />);
      const svg = container.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
    });

    it('should have default size of 24', () => {
      // Validates Requirement 6.4: Render with same size as requested icon
      const { container } = render(<FallbackIcon />);
      const svg = container.querySelector('svg');
      
      // Lucide icons apply size as both width and height attributes
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });
  });

  describe('Size prop', () => {
    it('should apply size prop correctly as number', () => {
      // Validates Requirement 6.4: Render with same size as requested icon
      const { container } = render(<FallbackIcon size={32} />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('width', '32');
      expect(svg).toHaveAttribute('height', '32');
    });

    it('should apply size prop correctly as string', () => {
      // Validates Requirement 6.4: Render with same size as requested icon
      const { container } = render(<FallbackIcon size="48" />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('width', '48');
      expect(svg).toHaveAttribute('height', '48');
    });

    it('should handle small size', () => {
      // Validates Requirement 6.4: Render with same size as requested icon
      const { container } = render(<FallbackIcon size={16} />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('should handle large size', () => {
      // Validates Requirement 6.4: Render with same size as requested icon
      const { container } = render(<FallbackIcon size={64} />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('width', '64');
      expect(svg).toHaveAttribute('height', '64');
    });
  });

  describe('ClassName prop', () => {
    it('should apply className prop correctly', () => {
      // Validates Requirement 6.2: Apply styling props
      const { container } = render(<FallbackIcon className="custom-icon" />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveClass('custom-icon');
    });

    it('should apply multiple classes', () => {
      // Validates Requirement 6.2: Apply styling props
      const { container } = render(<FallbackIcon className="icon fallback-icon" />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveClass('icon');
      expect(svg).toHaveClass('fallback-icon');
    });

    it('should handle empty className', () => {
      // Validates Requirement 6.2: Apply styling props
      const { container } = render(<FallbackIcon className="" />);
      const svg = container.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Color prop', () => {
    it('should apply color prop correctly', () => {
      // Validates Requirement 6.2: Apply styling props
      const { container } = render(<FallbackIcon color="red" />);
      const svg = container.querySelector('svg');
      
      // Color is applied via style attribute (browser converts to RGB)
      expect(svg).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it('should apply hex color', () => {
      // Validates Requirement 6.2: Apply styling props
      const { container } = render(<FallbackIcon color="#ff0000" />);
      const svg = container.querySelector('svg');
      
      // Color is applied via style attribute
      expect(svg).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it('should apply rgb color', () => {
      // Validates Requirement 6.2: Apply styling props
      const { container } = render(<FallbackIcon color="rgb(255, 0, 0)" />);
      const svg = container.querySelector('svg');
      
      // Color is applied via style attribute
      expect(svg).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it('should handle undefined color', () => {
      // Validates Requirement 6.2: Apply styling props
      const { container } = render(<FallbackIcon />);
      const svg = container.querySelector('svg');
      
      // Should render without color style when not provided
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Combined props', () => {
    it('should apply all props together', () => {
      // Validates Requirements 6.1, 6.2, 6.4
      const { container } = render(
        <FallbackIcon 
          size={40} 
          className="test-icon" 
          color="blue" 
        />
      );
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('width', '40');
      expect(svg).toHaveAttribute('height', '40');
      expect(svg).toHaveClass('test-icon');
      // Browser converts "blue" to RGB
      expect(svg).toHaveStyle({ color: 'rgb(0, 0, 255)' });
    });

    it('should apply accessibility attributes with custom props', () => {
      // Validates Requirement 14.1, 14.2: Accessible fallback icon with custom label
      const { container } = render(
        <FallbackIcon 
          size={32} 
          className="custom" 
          color="green"
          ariaLabel="Custom fallback icon"
        />
      );
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('aria-label', 'Custom fallback icon');
      expect(svg).toHaveAttribute('role', 'img');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-hidden="true" when no ariaLabel provided (decorative icon)', () => {
      // Validates Requirement 14.3: Apply aria-hidden for decorative icons
      const { container } = render(<FallbackIcon />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).not.toHaveAttribute('aria-label');
      expect(svg).not.toHaveAttribute('role');
    });

    it('should have aria-label and role="img" when ariaLabel provided (semantic icon)', () => {
      // Validates Requirement 14.1, 14.2, 14.4: Apply aria-label and role for semantic icons
      const { container } = render(<FallbackIcon ariaLabel="Custom icon label" />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('aria-label', 'Custom icon label');
      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).not.toHaveAttribute('aria-hidden');
    });

    it('should pass ariaLabel to underlying icon component', () => {
      // Validates Requirement 14.1: Accept aria-label prop
      const { container } = render(<FallbackIcon ariaLabel="Error icon" />);
      const svg = container.querySelector('svg');
      
      expect(svg).toHaveAttribute('aria-label', 'Error icon');
    });
  });
});
