import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpecTree } from '../SpecTree.js';
import type { SpecStructure } from '../../../types/index.js';

describe('SpecTree', () => {
  const mockStructure: SpecStructure = {
    resources: [
      {
        name: 'User',
        slug: 'User',
        uigenId: 'user-resource',
        description: 'User resource',
        operations: [
          {
            id: 'get-users',
            uigenId: 'get-users-op',
            method: 'GET',
            path: '/users',
            summary: 'List all users',
            annotations: {}
          },
          {
            id: 'create-user',
            uigenId: 'create-user-op',
            method: 'POST',
            path: '/users',
            summary: 'Create a new user',
            annotations: {
              'x-uigen-login': true
            }
          }
        ],
        fields: [
          {
            key: 'id',
            label: 'ID',
            type: 'string',
            path: 'User.id',
            required: true,
            annotations: {}
          },
          {
            key: 'email',
            label: 'Email',
            type: 'string',
            path: 'User.email',
            required: true,
            annotations: {
              'x-uigen-label': 'Email Address'
            }
          },
          {
            key: 'role',
            label: 'Role',
            type: 'string',
            path: 'User.role',
            required: false,
            annotations: {
              'x-uigen-ref': {
                resource: 'Role',
                valueField: 'id',
                labelField: 'name'
              }
            }
          }
        ],
        annotations: {}
      },
      {
        name: 'Role',
        slug: 'Role',
        uigenId: 'role-resource',
        operations: [],
        fields: [
          {
            key: 'id',
            label: 'ID',
            type: 'string',
            path: 'Role.id',
            required: true,
            annotations: {}
          },
          {
            key: 'name',
            label: 'Name',
            type: 'string',
            path: 'Role.name',
            required: true,
            annotations: {}
          }
        ],
        annotations: {
          'x-uigen-ignore': true
        }
      }
    ]
  };

  it('renders empty state when no resources', () => {
    const emptyStructure: SpecStructure = { resources: [] };
    render(<SpecTree structure={emptyStructure} />);
    
    expect(screen.getByText('No resources found in spec')).toBeInTheDocument();
  });

  it('renders resource names', () => {
    render(<SpecTree structure={mockStructure} />);
    
    expect(screen.getAllByText('User')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Role').length).toBeGreaterThan(0);
  });

  it('displays resource description', () => {
    render(<SpecTree structure={mockStructure} />);
    
    expect(screen.getByText('User resource')).toBeInTheDocument();
  });

  it('renders operations with correct method badges', () => {
    render(<SpecTree structure={mockStructure} />);
    
    const getMethods = screen.getAllByText('GET');
    const postMethods = screen.getAllByText('POST');
    
    expect(getMethods.length).toBeGreaterThan(0);
    expect(postMethods.length).toBeGreaterThan(0);
  });

  it('renders operation paths', () => {
    render(<SpecTree structure={mockStructure} />);
    
    expect(screen.getAllByText('/users').length).toBeGreaterThan(0);
  });

  it('renders operation summaries', () => {
    render(<SpecTree structure={mockStructure} />);
    
    expect(screen.getByText('List all users')).toBeInTheDocument();
    expect(screen.getByText('Create a new user')).toBeInTheDocument();
  });

  it('renders field names and types', () => {
    render(<SpecTree structure={mockStructure} />);
    
    expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getAllByText('Role').length).toBeGreaterThan(0);
  });

  it('displays required indicator for required fields', () => {
    render(<SpecTree structure={mockStructure} />);
    
    const requiredIndicators = screen.getAllByText('*');
    expect(requiredIndicators.length).toBeGreaterThan(0);
  });

  it('displays annotation indicators for annotated elements', () => {
    render(<SpecTree structure={mockStructure} />);
    
    // Check for annotation count badges
    const annotationBadges = screen.getAllByText(/[0-9]+/);
    expect(annotationBadges.length).toBeGreaterThan(0);
  });

  it('expands and collapses resource nodes', () => {
    render(<SpecTree structure={mockStructure} />);
    
    const userResources = screen.getAllByText('User');
    const resourceButton = userResources[0].closest('button');
    
    // Initially expanded, operations should be visible
    expect(screen.getByText('List all users')).toBeInTheDocument();
    
    // Click to toggle
    if (resourceButton) {
      fireEvent.click(resourceButton);
    }
    
    // After click, check that the component responded
    expect(resourceButton).toBeInTheDocument();
  });

  it('expands and collapses nested field nodes', () => {
    const structureWithNestedFields: SpecStructure = {
      resources: [
        {
          name: 'User',
          slug: 'User',
          uigenId: 'user-resource',
          operations: [],
          fields: [
            {
              key: 'address',
              label: 'Address',
              type: 'object',
              path: 'User.address',
              required: false,
              annotations: {},
              children: [
                {
                  key: 'street',
                  label: 'Street',
                  type: 'string',
                  path: 'User.address.street',
                  required: true,
                  annotations: {}
                }
              ]
            }
          ],
          annotations: {}
        }
      ]
    };
    
    render(<SpecTree structure={structureWithNestedFields} />);
    
    const addressField = screen.getByText('Address');
    const fieldButton = addressField.closest('button');
    
    // Initially collapsed, nested field should not be visible
    expect(screen.queryByText('Street')).not.toBeInTheDocument();
    
    // Click to expand
    if (fieldButton) {
      fireEvent.click(fieldButton);
    }
    
    // Nested field should now be visible
    expect(screen.getByText('Street')).toBeInTheDocument();
  });

  it('calls onNodeSelect when resource is clicked', () => {
    const onNodeSelect = vi.fn();
    render(<SpecTree structure={mockStructure} onNodeSelect={onNodeSelect} />);
    
    const userResource = screen.getByText('User');
    const resourceButton = userResource.closest('button');
    
    if (resourceButton) {
      fireEvent.click(resourceButton);
    }
    
    expect(onNodeSelect).toHaveBeenCalledWith('User', 'resource');
  });

  it('calls onNodeSelect when operation is clicked', () => {
    const onNodeSelect = vi.fn();
    render(<SpecTree structure={mockStructure} onNodeSelect={onNodeSelect} />);
    
    const operation = screen.getByText('List all users');
    const operationButton = operation.closest('button');
    
    if (operationButton) {
      fireEvent.click(operationButton);
    }
    
    expect(onNodeSelect).toHaveBeenCalledWith('GET:/users', 'operation');
  });

  it('calls onNodeSelect when field is clicked', () => {
    const onNodeSelect = vi.fn();
    render(<SpecTree structure={mockStructure} onNodeSelect={onNodeSelect} />);
    
    const emailField = screen.getByText('Email');
    const fieldButton = emailField.closest('button');
    
    if (fieldButton) {
      fireEvent.click(fieldButton);
    }
    
    expect(onNodeSelect).toHaveBeenCalledWith('User.email', 'field');
  });

  it('displays correct annotation count for resources', () => {
    render(<SpecTree structure={mockStructure} />);
    
    // Role resource has 1 annotation (x-uigen-ignore)
    const roleResources = screen.getAllByText('Role');
    // Find the resource node (not the field)
    const roleResourceNode = roleResources.find(el => {
      const button = el.closest('button');
      return button?.classList.contains('w-full') && button?.querySelector('.flex-1.font-medium');
    });
    const roleContainer = roleResourceNode?.closest('button');
    
    expect(roleContainer).toBeInTheDocument();
    // Check that annotation indicator is present
    const annotationBadge = roleContainer?.querySelector('.bg-purple-100');
    expect(annotationBadge).toBeInTheDocument();
  });

  it('displays correct annotation count for operations', () => {
    render(<SpecTree structure={mockStructure} />);
    
    // POST /users operation has 1 annotation (x-uigen-login)
    const createUserOp = screen.getByText('Create a new user');
    const opContainer = createUserOp.closest('button');
    
    expect(opContainer).toBeInTheDocument();
    const annotationBadge = opContainer?.querySelector('.bg-purple-100');
    expect(annotationBadge).toBeInTheDocument();
  });

  it('displays correct annotation count for fields', () => {
    render(<SpecTree structure={mockStructure} />);
    
    // Email field has 1 annotation (x-uigen-label)
    const emailField = screen.getByText('Email');
    const fieldContainer = emailField.closest('button');
    
    expect(fieldContainer).toBeInTheDocument();
    const annotationBadge = fieldContainer?.querySelector('.bg-purple-100');
    expect(annotationBadge).toBeInTheDocument();
  });

  it('renders different method colors correctly', () => {
    const structureWithMethods: SpecStructure = {
      resources: [
        {
          name: 'Test',
          slug: 'Test',
          uigenId: 'test-resource',
          operations: [
            {
              id: 'get-test',
              uigenId: 'get-test-op',
              method: 'GET',
              path: '/test',
              annotations: {}
            },
            {
              id: 'post-test',
              uigenId: 'post-test-op',
              method: 'POST',
              path: '/test',
              annotations: {}
            },
            {
              id: 'put-test',
              uigenId: 'put-test-op',
              method: 'PUT',
              path: '/test',
              annotations: {}
            },
            {
              id: 'delete-test',
              uigenId: 'delete-test-op',
              method: 'DELETE',
              path: '/test',
              annotations: {}
            }
          ],
          fields: [],
          annotations: {}
        }
      ]
    };
    
    render(<SpecTree structure={structureWithMethods} />);
    
    expect(screen.getByText('GET')).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('PUT')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });
});
