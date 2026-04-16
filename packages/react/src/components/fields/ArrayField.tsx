import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FieldProps } from './ComponentRegistry';
import { useFormContext, useWatch } from 'react-hook-form';

/**
 * ArrayField component with add/remove functionality
 * Implements Requirements 33.10, 51.1-51.4
 */
export function ArrayField({ schema, register, errors }: FieldProps) {
  const error = errors[schema.key];
  const { setValue, getValues } = useFormContext();
  
  // Get current array value from form
  const currentValue = useWatch({ name: schema.key }) || [];
  const [items, setItems] = useState<any[]>(
    Array.isArray(currentValue) && currentValue.length > 0 ? currentValue : ['']
  );

  // Sync items with form value
  useEffect(() => {
    if (Array.isArray(currentValue) && currentValue.length > 0) {
      setItems(currentValue);
    }
  }, [currentValue]);

  const handleAddItem = () => {
    const newItems = [...items, ''];
    setItems(newItems);
    // Don't update form value when adding empty item
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    const finalItems = newItems.length > 0 ? newItems : [''];
    setItems(finalItems);
    // Filter out empty strings before setting form value
    const filteredItems = finalItems.filter(item => item !== '' && item !== null && item !== undefined);
    setValue(schema.key, filteredItems.length > 0 ? filteredItems : undefined);
  };

  const handleItemChange = (index: number, value: any) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
    // Filter out empty strings before setting form value
    const filteredItems = newItems.filter(item => item !== '' && item !== null && item !== undefined);
    setValue(schema.key, filteredItems.length > 0 ? filteredItems : undefined);
  };

  // For primitive arrays, render as individual inputs
  if (!schema.items || schema.items.type === 'string' || schema.items.type === 'number') {
    return (
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              id={`${schema.key}.${index}`}
              type={schema.items?.type === 'number' ? 'number' : 'text'}
              value={item || ''}
              onChange={(e) => {
                const value = schema.items?.type === 'number' 
                  ? (e.target.value ? Number(e.target.value) : '')
                  : e.target.value;
                handleItemChange(index, value);
              }}
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
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value);
      if (Array.isArray(parsed)) {
        setValue(schema.key, parsed);
      }
    } catch {
      // Invalid JSON, don't update
    }
  };

  return (
    <textarea
      id={schema.key}
      value={JSON.stringify(items, null, 2)}
      onChange={handleTextareaChange}
      className={`flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        error ? 'border-destructive' : ''
      }`}
      placeholder={`Enter ${schema.label} as JSON array`}
    />
  );
}
