export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ViewHint = 
  | 'list' 
  | 'detail' 
  | 'create' 
  | 'update' 
  | 'delete'
  | 'search' 
  | 'wizard' 
  | 'dashboard' 
  | 'action';

export type FieldType = 
  | 'string' 
  | 'number' 
  | 'integer' 
  | 'boolean'
  | 'object' 
  | 'array' 
  | 'enum' 
  | 'date' 
  | 'file';

export type FileTypeCategory = 'image' | 'document' | 'video' | 'audio' | 'generic';

export interface UIGenApp {
  meta: AppMeta;
  resources: Resource[];
  auth: AuthConfig;
  dashboard: DashboardConfig;
  servers: ServerConfig[];
  activeServer?: ServerConfig;
  parsingErrors?: ParsingError[];
}

export interface ParsingError {
  path: string;
  method: string;
  error: string;
}

export interface AppMeta {
  title: string;
  version: string;
  description?: string;
}

export interface ServerConfig {
  url: string;
  description?: string;
}

export interface AuthConfig {
  schemes: AuthScheme[];
  globalRequired: boolean;
  loginEndpoints?: LoginEndpoint[];
  refreshEndpoints?: RefreshEndpoint[];
  passwordResetEndpoints?: PasswordResetEndpoint[];
  signUpEndpoints?: SignUpEndpoint[];
}

export interface LoginEndpoint {
  path: string;
  method: 'POST';
  requestBodySchema: SchemaNode;
  responseSchema?: SchemaNode;
  tokenPath: string;
  description?: string;
}

export interface RefreshEndpoint {
  path: string;
  method: 'POST';
  requestBodySchema: SchemaNode;
  responseSchema?: SchemaNode;
}

export interface PasswordResetEndpoint {
  path: string;
  method: 'POST';
  requestBodySchema?: SchemaNode;
  description?: string;
}

export interface SignUpEndpoint {
  path: string;
  method: 'POST';
  requestBodySchema?: SchemaNode;
  description?: string;
}

export interface AuthScheme {
  type: 'bearer' | 'apiKey' | 'oauth2' | 'basic';
  name: string;
  in?: 'header' | 'query' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}

export interface DashboardConfig {
  enabled: boolean;
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  type: 'resourceCount' | 'recentActivity';
  resourceSlug?: string;
}

export interface Resource {
  name: string;
  slug: string;
  uigenId: string;
  label?: string; // Custom display label from x-uigen-label annotation
  schemaName?: string; // The actual OpenAPI schema name (e.g., "Template" from components/schemas)
  description?: string;
  operations: Operation[];
  schema: SchemaNode;
  relationships: Relationship[];
  pagination?: PaginationHint;
  isLibrary?: boolean; // Marks resources as reusable libraries that can be referenced by multiple consumer resources
}

export interface Relationship {
  target: string;
  type: 'hasMany' | 'belongsTo' | 'manyToMany';
  path: string;
  isReadOnly?: boolean;
}

export interface PaginationHint {
  style: 'offset' | 'cursor' | 'page';
  params: Record<string, string>;
}

export interface Operation {
  id: string;
  uigenId: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  operationId?: string; // OpenAPI operationId for deriving request body schema names
  parameters: Parameter[];
  requestBody?: SchemaNode;
  requestBodySchemaName?: string; // The actual schema name from components/schemas for request body
  requestContentType?: string;
  responses: Record<string, ResponseDescriptor>;
  viewHint: ViewHint;
  security?: SecurityRequirement[];
}

export interface SecurityRequirement {
  name: string;
  scopes?: string[];
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: SchemaNode;
  description?: string;
}

export interface ResponseDescriptor {
  description?: string;
  schema?: SchemaNode;
}

export interface SchemaNode {
  type: FieldType;
  key: string;
  label: string;
  required: boolean;
  children?: SchemaNode[];
  items?: SchemaNode;
  enumValues?: string[];
  format?: string;
  validations?: ValidationRule[];
  uiHint?: UIHint;
  description?: string;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  nullable?: boolean;
  deprecated?: boolean;
  fileMetadata?: FileMetadata;
  refConfig?: RefConfig;
  /**
   * Chart visualization configuration (optional)
   * Set by ChartHandler when x-uigen-chart annotation is present
   */
  chartConfig?: ChartConfig;
}

export interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'pattern' | 'minimum' | 'maximum' | 'minItems' | 'maxItems' | 'email' | 'url';
  value: string | number;
  message?: string;
}

export interface UIHint {
  widget?: 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'color';
  placeholder?: string;
  helpText?: string;
}

export interface FileMetadata {
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  multiple: boolean;
  accept: string;
  fileType: FileTypeCategory;
}

export interface RefConfig {
  resource: string;
  valueField: string;
  labelField: string;
  filter: Record<string, string | number | boolean>;
}

/**
 * Supported chart visualization types
 */
export type ChartType = 
  | 'line'      // Time-series and continuous data
  | 'bar'       // Categorical comparisons
  | 'pie'       // Part-to-whole relationships
  | 'scatter'   // Correlation analysis
  | 'area'      // Cumulative trends
  | 'radar'     // Multivariate data
  | 'donut';    // Part-to-whole with emphasis on total

/**
 * Configuration for a single data series in a multi-series chart
 */
export interface SeriesConfig {
  /** Field name to use for this series data */
  field: string;
  
  /** Display label for this series */
  label?: string;
  
  /** Color for this series (hex, rgb, or named color) */
  color?: string;
  
  /** Override chart type for this series (for mixed charts) */
  type?: ChartType;
}

/**
 * Chart display and behavior options
 */
export interface ChartOptions {
  /** Chart title */
  title?: string;
  
  /** Legend configuration */
  legend?: {
    show?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  
  /** Tooltip configuration */
  tooltip?: {
    enabled?: boolean;
    format?: string;
  };
  
  /** Responsive behavior */
  responsive?: boolean;
  
  /** X-axis specific options */
  xAxis?: {
    showGrid?: boolean;
    showLabels?: boolean;
    label?: string;
  };
  
  /** Y-axis specific options */
  yAxis?: {
    showGrid?: boolean;
    showLabels?: boolean;
    label?: string;
    scale?: 'linear' | 'logarithmic';
  };
  
  /** Additional library-specific options */
  [key: string]: unknown;
}

/**
 * Complete chart configuration stored in SchemaNode
 */
export interface ChartConfig {
  /** Type of chart to render */
  chartType: ChartType;
  
  /** Field name to use for x-axis */
  xAxis: string;
  
  /** Field name(s) to use for y-axis (string for single series, array for multi-series) */
  yAxis: string | string[];
  
  /** Configuration for multiple data series (optional, auto-generated if yAxis is array) */
  series?: SeriesConfig[];
  
  /** Field name to use for data point labels (optional, defaults to xAxis) */
  labels?: string;
  
  /** Chart display and behavior options (optional) */
  options?: ChartOptions;
}
