# IgnoreControls Components

UI components for managing x-uigen-ignore annotations in the Config GUI.

## Components

### IgnoreToggle

A toggle switch component for controlling x-uigen-ignore annotations on spec elements.

**Features:**
- Toggle switch with visual state indicators (active/ignored)
- Disabled state for pruned children (when parent is ignored)
- Annotation badges showing source (Explicit/Inherited/Override)
- Full accessibility support with ARIA attributes
- Consistent styling with the rest of the Config GUI

**Props:**

```typescript
interface IgnoreToggleProps {
  elementPath: string;        // Path in spec (e.g., "components.schemas.User.properties.email")
  elementType: ElementType;   // Type: 'property' | 'schema' | 'parameter' | 'requestBody' | 'response' | 'operation' | 'path'
  ignoreState: IgnoreState;   // Current state with explicit, effective, and source info
  disabled: boolean;          // Whether toggle is disabled (e.g., parent is ignored)
  onChange: (value: boolean) => void;  // Callback when toggle changes
}
```

**Usage Example:**

```tsx
import { IgnoreToggle } from './IgnoreControls';
import { IgnoreStateCalculator } from '../../../lib/ignore-state-calculator';

function PropertyNode({ property, annotations }) {
  const calculator = new IgnoreStateCalculator();
  const ignoreState = calculator.calculateState(
    property.path,
    'property',
    annotations
  );
  const isPruned = calculator.isPruned(property.path, annotations);
  
  const handleIgnoreChange = (value: boolean) => {
    // Update annotations in config file
    updateAnnotation(property.path, 'x-uigen-ignore', value);
  };
  
  return (
    <div>
      <span>{property.name}</span>
      <IgnoreToggle
        elementPath={property.path}
        elementType="property"
        ignoreState={ignoreState}
        disabled={isPruned}
        onChange={handleIgnoreChange}
      />
    </div>
  );
}
```

**Visual States:**

- **Active (not ignored)**: Green toggle, "active" label
- **Ignored**: Red toggle, "ignored" label  
- **Disabled**: Gray toggle with reduced opacity, cursor-not-allowed

**Annotation Badges:**

- **Explicit**: Blue badge - annotation set directly on this element
- **Inherited**: Amber badge - inherited from parent element
- **Override**: Purple badge - child explicitly includes despite parent ignore

**Accessibility:**

- Full keyboard support (Space/Enter to toggle)
- ARIA labels and descriptions
- Screen reader announcements
- Proper focus indicators

### AnnotationBadge

A standalone badge component that displays the source of an ignore annotation. This component is extracted from IgnoreToggle and can be used independently across the UI.

**Features:**
- Visual indicators for annotation source (Explicit/Inherited/Override)
- Distinct colors for each badge type
- Visible without hover interaction
- Accessible tooltips explaining badge meaning
- Dark mode support

**Props:**

```typescript
interface AnnotationBadgeProps {
  ignoreState: IgnoreState;   // Current state with explicit, effective, and source info
  elementName?: string;       // Optional element name for tooltip context
}
```

**Usage Example:**

```tsx
import { AnnotationBadge } from './IgnoreControls';

function ElementInfo({ element, ignoreState }) {
  return (
    <div>
      <span>{element.name}</span>
      <AnnotationBadge
        ignoreState={ignoreState}
        elementName={element.name}
      />
    </div>
  );
}
```

**Badge Types:**

- **Override Badge** (Purple): Displayed when a child element explicitly includes despite parent being ignored
  - Color: Purple (bg-purple-100, text-purple-800)
  - Tooltip: "Explicitly included despite parent being ignored"
  
- **Explicit Badge** (Blue): Displayed when annotation is set directly on the element
  - Color: Blue (bg-blue-100, text-blue-800)
  - Tooltip: "Annotation set directly on this element"
  
- **Inherited Badge** (Amber): Displayed when state is inherited from parent
  - Color: Amber (bg-amber-100, text-amber-800)
  - Tooltip: "Inherited from parent: [parent name]"
  
- **No Badge**: No badge is shown for default state (no annotations)

**When to Use:**

Use AnnotationBadge independently when you need to display annotation source information without the toggle switch:
- In summary panels showing annotation hierarchy
- In reference tracking panels
- In export summaries
- In precedence visualization panels

**Accessibility:**

- Tooltips with descriptive text
- Sufficient color contrast (meets WCAG AA standards)
- Visible without hover (always rendered when applicable)

## Requirements

These components implement requirements from the config-gui-enhanced-ignore-support spec:

**IgnoreToggle**: Requirements 1.1-1.8
- Toggle switches for all element types
- Visual state display
- Disabled state handling
- onChange event emission
- TypeScript interfaces
- Accessibility support

**AnnotationBadge**: Requirements 3.1-3.5
- Explicit badge for direct annotations
- Inherited badge for inherited state
- Override badge for child overrides
- Distinct colors/icons for each badge type
- Badges visible without hover
