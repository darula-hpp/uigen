# Visual Editor Components

This directory contains components for the visual editor interface of the Config GUI.

## SpecTree Component

The `SpecTree` component displays the hierarchical structure of an API spec in a tree view format.

### Features

- **Tree View**: Displays resources, operations, and fields in a hierarchical structure
- **Expand/Collapse**: Interactive expand/collapse functionality for tree nodes
- **Visual Indicators**: Shows annotation badges on elements that have annotations applied
- **Type Icons**: Displays appropriate icons for different field types (string, number, boolean, object, array)
- **Method Badges**: Color-coded badges for HTTP methods (GET, POST, PUT, DELETE, etc.)
- **Required Fields**: Visual indicator (*) for required fields

### Usage

```tsx
import { SpecTree } from './components/VisualEditor';
import { SpecParser } from './lib/spec-parser';

// Parse the UIGenApp to get the spec structure
const parser = new SpecParser();
const structure = parser.parse(uigenApp);

// Render the tree
<SpecTree 
  structure={structure}
  onNodeSelect={(path, type) => {
    console.log(`Selected ${type}: ${path}`);
  }}
/>
```

### Props

- `structure: SpecStructure` - The parsed spec structure to display
- `onNodeSelect?: (path: string, type: 'resource' | 'operation' | 'field') => void` - Optional callback when a node is clicked

### Structure

The component is composed of several sub-components:

- `ResourceTreeNode` - Displays a resource with its operations and fields
- `OperationTreeNode` - Displays an operation with method badge and path
- `FieldTreeNode` - Displays a field with type icon and nested children
- `AnnotationIndicator` - Badge showing the count of annotations on an element

### Styling

The component uses Tailwind CSS classes for styling and follows the design patterns established in other Config GUI components.

### Requirements

Implements requirements:
- 6.1: Display complete spec structure in visual representation
- 6.9: Display existing annotations as visual indicators on spec structure
