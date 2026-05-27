export * from './ir/types.js';
export * from './ir/override-types.js';
export * from './adapter/index.js';
export * from './reconciler/index.js';

// Config types and browser-safe utilities (ConfigLoader lives in @uigen-dev/core/config)
export type {
  ConfigFile,
  ConfigValidationResult,
  ConfigValidationError,
  RelationshipConfig,
  NodePosition,
  CanvasLayout,
  AnnotationConfig,
} from './config/types.js';
export type { ConfigLoaderOptions } from './config/loader.js';
export { IconValidator, iconValidator } from './config/icon-validator.js';
export type { IIconValidator, IconLibrary } from './config/icon-validator.js';

// Datetime utilities
export { default as dayjs } from './lib/dayjs.js';
export { DateTimeFormatter } from './lib/datetime-formatter.js';
export { DateTimeParser } from './lib/datetime-parser.js';
export { DateTimeApiConverter } from './lib/datetime-api-converter.js';
export { DateTimeFormats } from './lib/datetime-formats.js';

// Shared renderer utilities
export {
  resolveDashboardPath,
  resourceHasIndexView,
  resolveFormDismissPath,
  resolveCreateFormOperation,
} from './lib/navigation-paths.js';
export {
  CHART_DOT_HIDE_THRESHOLD,
  resolveChartAnimationActive,
  resolveChartDotVisible,
} from './lib/chart-display-props.js';
export {
  validateEmail,
  validateRequired,
  validatePattern,
  validateUsername,
  validateLength,
  validateRange,
  validateField,
  formatValidationErrors,
  validateFields,
} from './lib/validation.js';
export type { ValidationResult, FieldSchema } from './lib/validation.js';
export { buildOperationUrl, buildProxiedApiUrl } from './lib/api-request-builder.js';
export type { BuildOperationUrlResult } from './lib/api-request-builder.js';
