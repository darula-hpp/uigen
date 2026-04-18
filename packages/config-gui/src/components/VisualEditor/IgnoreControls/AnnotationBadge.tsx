import type { IgnoreState } from '../../../types/index.js';

/**
 * Props for AnnotationBadge component
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export interface AnnotationBadgeProps {
  /** Current ignore state including explicit, effective, and source information */
  ignoreState: IgnoreState;
  
  /** Optional element name for tooltip context */
  elementName?: string;
}

/**
 * Badge type information including text, styling, and tooltip
 */
interface BadgeInfo {
  text: string;
  className: string;
  tooltip: string;
}

/**
 * AnnotationBadge component displays visual indicators for annotation source.
 * 
 * Features:
 * - "Explicit" badge for direct annotations (blue)
 * - "Inherited" badge for inherited state from parent (amber)
 * - "Override" badge for child overrides (purple)
 * - Distinct colors for each badge type
 * - Visible without hover interaction
 * - Accessible tooltips explaining the badge meaning
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 * 
 * Usage:
 * ```tsx
 * <AnnotationBadge
 *   ignoreState={state}
 *   elementName="email"
 * />
 * ```
 */
export function AnnotationBadge({
  ignoreState,
  elementName
}: AnnotationBadgeProps) {
  const badge = getBadgeInfo(ignoreState, elementName);
  
  // Don't render anything if no badge should be shown
  if (!badge) {
    return null;
  }
  
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
      data-testid="annotation-badge"
      title={badge.tooltip}
    >
      {badge.text}
    </span>
  );
}

// --- Helper Functions ---

/**
 * Get badge information based on ignore state
 * 
 * Returns badge text, CSS class, and tooltip for the annotation source indicator.
 * 
 * Badge types:
 * - Override: Purple badge when child explicitly includes despite parent ignore
 * - Explicit: Blue badge when annotation is set directly on the element
 * - Inherited: Amber badge when state is inherited from parent
 * - None: No badge for default state (no annotations)
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
function getBadgeInfo(
  ignoreState: IgnoreState,
  elementName?: string
): BadgeInfo | null {
  // Override badge (child explicitly includes despite parent ignore)
  // Requirement 3.3: Display "Override" badge for child overrides
  if (ignoreState.isOverride) {
    return {
      text: 'Override',
      className: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      tooltip: elementName
        ? `${elementName} is explicitly included despite parent being ignored`
        : 'Explicitly included despite parent being ignored'
    };
  }
  
  // Explicit annotation badge
  // Requirement 3.1: Display "Explicit" badge for direct annotations
  if (ignoreState.source === 'explicit') {
    return {
      text: 'Explicit',
      className: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      tooltip: elementName
        ? `Annotation set directly on ${elementName}`
        : 'Annotation set directly on this element'
    };
  }
  
  // Inherited state badge
  // Requirement 3.2: Display "Inherited" badge for inherited state
  if (ignoreState.source === 'inherited' && ignoreState.inheritedFrom) {
    const parentName = getElementName(ignoreState.inheritedFrom);
    return {
      text: 'Inherited',
      className: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
      tooltip: elementName
        ? `${elementName} inherits ignore state from parent: ${parentName}`
        : `Inherited from parent: ${parentName}`
    };
  }
  
  // No badge for default state
  // Requirement 3.5: Badges are visible without hover (only shown when applicable)
  return null;
}

/**
 * Extract the element name from its path
 * 
 * Examples:
 * - "components.schemas.User.properties.email" -> "email"
 * - "paths./users.get" -> "get"
 * - "components.schemas.User" -> "User"
 */
function getElementName(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] || path;
}
