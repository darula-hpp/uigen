import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionPort } from '../ConnectionPort';

describe('ConnectionPort', () => {
  it('renders with correct styling', () => {
    const mockOnMouseDown = vi.fn();
    const { container } = render(
      <ConnectionPort fieldPath="users.departmentId" onMouseDown={mockOnMouseDown} />
    );

    const port = container.firstChild as HTMLElement;
    expect(port).toBeInTheDocument();
    expect(port).toHaveClass('w-3', 'h-3', 'rounded-full', 'bg-indigo-400');
    expect(port).toHaveClass('border-2', 'border-white', 'dark:border-gray-800');
  });

  it('has crosshair cursor', () => {
    const mockOnMouseDown = vi.fn();
    const { container } = render(
      <ConnectionPort fieldPath="users.departmentId" onMouseDown={mockOnMouseDown} />
    );

    const port = container.firstChild as HTMLElement;
    expect(port).toHaveClass('cursor-crosshair');
  });

  it('has hover effects', () => {
    const mockOnMouseDown = vi.fn();
    const { container } = render(
      <ConnectionPort fieldPath="users.departmentId" onMouseDown={mockOnMouseDown} />
    );

    const port = container.firstChild as HTMLElement;
    expect(port).toHaveClass('hover:bg-indigo-600', 'hover:scale-125');
    expect(port).toHaveClass('transition-all', 'duration-150');
  });

  it('calls onMouseDown with fieldPath when clicked', async () => {
    const user = userEvent.setup();
    const mockOnMouseDown = vi.fn();
    const { container } = render(
      <ConnectionPort fieldPath="users.departmentId" onMouseDown={mockOnMouseDown} />
    );

    const port = container.firstChild as HTMLElement;
    await user.pointer({ keys: '[MouseLeft>]', target: port });

    expect(mockOnMouseDown).toHaveBeenCalledTimes(1);
    expect(mockOnMouseDown).toHaveBeenCalledWith(
      'users.departmentId',
      expect.any(Object)
    );
  });

  it('stops event propagation on mousedown', async () => {
    const user = userEvent.setup();
    const mockOnMouseDown = vi.fn();
    const mockParentHandler = vi.fn();
    
    const { container } = render(
      <div onMouseDown={mockParentHandler}>
        <ConnectionPort fieldPath="users.departmentId" onMouseDown={mockOnMouseDown} />
      </div>
    );

    const port = container.querySelector('.w-3') as HTMLElement;
    await user.pointer({ keys: '[MouseLeft>]', target: port });

    expect(mockOnMouseDown).toHaveBeenCalledTimes(1);
    expect(mockParentHandler).not.toHaveBeenCalled();
  });

  it('has correct ARIA label', () => {
    const mockOnMouseDown = vi.fn();
    render(
      <ConnectionPort fieldPath="users.departmentId" onMouseDown={mockOnMouseDown} />
    );

    const port = screen.getByLabelText('Connect from users.departmentId');
    expect(port).toBeInTheDocument();
  });

  it('has button role and is keyboard accessible', () => {
    const mockOnMouseDown = vi.fn();
    const { container } = render(
      <ConnectionPort fieldPath="users.departmentId" onMouseDown={mockOnMouseDown} />
    );

    const port = container.firstChild as HTMLElement;
    expect(port).toHaveAttribute('role', 'button');
    expect(port).toHaveAttribute('tabIndex', '0');
  });
});
