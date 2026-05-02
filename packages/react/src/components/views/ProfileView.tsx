import { useApiCall } from '@/hooks/useApiCall';
import { useParams } from 'react-router-dom';
import type { UIGenApp, Resource, Operation, SchemaNode } from '@uigen-dev/core';
import { findProfileResource } from '@/lib/profile-resources';
import { useState } from 'react';
import { Edit2, User, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Maps the React Router :id param to the actual path parameter name in the operation.
 * e.g. /v1/users/{userId} → { userId: 'user123' }
 */
function resolvePathParams(operation: Operation, id: string | undefined): Record<string, string> {
  if (!id) return {};
  const matches = operation.path.match(/\{([^}]+)\}/g);
  if (!matches || matches.length === 0) return { id };
  // Use the last path param (typically the resource identifier)
  const paramName = matches[matches.length - 1].slice(1, -1);
  return { [paramName]: id };
}

/**
 * Groups fields by semantic similarity and common prefixes
 * Returns a map of group names to field arrays
 */
function groupFields(fields: SchemaNode[]): Map<string, SchemaNode[]> {
  const groups = new Map<string, SchemaNode[]>();
  const ungrouped: SchemaNode[] = [];

  // Define semantic groups
  const semanticGroups: Record<string, string[]> = {
    'Contact Information': ['email', 'phone', 'mobile', 'telephone', 'contact'],
    'Personal Information': ['name', 'first', 'last', 'birth', 'age', 'gender', 'bio'],
    'Address': ['address', 'street', 'city', 'state', 'zip', 'postal', 'country'],
    'Account': ['username', 'password', 'role', 'status', 'verified', 'active'],
  };

  for (const field of fields) {
    const fieldKey = field.key.toLowerCase();
    let grouped = false;

    // Check for common prefixes (e.g., contact_, billing_)
    const prefixMatch = fieldKey.match(/^([a-z]+)_/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const groupName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(field);
      grouped = true;
      continue;
    }

    // Check semantic groups
    for (const [groupName, keywords] of Object.entries(semanticGroups)) {
      if (keywords.some(keyword => fieldKey.includes(keyword))) {
        if (!groups.has(groupName)) {
          groups.set(groupName, []);
        }
        groups.get(groupName)!.push(field);
        grouped = true;
        break;
      }
    }

    if (!grouped) {
      ungrouped.push(field);
    }
  }

  // Add ungrouped fields to "General" section if any exist
  if (ungrouped.length > 0) {
    groups.set('General', ungrouped);
  }

  return groups;
}

/**
 * Finds the first image field in the schema for avatar display
 */
function findAvatarField(fields: SchemaNode[]): SchemaNode | undefined {
  return fields.find(field => 
    field.type === 'string' && 
    (field.format === 'uri' || field.format === 'url') &&
    (field.key.toLowerCase().includes('avatar') || 
     field.key.toLowerCase().includes('image') ||
     field.key.toLowerCase().includes('photo') ||
     field.key.toLowerCase().includes('picture'))
  );
}

interface ProfileViewProps {
  config: UIGenApp;
  resourceSlug?: string; // Optional, defaults to first profile resource
}

/**
 * ProfileAvatar - displays user avatar image
 * Requirement 4.4: Display avatar when image field present
 */
function ProfileAvatar({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);

  if (imageError || !src) {
    return (
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <User className="w-10 h-10 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-20 h-20 rounded-full object-cover border-2 border-border"
      onError={() => setImageError(true)}
    />
  );
}

/**
 * ProfileCard - container for profile information sections
 * Requirement 4.2: Card-based layout
 */
function ProfileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-muted rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

/**
 * ProfileFieldGroup - groups related fields with visual separation
 * Requirement 4.3: Field grouping logic
 */
function ProfileFieldGroup({ fields, data }: { fields: SchemaNode[]; data: Record<string, unknown> }) {
  return (
    <dl className="space-y-3 sm:space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">
            {field.label || field.key}
          </dt>
          <dd className="text-base break-words">
            {formatValue(data[field.key], field)}
          </dd>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
      ))}
    </dl>
  );
}

/**
 * ProfileEditButton - triggers edit mode
 * Requirement 4.5: Edit functionality when update operation available
 */
function ProfileEditButton({ onClick, isEditing }: { onClick: () => void; isEditing: boolean }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="sm"
      className="gap-2"
      aria-label={isEditing ? 'Cancel editing' : 'Edit profile'}
    >
      {isEditing ? (
        <>
          <X className="w-4 h-4" />
          Cancel
        </>
      ) : (
        <>
          <Edit2 className="w-4 h-4" />
          Edit
        </>
      )}
    </Button>
  );
}

/**
 * ProfileEditForm - inline edit form for profile fields
 * Requirement 4.5: Edit functionality
 */
function ProfileEditForm({ 
  fields, 
  data, 
  onSave, 
  onCancel 
}: { 
  fields: SchemaNode[]; 
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, unknown>>(data);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label || field.key}
          </Label>
          <Input
            id={field.key}
            type={getInputType(field)}
            value={String(formData[field.key] || '')}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="w-full"
          />
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" className="gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Get appropriate input type for field
 */
function getInputType(field: SchemaNode): string {
  if (field.format === 'email') return 'email';
  if (field.format === 'uri' || field.format === 'url') return 'url';
  if (field.format === 'date') return 'date';
  if (field.format === 'date-time') return 'datetime-local';
  if (field.type === 'number' || field.type === 'integer') return 'number';
  if (field.type === 'boolean') return 'checkbox';
  return 'text';
}

/**
 * ProfileView component - displays profile resources with a card-based layout
 * optimized for viewing and editing user profile information.
 * 
 * Implements Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
export function ProfileView({ config, resourceSlug }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { id } = useParams<{ id: string }>();
  
  // Find the profile resource to display
  // If resourceSlug is provided, use that; otherwise find the first profile resource
  let resource: Resource | undefined;
  
  if (resourceSlug) {
    resource = config.resources.find(r => r.slug === resourceSlug && r.__profileAnnotation === true);
  } else {
    resource = findProfileResource(config);
  }
  
  // If no profile resource found, show error state
  if (!resource) {
    return (
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <div className="p-6 border border-muted rounded-lg text-center">
            <h2 className="text-xl font-semibold mb-2">No Profile Configured</h2>
            <p className="text-muted-foreground mb-4">
              No profile resource is available in this application.
            </p>
            <a href="/" className="text-primary hover:underline">
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // Find the detail operation (GET) for fetching profile data
  const detailOp = resource.operations.find(op => op.viewHint === 'detail');
  
  // Find the update operation (PUT/PATCH) for editing
  const updateOp = resource.operations.find(op => 
    op.viewHint === 'update' || 
    op.method === 'PUT' || 
    op.method === 'PATCH'
  );
  
  if (!detailOp) {
    return (
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <div className="p-6 border border-destructive bg-destructive/10 text-destructive rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Profile Data Cannot Be Loaded</h2>
            <p className="mb-4">
              The profile resource does not have a GET operation configured.
            </p>
            <a href="/" className="text-primary hover:underline">
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // Fetch profile data using the detail operation
  // Requirement 4.6: Fetch profile data using resource's GET operation
  const { data, isLoading, error, refetch } = useApiCall({
    operation: detailOp,
    pathParams: resolvePathParams(detailOp, id),
    enabled: !!detailOp,
  });

  // Handle save
  const handleSave = async (updatedData: Record<string, unknown>) => {
    if (!updateOp) return;
    
    try {
      // TODO: Implement actual API call for update
      // For now, just close edit mode and refetch
      setIsEditing(false);
      await refetch();
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };
  
  // Requirement 4.6: Handle error state
  if (error) {
    return (
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <div className="p-6 border border-destructive bg-destructive/10 text-destructive rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
            <p className="mb-4">{error.message}</p>
            <a href="/" className="text-primary hover:underline">
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // Requirement 4.6: Handle loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          
          {/* Profile card skeleton */}
          <div className="border border-muted rounded-lg p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Get schema fields from response schema
  const schema = detailOp.responses['200']?.schema || detailOp.responses['2XX']?.schema || resource.schema;
  const fields = schema.children || [];
  
  // Find avatar field
  const avatarField = findAvatarField(fields);
  const avatarUrl = avatarField && data ? String(data[avatarField.key]) : '';
  
  // Group fields (excluding avatar field)
  const displayFields = fields.filter(f => f !== avatarField);
  const fieldGroups = groupFields(displayFields);
  
  return (
    <div className="p-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Profile Header - Requirement 4.4: Avatar display */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            {avatarField && (
              <ProfileAvatar 
                src={avatarUrl} 
                alt={data?.name ? String(data.name) : 'Profile'} 
              />
            )}
            <div>
              <h2 className="text-2xl font-bold">Profile</h2>
              {resource.description && (
                <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
              )}
            </div>
          </div>
          
          {/* Requirement 4.5: Edit button when update operation available */}
          {updateOp && !isEditing && (
            <ProfileEditButton 
              onClick={() => setIsEditing(true)} 
              isEditing={false}
            />
          )}
          {isEditing && (
            <ProfileEditButton 
              onClick={() => setIsEditing(false)} 
              isEditing={true}
            />
          )}
        </div>
        
        {/* Profile Data Cards - Requirement 4.2, 4.3: Card-based layout with field grouping */}
        {data && (
          <div className="space-y-4 sm:space-y-6">
            {isEditing ? (
              <ProfileCard title="Edit Profile">
                <ProfileEditForm
                  fields={displayFields}
                  data={data}
                  onSave={handleSave}
                  onCancel={() => setIsEditing(false)}
                />
              </ProfileCard>
            ) : (
              Array.from(fieldGroups.entries()).map(([groupName, groupFields]) => (
                <ProfileCard key={groupName} title={groupName}>
                  <ProfileFieldGroup fields={groupFields} data={data} />
                </ProfileCard>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format value based on field type
 * Helper function for displaying field values appropriately
 */
function formatValue(value: unknown, field: { type: string; format?: string }): string {
  if (value === null || value === undefined) return '-';

  // Boolean formatting
  if (field.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Date formatting
  if (field.type === 'date' || field.format === 'date') {
    try {
      const date = new Date(value as string);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(value);
    }
  }

  // Date-time formatting
  if (field.format === 'date-time') {
    try {
      const date = new Date(value as string);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return String(value);
    }
  }

  // Number formatting
  if (field.type === 'number' || field.type === 'integer') {
    const num = Number(value);
    if (!isNaN(num)) {
      return num.toLocaleString('en-US');
    }
  }

  // Array formatting
  if (field.type === 'array' && Array.isArray(value)) {
    if (value.length === 0) return 'None';
    return value.map(v => String(v)).join(', ');
  }

  // Object formatting
  if (field.type === 'object' && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}
