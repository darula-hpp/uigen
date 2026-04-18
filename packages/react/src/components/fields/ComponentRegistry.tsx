import type { SchemaNode } from '@uigen-dev/core';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

export interface FieldProps {
  schema: SchemaNode;
  value?: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
}

export type FieldComponent = React.ComponentType<FieldProps>;

/**
 * ComponentRegistry maps field types to React components
 * Implements Requirements 33.1-33.11
 */
class ComponentRegistry {
  private fieldComponents: Map<string, FieldComponent> = new Map();

  /**
   * Register a field component for a specific type
   */
  registerField(type: string, component: FieldComponent): void {
    this.fieldComponents.set(type, component);
  }

  /**
   * Get the appropriate field component for a schema node
   * Falls back to TextField for unknown types
   */
  getFieldComponent(schema: SchemaNode): FieldComponent {
    // Check for ref annotation first (x-uigen-ref takes precedence)
    if ((schema as any).refConfig) {
      const RefSelectField = this.fieldComponents.get('ref');
      if (RefSelectField) return RefSelectField;
    }

    // Check for format-specific components first
    if (schema.format) {
      const formatKey = `${schema.type}:${schema.format}`;
      const formatComponent = this.fieldComponents.get(formatKey);
      if (formatComponent) return formatComponent;
    }

    // Check for type-specific components
    const typeComponent = this.fieldComponents.get(schema.type);
    if (typeComponent) return typeComponent;

    // Default fallback
    const defaultComponent = this.fieldComponents.get('string');
    if (!defaultComponent) {
      throw new Error('No default field component registered');
    }
    return defaultComponent;
  }

  /**
   * Check if a component is registered for a given type
   */
  hasComponent(type: string): boolean {
    return this.fieldComponents.has(type);
  }

  /**
   * Get all registered field types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.fieldComponents.keys());
  }
}

// Export singleton instance
export const componentRegistry = new ComponentRegistry();
