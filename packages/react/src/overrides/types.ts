import type { ReactNode, ComponentType } from 'react';
import type {
  OverrideMode,
  OverrideComponentProps,
  OverrideRenderProps,
  OverrideHookProps,
  ListRenderProps,
  DetailRenderProps,
  FormRenderProps,
  SearchRenderProps,
  WizardRenderProps,
} from '@uigen-dev/core';

export type {
  OverrideMode,
  OverrideComponentProps,
  OverrideRenderProps,
  OverrideHookProps,
  ListRenderProps,
  DetailRenderProps,
  FormRenderProps,
  SearchRenderProps,
  WizardRenderProps,
};

/**
 * Override definition structure.
 * Defines which view to target and how to customize it.
 */
export interface OverrideDefinition<TData = unknown> {
  /**
   * Stable identifier matching the override annotation ID.
   *
   * This should match the `id` property in the `x-uigen-override` annotation
   * in your OpenAPI spec config.
   *
   * Examples: "users", "users.list", "users.detail", "users.create"
   */
  targetId: string;

  /**
   * Full replacement component (highest priority).
   * Component owns data fetching, authentication, and routing.
   */
  component?: ComponentType<OverrideComponentProps>;

  /**
   * Render function receiving fetched data (middle priority).
   * UIGen handles data fetching, override controls rendering.
   */
  render?: (props: OverrideRenderProps<TData>) => ReactNode;

  /**
   * Side effect hook (lowest priority).
   * For analytics, title updates, subscriptions, etc.
   * Return value stored in context but not consumed by built-in views.
   */
  useHooks?: (props: OverrideHookProps) => Record<string, unknown> | void;
}

/**
 * Result of reconciliation - determines which override mode applies.
 */
export interface ReconcileResult {
  mode: OverrideMode;
  overrideComponent?: ComponentType<any>;
  renderFn?: (props: OverrideRenderProps) => ReactNode;
}
