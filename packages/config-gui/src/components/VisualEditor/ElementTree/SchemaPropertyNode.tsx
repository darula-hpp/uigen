import { useState } from 'react';
import type { FieldNode } from '../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../../contexts/AppContext.js';
import { IgnoreToggle } from '../IgnoreControls/IgnoreToggle.js';
import { IgnoreTooltip } from '../IgnoreControls/IgnoreTooltip.js';
import { IgnoreStateCalculator } from '../../../types/index.js';
import { buildAnnotationsMap, buildUpdatedAnnotations } from './shared-utils.js';

/**
 * Props for SchemaPropertyNode component
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3, 10.4, 10.5
 */
export interface SchemaPropertyNodeProps {
  field: FieldNode;
  /** Nesting depth for indentation, default 0 */
  level?: number;
  /** Whether the parent element is ignored */
  parentIgnored?: boolean;
}

/**
 * SchemaPropertyNode renders a schema property (field) with ignore support.
 *
 * Features:
 * - Field name, type, required indicator
 * - IgnoreToggle for x-uigen-ignore
 * - Visual dimming when ignored (opacity-50 on the row)
 * - Tree indentation for nested properties
 * - Expand/collapse for object/array type fields with children
 * - Recursively renders children using SchemaPropertyNode
 * - Wrapped in IgnoreTooltip
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3, 10.4, 10.5
 */
export function SchemaPropertyNode({
  field,
  level = 0,
  parentIgnored = false
}: SchemaPropertyNodeProps) {
  const { state, actions } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = Boolean(field.children && field.children.length > 0);

  // Build annotations map and compute ignore state
  const annotations = buildAnnotationsMap(state.config);
  const calculator = new IgnoreStateCalculator();
  const ignoreState = calculator.calculateState(field.path, 'property', annotations);
  const isPruned = calculator.isPruned(field.path, annotations);

  // The toggle is disabled when the parent is ignored and this element has no explicit override
  const isDisabled = isPruned && !ignoreState.isOverride;

  // Effective ignore: either explicitly ignored or inherited from parent
  const isEffectivelyIgnored = ignoreState.effective;

  // Extract element name for display
  const elementName = field.label || field.key;

  // --- Handlers ---

  function handleIgnoreChange(value: boolean) {
    if (value === true) {
      const updated = buildUpdatedAnnotations(state.config, field.path, 'x-uigen-ignore', true);
      actions.saveConfig(updated);
    } else {
      // Remove the annotation (or set to false if it's an override)
      const newValue = parentIgnored || isPruned ? false : undefined;
      const updated = buildUpdatedAnnotations(state.config, field.path, 'x-uigen-ignore', newValue);
      actions.saveConfig(updated);
    }
  }

  // Indentation class based on nesting level
  const indentClass = level > 0 ? `ml-${Math.min(level * 4, 16)}` : '';

  return (
    <div data-testid="schema-property-node" data-field-path={field.path}>
      <IgnoreTooltip
        ignoreState={ignoreState}
        elementName={elementName}
        isToggleSwitch={false}
      >
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${indentClass} ${isEffectivelyIgnored ? 'opacity-50' : ''}`}
          data-testid="schema-property-row"
        >
          {/* Expand/collapse button for fields with children */}
          {hasChildren ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={isExpanded ? `Collapse ${elementName}` : `Expand ${elementName}`}
              data-testid="expand-collapse-button"
            >
              {isExpanded ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ) : (
            <span className="w-3 flex-shrink-0" />
          )}

          {/* Field name */}
          <span className="text-sm text-gray-900 dark:text-white flex-shrink-0">
            {elementName}
            {field.required && (
              <span className="text-red-500 ml-1" aria-label="required">*</span>
            )}
          </span>

          {/* Field type */}
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">
            {field.type}
          </span>

          {/* Ignore toggle */}
          <div className="ml-auto flex-shrink-0">
            <IgnoreToggle
              elementPath={field.path}
              elementType="property"
              ignoreState={ignoreState}
              disabled={isDisabled}
              onChange={handleIgnoreChange}
            />
          </div>
        </div>
      </IgnoreTooltip>

      {/* Render children recursively */}
      {hasChildren && isExpanded && (
        <div data-testid="schema-property-children">
          {field.children!.map(child => (
            <SchemaPropertyNode
              key={child.path}
              field={child}
              level={level + 1}
              parentIgnored={isEffectivelyIgnored}
            />
          ))}
        </div>
      )}
    </div>
  );
}


