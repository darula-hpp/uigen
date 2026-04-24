import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefLinkEdgeOverlay } from '../RefLinkEdgeOverlay';
import type { RefLinkConfig } from '../RefLinkTypes';

describe('RefLinkEdgeOverlay', () => {
  let mockFieldRefsRef: React.MutableRefObject<Map<string, HTMLElement>>;
  let mockResourceRefsRef: React.MutableRefObject<Map<string, HTMLElement>>;
  let mockContainerRef: React.RefObject<HTMLElement>;
  let mockPositions: Map<string, { x: number; y: number }>;

  beforeEach(() => {
    // Create mock field elements
    const fieldEl1 = document.createElement('div');
    fieldEl1.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 50,
      right: 200,
      bottom: 70,
      width: 100,
      height: 20,
      x: 100,
      y: 50,
      toJSON: () => {},
    }));

    const fieldEl2 = document.createElement('div');
    fieldEl2.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 100,
      right: 200,
      bottom: 120,
      width: 100,
      height: 20,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));

    // Create mock resource elements
    const resourceEl1 = document.createElement('div');
    resourceEl1.getBoundingClientRect = vi.fn(() => ({
      left: 400,
      top: 50,
      right: 600,
      bottom: 150,
      width: 200,
      height: 100,
      x: 400,
      y: 50,
      toJSON: () => {},
    }));

    const resourceEl2 = document.createElement('div');
    resourceEl2.getBoundingClientRect = vi.fn(() => ({
      left: 400,
      top: 200,
      right: 600,
      bottom: 300,
      width: 200,
      height: 100,
      x: 400,
      y: 200,
      toJSON: () => {},
    }));

    // Create mock container
    const containerEl = document.createElement('div');
    containerEl.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    mockFieldRefsRef = {
      current: new Map([
        ['users.departmentId', fieldEl1],
        ['users.managerId', fieldEl2],
      ]),
    };

    mockResourceRefsRef = {
      current: new Map([
        ['departments', resourceEl1],
        ['users', resourceEl2],
      ]),
    };

    mockContainerRef = {
      current: containerEl,
    };

    mockPositions = new Map([
      ['departments', { x: 400, y: 50 }],
      ['users', { x: 400, y: 200 }],
    ]);
  });

  it('renders SVG overlay with correct dimensions', () => {
    render(
      <RefLinkEdgeOverlay
        refLinks={[]}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    const svg = screen.getByTestId('ref-link-edge-overlay');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '600');
  });

  it('renders solid green lines for existing ref links', () => {
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'users.departmentId',
        resource: 'departments',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    const line = screen.getByTestId('ref-link-line-users.departmentId');
    expect(line).toBeInTheDocument();

    // Check for visible line with green color
    const visibleLine = container.querySelector('line[stroke="#10b981"]');
    expect(visibleLine).toBeInTheDocument();
    expect(visibleLine).toHaveAttribute('stroke-width', '2');
    expect(visibleLine).toHaveAttribute('marker-end', 'url(#arrow-ref-link)');
  });

  it('renders dashed light blue line for pending connection', () => {
    const pendingLine = {
      x1: 100,
      y1: 50,
      x2: 400,
      y2: 100,
    };

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={[]}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={pendingLine}
        onRefLinkSelect={vi.fn()}
      />
    );

    const pendingLineEl = container.querySelector('line[stroke="#60a5fa"]');
    expect(pendingLineEl).toBeInTheDocument();
    expect(pendingLineEl).toHaveAttribute('stroke-width', '2');
    expect(pendingLineEl).toHaveAttribute('stroke-dasharray', '6 3');
    expect(pendingLineEl).toHaveAttribute('marker-end', 'url(#arrow-pending-ref)');
  });

  it('renders arrow markers', () => {
    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={[]}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    // Check for arrow markers in defs
    const arrowRefLink = container.querySelector('#arrow-ref-link');
    expect(arrowRefLink).toBeInTheDocument();
    expect(arrowRefLink).toHaveAttribute('markerWidth', '10');
    expect(arrowRefLink).toHaveAttribute('markerHeight', '7');

    const arrowPendingRef = container.querySelector('#arrow-pending-ref');
    expect(arrowPendingRef).toBeInTheDocument();
    expect(arrowPendingRef).toHaveAttribute('markerWidth', '10');
    expect(arrowPendingRef).toHaveAttribute('markerHeight', '7');
  });

  it('renders label pill at midpoint showing field path', () => {
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'users.departmentId',
        resource: 'departments',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    // Check for label text
    const labelText = container.querySelector('text');
    expect(labelText).toBeInTheDocument();
    expect(labelText?.textContent).toBe('users.departmentId');

    // Check for label pill background
    const labelRect = container.querySelector('rect[fill="white"]');
    expect(labelRect).toBeInTheDocument();
    expect(labelRect).toHaveAttribute('stroke', '#10b981');
  });

  it('calls onRefLinkSelect when line is clicked', async () => {
    const user = userEvent.setup();
    const mockOnRefLinkSelect = vi.fn();
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'users.departmentId',
        resource: 'departments',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={mockOnRefLinkSelect}
      />
    );

    // Find the hit area (transparent line with 14px stroke width)
    const hitArea = container.querySelector('line[stroke="transparent"]');
    expect(hitArea).toBeInTheDocument();
    expect(hitArea).toHaveAttribute('stroke-width', '14');

    // Click the hit area
    await user.click(hitArea as SVGLineElement);

    expect(mockOnRefLinkSelect).toHaveBeenCalledTimes(1);
    expect(mockOnRefLinkSelect).toHaveBeenCalledWith(refLinks[0]);
  });

  it('gracefully handles missing source field', () => {
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'nonexistent.field',
        resource: 'departments',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    // Should not render any lines
    const lines = container.querySelectorAll('line[stroke="#10b981"]');
    expect(lines).toHaveLength(0);
  });

  it('gracefully handles missing target resource', () => {
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'users.departmentId',
        resource: 'nonexistent',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    // Should not render any lines
    const lines = container.querySelectorAll('line[stroke="#10b981"]');
    expect(lines).toHaveLength(0);
  });

  it('renders multiple ref links', () => {
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'users.departmentId',
        resource: 'departments',
        valueField: 'id',
        labelField: 'name',
      },
      {
        fieldPath: 'users.managerId',
        resource: 'users',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    // Should render two lines
    const lines = container.querySelectorAll('line[stroke="#10b981"]');
    expect(lines).toHaveLength(2);

    // Check for both test IDs
    expect(screen.getByTestId('ref-link-line-users.departmentId')).toBeInTheDocument();
    expect(screen.getByTestId('ref-link-line-users.managerId')).toBeInTheDocument();
  });

  it('truncates long field paths in labels', () => {
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'very.long.nested.field.path.that.exceeds.thirty.characters',
        resource: 'departments',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    // Add the field to refs
    const fieldEl = document.createElement('div');
    fieldEl.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 50,
      right: 200,
      bottom: 70,
      width: 100,
      height: 20,
      x: 100,
      y: 50,
      toJSON: () => {},
    }));
    mockFieldRefsRef.current.set(refLinks[0].fieldPath, fieldEl);

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    const labelText = container.querySelector('text');
    expect(labelText?.textContent).toMatch(/…$/); // Should end with ellipsis
    expect(labelText?.textContent?.length).toBeLessThanOrEqual(29); // 28 chars + ellipsis
  });

  it('has correct ARIA label on lines', () => {
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'users.departmentId',
        resource: 'departments',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    const hitArea = container.querySelector('line[stroke="transparent"]');
    expect(hitArea).toHaveAttribute(
      'aria-label',
      'Ref link: users.departmentId to departments'
    );
  });

  it('applies glow filter to visible lines', () => {
    const refLinks: RefLinkConfig[] = [
      {
        fieldPath: 'users.departmentId',
        resource: 'departments',
        valueField: 'id',
        labelField: 'name',
      },
    ];

    const { container } = render(
      <RefLinkEdgeOverlay
        refLinks={refLinks}
        fieldRefsRef={mockFieldRefsRef}
        resourceRefsRef={mockResourceRefsRef}
        containerRef={mockContainerRef}
        positions={mockPositions}
        pendingLine={null}
        onRefLinkSelect={vi.fn()}
      />
    );

    const visibleLine = container.querySelector('line[stroke="#10b981"]');
    expect(visibleLine).toHaveAttribute('filter', 'url(#ref-link-glow)');

    // Check that glow filter is defined
    const glowFilter = container.querySelector('#ref-link-glow');
    expect(glowFilter).toBeInTheDocument();
  });
});
