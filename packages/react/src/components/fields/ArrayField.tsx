import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';

/**
 * ArrayField component with add/remove functionality
 * Implements Requirements 33.10, 51.1-51.4
 */
export function ArrayField({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  const [items, setItems] = useState<string[]>(['']);

  const handleAddItem = () => {
    setItems([...items, '']);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length > 0 ? newItems : ['']);
  };

  // For primitive arrays, render as comma-separated input for simplicity
  // For complex arrays, this would need to be enhanced
  if (!schema.items || schema.items.type === 'string' || schema.items.type === 'number') {
    return (
      <div className="space-y-2">
        {items.map((_, index) => (
          <div key={index} className="flex gap-2">
            <Input
              id={`${schema.key}.${index}`}
              type={schema.items?.type === 'number' ? 'number' : 'text'}
              {...register(`${schema.key}.${index}` as any)}
              className={error ? 'border-destructive' : ''}
              placeholder={`Item ${index + 1}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRemoveItem(index)}
              disabled={items.length === 1}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
        >
          Add Item
        </Button>
      </div>
    );
  }

  // For object arrays, render as JSON textarea for now
  return (
    <textarea
      id={schema.key}
      {...register(schema.key)}
      className={`flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        error ? 'border-destructive' : ''
      }`}
      placeholder={`Enter ${schema.label} as JSON array`}
    />
  );
}
