export * from './ir/types.js';
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
