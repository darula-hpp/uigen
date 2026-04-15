import type { Resource, Operation } from '@uigen-dev/core';
import type { ReactNode, ComponentType } from 'react';

/**
 * Override mode determines the level of control an override has over a view.
 * Priority order: component > render > hooks > none
 */
export type OverrideMode = 'component' | 'render' | 'hooks' | 'none';

/**
 * Props passed to component mode overrides.
 * Component mode gives full ownership including data fetching and routing.
 */
export interface OverrideComponentProps {
  resource: Resource;
  operation?: Operation;
}

/**
 * Props passed to render mode override functions.
 * Render mode: UIGen fetches data, override controls rendering.
 */
export interface OverrideRenderProps<TData = unknown> {
  resource: Resource;
  operation?: Operation;
  data: TData | undefined;
  isLoading: boolean;
  error: Error | null;
  [key: string]: unknown; // View-specific extras
}

/**
 * Props passed to useHooks mode override functions.
 * UseHooks mode: side effects only, built-in view renders normally.
 */
export interface OverrideHookProps {
  resource: Resource;
  operation?: Operation;
}

/**
 * Override definition structure.
 * Defines which view to target and how to customize it.
 */
export interface OverrideDefinition<TData = unknown> {
  /**
   * Stable identifier matching resource.uigenId or operation.uigenId.
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

/**
 * View-specific render props for ListView.
 */
export interface ListRenderProps<TData = any[]> extends OverrideRenderProps<TData> {
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages?: number;
    goToPage: (page: number) => void;
    nextPage: () => void;
    previousPage: () => void;
  };
}

/**
 * View-specific render props for DetailView.
 */
export interface DetailRenderProps<TData = Record<string, unknown>>
  extends OverrideRenderProps<TData> {
  operation: Operation; // Always present for detail view
}

/**
 * View-specific render props for FormView.
 */
export interface FormRenderProps<TData = Record<string, unknown>>
  extends OverrideRenderProps<TData> {
  operation: Operation;
  mode: 'create' | 'edit';
  formMethods: {
    register: any; // UseFormRegister<any>
    handleSubmit: any; // UseFormHandleSubmit<any>
    errors: Record<string, any>; // FieldErrors
    isSubmitting: boolean;
  };
}

/**
 * View-specific render props for SearchView.
 */
export interface SearchRenderProps<TData = any[]> extends OverrideRenderProps<TData> {
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string>) => void;
  clearFilters: () => void;
}

/**
 * View-specific render props for WizardView.
 */
export interface WizardRenderProps<TData = Record<string, unknown>>
  extends OverrideRenderProps<TData> {
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}
