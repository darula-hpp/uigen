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

/**
 * Application configuration metadata
 */
export interface AppConfig {
  /** Custom application name (overrides OpenAPI title) */
  name?: string;
  
  /** Application icon URL or path (used for favicon and header) */
  icon?: string;
  
  /** Allow arbitrary metadata for future extensibility */
  [key: string]: unknown;
}

export interface UIGenApp {
  meta: AppMeta;
  resources: Resource[];
  auth: AuthConfig;
  dashboard: DashboardConfig;
  servers: ServerConfig[];
  activeServer?: ServerConfig;
  parsingErrors?: ParsingError[];
  /** Global layout configuration */
  layoutConfig?: LayoutConfig;
  /** Landing page configuration */
  landingPageConfig?: LandingPageConfig;
  /** Application configuration */
  appConfig?: AppConfig;
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
  __profileAnnotation?: boolean; // Marks resource as profile resource for specialized rendering (x-uigen-profile)
  /** Layout override for this resource (overrides global layout configuration) */
  layoutOverride?: LayoutConfig;
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

/**
 * Supported layout types
 */
export type LayoutType = 
  | 'sidebar'           // Default: sidebar + topbar + content
  | 'centered'          // Centered container (auth pages)
  | 'dashboard-grid'    // Grid layout for dashboards
  | string;             // Allow custom layouts via plugins

/**
 * Responsive column configuration for grid layouts
 */
export interface ResponsiveColumns {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}

/**
 * Layout metadata (strategy-specific configuration)
 */
export interface LayoutMetadata {
  // Sidebar layout options
  sidebarWidth?: number;
  sidebarCollapsible?: boolean;
  sidebarDefaultCollapsed?: boolean;
  
  // Centered layout options
  maxWidth?: number;
  showHeader?: boolean;
  verticalCenter?: boolean;
  
  // Dashboard grid options
  columns?: ResponsiveColumns;
  gap?: number;
  
  // Responsive breakpoints
  breakpoints?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  
  // Allow arbitrary metadata for custom layouts
  [key: string]: unknown;
}

/**
 * Layout configuration in the IR
 */
export interface LayoutConfig {
  /** Layout strategy type identifier */
  type: LayoutType;
  
  /** Layout-specific configuration metadata */
  metadata?: LayoutMetadata;
}

/**
 * Shared CTA button configuration used across landing page sections
 */
export interface CtaButton {
  /** Button text */
  text: string;
  
  /** Button URL */
  url: string;
}

/**
 * Feature item for features section
 */
export interface FeatureItem {
  /** Feature title */
  title: string;
  
  /** Feature description */
  description: string;
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Optional image URL */
  image?: string;
}

/**
 * Step item for how it works section
 */
export interface StepItem {
  /** Step title */
  title: string;
  
  /** Step description */
  description: string;
  
  /** Optional step number */
  stepNumber?: number;
  
  /** Optional image URL */
  image?: string;
}

/**
 * Testimonial item for testimonials section
 */
export interface TestimonialItem {
  /** Testimonial quote */
  quote: string;
  
  /** Author name */
  author: string;
  
  /** Optional author title/position */
  authorTitle?: string;
  
  /** Optional author image URL */
  authorImage?: string;
  
  /** Optional rating (1-5) */
  rating?: number;
}

/**
 * Pricing plan for pricing section
 */
export interface PricingPlan {
  /** Plan name */
  name: string;
  
  /** Plan price */
  price: string;
  
  /** List of features */
  features: string[];
  
  /** Whether this plan is highlighted */
  highlighted?: boolean;
  
  /** Optional CTA button text */
  ctaText?: string;
  
  /** Optional CTA button URL */
  ctaUrl?: string;
}

/**
 * FAQ item for FAQ section
 */
export interface FaqItem {
  /** Question text */
  question: string;
  
  /** Answer text */
  answer: string;
  
  /** Optional category for grouping */
  category?: string;
}

/**
 * Link item for footer section
 */
export interface FooterLink {
  /** Link text */
  text: string;
  
  /** Link URL */
  url: string;
}

/**
 * Social link item for footer section
 */
export interface SocialLink {
  /** Platform name (e.g., twitter, linkedin, github) */
  platform: string;
  
  /** Platform URL */
  url: string;
}

/**
 * Hero section configuration
 */
export interface HeroSection {
  /** Whether this section is enabled */
  enabled: boolean;
  
  /** Hero headline */
  headline?: string;
  
  /** Hero subheadline */
  subheadline?: string;
  
  /** Primary CTA button */
  primaryCta?: CtaButton;
  
  /** Secondary CTA button */
  secondaryCta?: CtaButton;
  
  /** Optional background image URL */
  backgroundImage?: string;
}

/**
 * Features section configuration
 */
export interface FeaturesSection {
  /** Whether this section is enabled */
  enabled: boolean;
  
  /** Section title */
  title?: string;
  
  /** List of feature items */
  items?: FeatureItem[];
}

/**
 * How It Works section configuration
 */
export interface HowItWorksSection {
  /** Whether this section is enabled */
  enabled: boolean;
  
  /** Section title */
  title?: string;
  
  /** List of step items */
  steps?: StepItem[];
}

/**
 * Testimonials section configuration
 */
export interface TestimonialsSection {
  /** Whether this section is enabled */
  enabled: boolean;
  
  /** Section title */
  title?: string;
  
  /** List of testimonial items */
  items?: TestimonialItem[];
}

/**
 * Pricing section configuration
 */
export interface PricingSection {
  /** Whether this section is enabled */
  enabled: boolean;
  
  /** Section title */
  title?: string;
  
  /** List of pricing plans */
  plans?: PricingPlan[];
}

/**
 * FAQ section configuration
 */
export interface FaqSection {
  /** Whether this section is enabled */
  enabled: boolean;
  
  /** Section title */
  title?: string;
  
  /** List of FAQ items */
  items?: FaqItem[];
}

/**
 * CTA section configuration
 */
export interface CtaSection {
  /** Whether this section is enabled */
  enabled: boolean;
  
  /** CTA headline */
  headline?: string;
  
  /** CTA subheadline */
  subheadline?: string;
  
  /** Primary CTA button */
  primaryCta?: CtaButton;
  
  /** Secondary CTA button */
  secondaryCta?: CtaButton;
  
  /** Background style (solid, gradient, image) */
  backgroundStyle?: string;
  
  /** Optional background image URL */
  backgroundImage?: string;
}

/**
 * Footer section configuration
 */
export interface FooterSection {
  /** Whether this section is enabled */
  enabled: boolean;
  
  /** Company name */
  companyName?: string;
  
  /** List of footer links */
  links?: FooterLink[];
  
  /** List of social links */
  socialLinks?: SocialLink[];
  
  /** Copyright text */
  copyrightText?: string;
  
  /** List of legal links (privacy policy, terms, etc.) */
  legalLinks?: FooterLink[];
}

/**
 * Container for all landing page section configurations
 */
export interface LandingPageSections {
  /** Hero section configuration */
  hero?: HeroSection;
  
  /** Features section configuration */
  features?: FeaturesSection;
  
  /** How It Works section configuration */
  howItWorks?: HowItWorksSection;
  
  /** Testimonials section configuration */
  testimonials?: TestimonialsSection;
  
  /** Pricing section configuration */
  pricing?: PricingSection;
  
  /** FAQ section configuration */
  faq?: FaqSection;
  
  /** CTA section configuration */
  cta?: CtaSection;
  
  /** Footer section configuration */
  footer?: FooterSection;
}

/**
 * Complete landing page configuration
 */
export interface LandingPageConfig {
  /** Whether landing page generation is enabled */
  enabled: boolean;
  
  /** Section configurations */
  sections: LandingPageSections;
}
