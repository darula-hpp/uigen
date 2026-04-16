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

export interface UIGenApp {
  meta: AppMeta;
  resources: Resource[];
  auth: AuthConfig;
  dashboard: DashboardConfig;
  servers: ServerConfig[];
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
  description?: string;
  operations: Operation[];
  schema: SchemaNode;
  relationships: Relationship[];
  pagination?: PaginationHint;
}

export interface Relationship {
  target: string;
  type: 'hasMany' | 'belongsTo';
  path: string;
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
  parameters: Parameter[];
  requestBody?: SchemaNode;
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
}
