import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { IgnoreTooltip } from '../IgnoreTooltip.js';
import type { IgnoreState } from '../../../../types/index.js';

/**
 * Unit tests for IgnoreTooltip component
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
describe('IgnoreTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  
  describe('Hover Delay (Requirement 4.1)', () => {
    it('should not show tooltip immediately on hover', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      
      // Tooltip should not be visible immediately
      expect(screen.queryByTestId('ignore-tooltip')).toBeNull();
    });
    
    it('should show tooltip after 300ms hover delay', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      
      // Fast-forward time by 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      // Tooltip should now be visible
      expect(screen.getByTestId('ignore-tooltip')).toBeInTheDocument();
    });
    
    it('should not show tooltip if mouse leaves before 300ms', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      
      // Fast-forward time by 200ms (less than 300ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      // Mouse leaves
      fireEvent.mouseLeave(container);
      
      // Fast-forward remaining time
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      // Tooltip should not be visible
      expect(screen.queryByTestId('ignore-tooltip')).toBeNull();
    });
    
    it('should hide tooltip when mouse leaves', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      
      // Fast-forward time by 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      // Tooltip should be visible
      expect(screen.getByTestId('ignore-tooltip')).toBeInTheDocument();
      
      // Mouse leaves
      fireEvent.mouseLeave(container);
      
      // Tooltip should be hidden
      expect(screen.queryByTestId('ignore-tooltip')).toBeNull();
    });
  });
  
  describe('Explicit Ignore Messages (Requirement 4.2)', () => {
    it('should display explicit ignore message for explicitly ignored element', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain('Explicitly ignored by annotation on this element');
    });
    
    it('should include pruning explanation for toggle switches with explicit ignore', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email" isToggleSwitch={true}>
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain(
        'Explicitly ignored by annotation on this element. Ignoring this element will also exclude all nested children from processing'
      );
    });
  });
  
  describe('Inherited State Messages (Requirement 4.3)', () => {
    it('should display inherited message with parent name', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain('Ignored because parent User is ignored');
    });
    
    it('should extract parent name from nested path', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: true,
        source: 'inherited',
        inheritedFrom: 'components.schemas.User.properties.address',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="city">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain('Ignored because parent address is ignored');
    });
  });
  
  describe('Override Messages (Requirement 4.4)', () => {
    it('should display override message with parent name', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        inheritedFrom: 'components.schemas.User',
        isOverride: true
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain('Included despite parent User being ignored (override)');
    });
    
    it('should extract parent name from operation path in override', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        inheritedFrom: 'paths./users.get',
        isOverride: true
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="requestBody">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain('Included despite parent get being ignored (override)');
    });
  });
  
  describe('Pruning Behavior Explanation (Requirement 4.5)', () => {
    it('should show pruning explanation for active toggle switches', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email" isToggleSwitch={true}>
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain(
        'Ignoring this element will also exclude all nested children from processing'
      );
    });
    
    it('should not show pruning explanation for non-toggle elements', () => {
      const ignoreState: IgnoreState = {
        explicit: false,
        effective: false,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email" isToggleSwitch={false}>
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain('email is included in the generated UI');
      expect(tooltip.textContent).not.toContain('nested children');
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper role attribute', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });
  
  describe('Default State Messages', () => {
    it('should show default message for active elements without explicit annotation', () => {
      const ignoreState: IgnoreState = {
        explicit: undefined,
        effective: false,
        source: 'default',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Toggle</button>
        </IgnoreTooltip>
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      fireEvent.mouseEnter(container);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const tooltip = screen.getByTestId('ignore-tooltip');
      expect(tooltip.textContent).toContain('email is included in the generated UI');
    });
  });
  
  describe('Children Rendering', () => {
    it('should render children correctly', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <button>Test Button</button>
        </IgnoreTooltip>
      );
      
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });
    
    it('should render complex children', () => {
      const ignoreState: IgnoreState = {
        explicit: true,
        effective: true,
        source: 'explicit',
        isOverride: false
      };
      
      render(
        <IgnoreTooltip ignoreState={ignoreState} elementName="email">
          <div>
            <span>Label</span>
            <button>Action</button>
          </div>
        </IgnoreTooltip>
      );
      
      expect(screen.getByText('Label')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });
});
