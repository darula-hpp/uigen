import { componentRegistry } from './ComponentRegistry';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { CheckboxField } from './CheckboxField';
import { SelectField } from './SelectField';
import { DatePicker } from './DatePicker';
import { DateTimePicker } from './DateTimePicker';
import { FileUpload } from './FileUpload';
import { ArrayField } from './ArrayField';
import { ObjectField } from './ObjectField';
import { RefSelectField } from './RefSelectField';

/**
 * Register default field components
 * Implements Requirements 33.1-33.11
 */
export function registerDefaultComponents() {
  // Ref annotation (x-uigen-ref)
  componentRegistry.registerField('ref', RefSelectField);
  
  // String types
  componentRegistry.registerField('string', TextField);
  
  // Number types
  componentRegistry.registerField('number', NumberField);
  componentRegistry.registerField('integer', NumberField);
  
  // Boolean type
  componentRegistry.registerField('boolean', CheckboxField);
  
  // Enum type
  componentRegistry.registerField('enum', SelectField);
  
  // Date types
  componentRegistry.registerField('string:date', DatePicker);
  componentRegistry.registerField('date', DatePicker);
  componentRegistry.registerField('string:date-time', DateTimePicker);
  
  // File type
  componentRegistry.registerField('file', FileUpload);
  
  // Complex types
  componentRegistry.registerField('array', ArrayField);
  componentRegistry.registerField('object', ObjectField);
}

// Auto-register default components on module load
registerDefaultComponents();

// Export all components and registry
export { componentRegistry } from './ComponentRegistry';
export type { FieldProps, FieldComponent } from './ComponentRegistry';
export {
  TextField,
  NumberField,
  CheckboxField,
  SelectField,
  DatePicker,
  DateTimePicker,
  FileUpload,
  ArrayField,
  ObjectField,
  RefSelectField,
};
