/**
 * @uigen-dev/react-override
 * 
 * Override system for UIGen React renderer.
 * Enables selective view customization with three modes:
 * - component: Full ownership including data fetching
 * - render: UIGen fetches, override controls rendering
 * - useHooks: Side effects only
 */

// Registry
export { overrideRegistry, OverrideRegistry } from './registry';

// Reconciliation
export { reconcile } from './reconcile';

// Components and hooks
export { OverrideHooksHost, useOverrideData } from './OverrideHooksHost';

// Type definitions
export type {
  OverrideMode,
  OverrideDefinition,
  OverrideComponentProps,
  OverrideRenderProps,
  OverrideHookProps,
  ReconcileResult,
  ListRenderProps,
  DetailRenderProps,
  FormRenderProps,
  SearchRenderProps,
  WizardRenderProps,
} from './types';
