import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { PaymentProvider, PaymentProduct, PricingPageConfig, MonetizationConfig, PricingSourceType } from '../../../ir/types.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'info';
  parameterSchema: {
    type: 'object';
    properties: Record<string, {
      type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum';
      description?: string;
      enum?: string[];
      items?: any;
      properties?: Record<string, any>;
    }>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Payment provider configuration from OpenAPI spec
 */
export interface PaymentProviderConfig {
  provider: 'stripe' | 'paypal' | 'square';
  apiKey: string;
  publishableKey?: string;
  clientId?: string;
  clientSecret?: string;
  webhookSecret: string;
  mode: 'test' | 'live';
  currency?: string;
  enabled?: boolean;
}

/**
 * Payment product configuration from OpenAPI spec
 */
export interface PaymentProductConfig {
  id: string;
  name: string;
  description?: string;
  type: 'one-time' | 'subscription' | 'usage-based';
  price: number | 'custom';
  currency?: string;
  interval?: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  features?: string[];
  highlighted?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Pricing page configuration from OpenAPI spec
 */
export interface PricingPageAnnotation {
  enabled: boolean;
  source: PricingSourceType;
  products?: PaymentProductConfig[];
  endpoint?: string;
  override?: {
    id: string;
    enabled: boolean;
  };
}

/**
 * Payment annotation value structure
 */
export interface PaymentAnnotation {
  providers: PaymentProviderConfig[];
  products?: PaymentProductConfig[];
  pricingPage?: PricingPageAnnotation;
  defaultCurrency?: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Validation error structure
 */
interface ValidationError {
  field: string;
  message: string;
}

const SUPPORTED_PROVIDERS = ['stripe', 'paypal', 'square'];
const SUPPORTED_CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'nzd', 'sgd', 'hkd'];
const SUPPORTED_PAYMENT_TYPES = ['one-time', 'subscription', 'usage-based'];
const SUPPORTED_INTERVALS = ['day', 'week', 'month', 'year'];
const SUPPORTED_PRICING_SOURCES: PricingSourceType[] = ['inline', 'endpoint', 'component'];
const MAX_PROVIDERS = 5;
const MAX_PRODUCTS = 50;
const HTTP_OR_HTTPS_URL_PATTERN = /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?(\/.*)?$/;

/**
 * Handler for x-uigen-payments annotation.
 * Configures payment providers and products for payment processing.
 * 
 * Applied at the document level (info object) to configure payment providers
 * and products that will be available throughout the application.
 */
export class PaymentHandler implements AnnotationHandler<PaymentAnnotation> {
  public readonly name = 'x-uigen-payments';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-payments',
    description: 'Configures payment providers and products for payment processing at the document level',
    targetType: 'info',
    parameterSchema: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          description: 'Array of payment provider configurations',
          items: {
            type: 'object',
            properties: {
              provider: {
                type: 'enum',
                enum: ['stripe', 'paypal', 'square'],
                description: 'Payment provider identifier'
              },
              apiKey: {
                type: 'string',
                description: 'API key or secret key from provider console'
              },
              publishableKey: {
                type: 'string',
                description: 'Publishable key for client-side operations (Stripe)'
              },
              clientId: {
                type: 'string',
                description: 'Client ID for OAuth-based providers (PayPal)'
              },
              clientSecret: {
                type: 'string',
                description: 'Client secret for OAuth-based providers (PayPal)'
              },
              webhookSecret: {
                type: 'string',
                description: 'Webhook secret for signature verification'
              },
              mode: {
                type: 'enum',
                enum: ['test', 'live'],
                description: 'Operating mode (test/sandbox vs production)'
              },
              currency: {
                type: 'string',
                description: 'Default currency code (ISO 4217, e.g., usd, eur, gbp)'
              },
              enabled: {
                type: 'boolean',
                description: 'Whether this provider is enabled (defaults to true)'
              }
            }
          }
        },
        products: {
          type: 'array',
          description: 'Array of payment product configurations',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique product identifier'
              },
              name: {
                type: 'string',
                description: 'Display name for the product'
              },
              description: {
                type: 'string',
                description: 'Product description'
              },
              type: {
                type: 'enum',
                enum: ['one-time', 'subscription', 'usage-based'],
                description: 'Payment type'
              },
              price: {
                type: 'number',
                description: 'Price in cents or "custom" for contact sales'
              },
              currency: {
                type: 'string',
                description: 'Currency code (overrides provider default)'
              },
              interval: {
                type: 'enum',
                enum: ['day', 'week', 'month', 'year'],
                description: 'Billing interval for subscriptions'
              },
              intervalCount: {
                type: 'number',
                description: 'Interval count (e.g., 3 for "every 3 months")'
              },
              features: {
                type: 'array',
                description: 'List of features included in this product',
                items: { type: 'string' }
              },
              highlighted: {
                type: 'boolean',
                description: 'Whether to highlight this product as recommended'
              },
              metadata: {
                type: 'object',
                description: 'Custom metadata for provider-specific configuration'
              }
            }
          }
        },
        defaultCurrency: {
          type: 'string',
          description: 'Default currency for the application'
        },
        successUrl: {
          type: 'string',
          description: 'Default success redirect URL after payment'
        },
        cancelUrl: {
          type: 'string',
          description: 'Default cancel redirect URL if payment is canceled'
        }
      },
      required: ['providers']
    },
    examples: [
      {
        description: 'Stripe payment configuration',
        value: {
          providers: [
            {
              provider: 'stripe',
              apiKey: '${STRIPE_SECRET_KEY}',
              publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
              webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
              mode: 'test',
              currency: 'usd'
            }
          ],
          products: [
            {
              id: 'pro-monthly',
              name: 'Professional',
              type: 'subscription',
              price: 2900,
              interval: 'month',
              features: ['Unlimited meetings', 'Priority support']
            }
          ]
        }
      },
      {
        description: 'Multiple payment providers',
        value: {
          providers: [
            {
              provider: 'stripe',
              apiKey: '${STRIPE_SECRET_KEY}',
              publishableKey: '${STRIPE_PUBLISHABLE_KEY}',
              webhookSecret: '${STRIPE_WEBHOOK_SECRET}',
              mode: 'test'
            },
            {
              provider: 'paypal',
              clientId: '${PAYPAL_CLIENT_ID}',
              clientSecret: '${PAYPAL_CLIENT_SECRET}',
              webhookSecret: '${PAYPAL_WEBHOOK_SECRET}',
              mode: 'sandbox'
            }
          ]
        }
      }
    ]
  };
  
  /**
   * Extract the x-uigen-payments annotation value from the OpenAPI document root.
   * Reads from spec root (not info object) for consistency with other document-level annotations.
   * Only accepts objects with a providers array.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The PaymentAnnotation object or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): PaymentAnnotation | undefined {
    const element = context.element as any;
    
    // Read from document root (element['x-uigen-payments'])
    const annotation = element['x-uigen-payments'];
    
    // Must be an object
    if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
      return undefined;
    }
    
    // Must have providers field
    if (!annotation.providers) {
      return undefined;
    }
    
    // Providers must be an array
    if (!Array.isArray(annotation.providers)) {
      return undefined;
    }
    
    return {
      providers: annotation.providers,
      products: annotation.products,
      pricingPage: annotation.pricingPage,
      defaultCurrency: annotation.defaultCurrency,
      successUrl: annotation.successUrl,
      cancelUrl: annotation.cancelUrl
    };
  }
  
  /**
   * Validate the extracted annotation value.
   * Validates provider and product configurations and returns detailed error messages.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid, false otherwise
   */
  validate(value: PaymentAnnotation): boolean {
    const errors: ValidationError[] = [];
    
    // Validate providers array is not empty
    if (!value.providers || value.providers.length === 0) {
      console.warn('x-uigen-payments: At least one provider must be configured');
      return false;
    }
    
    // Validate maximum providers limit
    if (value.providers.length > MAX_PROVIDERS) {
      console.warn(`x-uigen-payments: Maximum ${MAX_PROVIDERS} providers allowed, found ${value.providers.length}`);
      return false;
    }
    
    // Validate each provider configuration
    for (let i = 0; i < value.providers.length; i++) {
      const provider = value.providers[i];
      const providerErrors = this.validateProvider(provider, i);
      errors.push(...providerErrors);
    }
    
    // Validate products if present
    if (value.products) {
      if (!Array.isArray(value.products)) {
        errors.push({
          field: 'products',
          message: 'Products must be an array'
        });
      } else {
        if (value.products.length > MAX_PRODUCTS) {
          errors.push({
            field: 'products',
            message: `Maximum ${MAX_PRODUCTS} products allowed, found ${value.products.length}`
          });
        }
        
        for (let i = 0; i < value.products.length; i++) {
          const product = value.products[i];
          const productErrors = this.validateProduct(product, i);
          errors.push(...productErrors);
        }
      }
    }
    
    // Validate pricing page config if present
    if (value.pricingPage) {
      const pricingPageErrors = this.validatePricingPage(value.pricingPage);
      errors.push(...pricingPageErrors);
    }
    
    // Validate default currency
    if (value.defaultCurrency && !SUPPORTED_CURRENCIES.includes(value.defaultCurrency.toLowerCase())) {
      errors.push({
        field: 'defaultCurrency',
        message: `Unsupported currency. Supported currencies are: ${SUPPORTED_CURRENCIES.join(', ')}`
      });
    }
    
    // Validate URLs
    if (value.successUrl) {
      const isLocalhost = value.successUrl.includes('localhost') || value.successUrl.includes('127.0.0.1');
      if (!isLocalhost && !value.successUrl.startsWith('https://')) {
        errors.push({
          field: 'successUrl',
          message: 'Success URL must use HTTPS (except localhost)'
        });
      } else if (!HTTP_OR_HTTPS_URL_PATTERN.test(value.successUrl)) {
        errors.push({
          field: 'successUrl',
          message: 'Success URL must be a valid URL'
        });
      }
    }
    
    if (value.cancelUrl) {
      const isLocalhost = value.cancelUrl.includes('localhost') || value.cancelUrl.includes('127.0.0.1');
      if (!isLocalhost && !value.cancelUrl.startsWith('https://')) {
        errors.push({
          field: 'cancelUrl',
          message: 'Cancel URL must use HTTPS (except localhost)'
        });
      } else if (!HTTP_OR_HTTPS_URL_PATTERN.test(value.cancelUrl)) {
        errors.push({
          field: 'cancelUrl',
          message: 'Cancel URL must be a valid URL'
        });
      }
    }
    
    // Validate at least one enabled provider
    const hasEnabledProvider = value.providers.some(p => p.enabled !== false);
    if (!hasEnabledProvider) {
      errors.push({
        field: 'providers',
        message: 'At least one provider must be enabled'
      });
    }
    
    // Log all validation errors
    if (errors.length > 0) {
      console.warn('x-uigen-payments validation errors:');
      for (const error of errors) {
        console.warn(`  - ${error.field}: ${error.message}`);
      }
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate a single provider configuration.
   * 
   * @param provider - The provider configuration to validate
   * @param index - The index of the provider in the array (for error messages)
   * @returns Array of validation errors
   */
  private validateProvider(provider: any, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = `providers[${index}]`;
    
    // Validate required fields
    if (!provider.provider) {
      errors.push({
        field: `${prefix}.provider`,
        message: 'Provider field is required'
      });
    } else if (!SUPPORTED_PROVIDERS.includes(provider.provider)) {
      errors.push({
        field: `${prefix}.provider`,
        message: `Unsupported provider. Supported providers are: ${SUPPORTED_PROVIDERS.join(', ')}`
      });
    }
    
    if (!provider.apiKey && !provider.clientId) {
      errors.push({
        field: `${prefix}.apiKey`,
        message: 'Either apiKey or clientId is required'
      });
    }
    
    if (!provider.webhookSecret) {
      errors.push({
        field: `${prefix}.webhookSecret`,
        message: 'WebhookSecret field is required'
      });
    }
    
    if (!provider.mode) {
      errors.push({
        field: `${prefix}.mode`,
        message: 'Mode field is required'
      });
    } else if (!['test', 'live'].includes(provider.mode)) {
      errors.push({
        field: `${prefix}.mode`,
        message: 'Mode must be either "test" or "live"'
      });
    }
    
    // Validate currency if present
    if (provider.currency && !SUPPORTED_CURRENCIES.includes(provider.currency.toLowerCase())) {
      errors.push({
        field: `${prefix}.currency`,
        message: `Unsupported currency. Supported currencies are: ${SUPPORTED_CURRENCIES.join(', ')}`
      });
    }
    
    return errors;
  }
  
  /**
   * Validate a single product configuration.
   * 
   * @param product - The product configuration to validate
   * @param index - The index of the product in the array (for error messages)
   * @returns Array of validation errors
   */
  private validateProduct(product: any, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = `products[${index}]`;
    
    // Validate required fields
    if (!product.id) {
      errors.push({
        field: `${prefix}.id`,
        message: 'Product ID is required'
      });
    }
    
    if (!product.name) {
      errors.push({
        field: `${prefix}.name`,
        message: 'Product name is required'
      });
    }
    
    if (!product.type) {
      errors.push({
        field: `${prefix}.type`,
        message: 'Product type is required'
      });
    } else if (!SUPPORTED_PAYMENT_TYPES.includes(product.type)) {
      errors.push({
        field: `${prefix}.type`,
        message: `Unsupported payment type. Supported types are: ${SUPPORTED_PAYMENT_TYPES.join(', ')}`
      });
    }
    
    if (product.price === undefined || product.price === null) {
      errors.push({
        field: `${prefix}.price`,
        message: 'Product price is required'
      });
    } else if (product.price !== 'custom' && (typeof product.price !== 'number' || product.price < 0)) {
      errors.push({
        field: `${prefix}.price`,
        message: 'Price must be a positive number (in cents) or "custom"'
      });
    }
    
    // Validate subscription-specific fields
    if (product.type === 'subscription') {
      if (!product.interval) {
        errors.push({
          field: `${prefix}.interval`,
          message: 'Interval is required for subscription products'
        });
      } else if (!SUPPORTED_INTERVALS.includes(product.interval)) {
        errors.push({
          field: `${prefix}.interval`,
          message: `Unsupported interval. Supported intervals are: ${SUPPORTED_INTERVALS.join(', ')}`
        });
      }
      
      if (product.intervalCount !== undefined && (typeof product.intervalCount !== 'number' || product.intervalCount < 1)) {
        errors.push({
          field: `${prefix}.intervalCount`,
          message: 'Interval count must be a positive number'
        });
      }
    }
    
    // Validate currency if present
    if (product.currency && !SUPPORTED_CURRENCIES.includes(product.currency.toLowerCase())) {
      errors.push({
        field: `${prefix}.currency`,
        message: `Unsupported currency. Supported currencies are: ${SUPPORTED_CURRENCIES.join(', ')}`
      });
    }
    
    // Validate features array if present
    if (product.features !== undefined) {
      if (!Array.isArray(product.features)) {
        errors.push({
          field: `${prefix}.features`,
          message: 'Features must be an array'
        });
      } else {
        for (let j = 0; j < product.features.length; j++) {
          const feature = product.features[j];
          if (typeof feature !== 'string' || feature.trim() === '') {
            errors.push({
              field: `${prefix}.features[${j}]`,
              message: 'Each feature must be a non-empty string'
            });
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Validate pricing page configuration.
   * 
   * @param pricingPage - The pricing page configuration to validate
   * @returns Array of validation errors
   */
  private validatePricingPage(pricingPage: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = 'pricingPage';
    
    // Validate enabled field
    if (typeof pricingPage.enabled !== 'boolean') {
      errors.push({
        field: `${prefix}.enabled`,
        message: 'Enabled field must be a boolean'
      });
    }
    
    // Validate source field
    if (!pricingPage.source) {
      errors.push({
        field: `${prefix}.source`,
        message: 'Source field is required'
      });
    } else if (!SUPPORTED_PRICING_SOURCES.includes(pricingPage.source)) {
      errors.push({
        field: `${prefix}.source`,
        message: `Unsupported pricing source. Supported sources are: ${SUPPORTED_PRICING_SOURCES.join(', ')}`
      });
    }
    
    // Validate source-specific requirements
    if (pricingPage.source === 'inline') {
      if (!pricingPage.products || !Array.isArray(pricingPage.products) || pricingPage.products.length === 0) {
        errors.push({
          field: `${prefix}.products`,
          message: 'Products array is required for inline pricing source'
        });
      }
    }
    
    if (pricingPage.source === 'endpoint') {
      if (!pricingPage.endpoint || typeof pricingPage.endpoint !== 'string') {
        errors.push({
          field: `${prefix}.endpoint`,
          message: 'Endpoint URL is required for endpoint pricing source'
        });
      }
    }
    
    if (pricingPage.source === 'component') {
      if (!pricingPage.override || typeof pricingPage.override !== 'object') {
        errors.push({
          field: `${prefix}.override`,
          message: 'Override config is required for component pricing source'
        });
      } else {
        if (!pricingPage.override.id || typeof pricingPage.override.id !== 'string') {
          errors.push({
            field: `${prefix}.override.id`,
            message: 'Override ID is required'
          });
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Extract pricing page configuration from annotation.
   * 
   * @param annotation - The payment annotation
   * @returns PricingPageConfig or undefined if not present
   */
  extractPricingPageConfig(annotation: PaymentAnnotation): PricingPageConfig | undefined {
    if (!annotation.pricingPage) {
      return undefined;
    }
    
    const pricingPage = annotation.pricingPage;
    
    return {
      enabled: pricingPage.enabled,
      source: pricingPage.source,
      products: pricingPage.products,
      endpoint: pricingPage.endpoint,
      override: pricingPage.override
    };
  }
  
  /**
   * Handle x-uigen-monetized at path level.
   * Extracts monetization config from path item.
   * 
   * @param path - The path string
   * @param pathItem - The OpenAPI path item
   * @returns MonetizationConfig or undefined if not present
   */
  handlePathLevel(path: string, pathItem: OpenAPIV3.PathItemObject): MonetizationConfig | undefined {
    const annotation = (pathItem as any)['x-uigen-monetized'];
    
    if (annotation === undefined || annotation === null) {
      return undefined;
    }
    
    // Handle boolean shorthand
    if (typeof annotation === 'boolean') {
      return {
        monetized: annotation
      };
    }
    
    // Handle object form with additional config
    if (typeof annotation === 'object' && !Array.isArray(annotation)) {
      return {
        monetized: annotation.monetized !== false, // Default to true if object present
        message: annotation.message,
        redirectTo: annotation.redirectTo
      };
    }
    
    return undefined;
  }
  
  /**
   * Handle x-uigen-monetized at operation level.
   * Extracts monetization config from operation.
   * 
   * @param operation - The OpenAPI operation
   * @returns MonetizationConfig or undefined if not present
   */
  handleOperationLevel(operation: OpenAPIV3.OperationObject): MonetizationConfig | undefined {
    const annotation = (operation as any)['x-uigen-monetized'];
    
    if (annotation === undefined || annotation === null) {
      return undefined;
    }
    
    // Handle boolean shorthand
    if (typeof annotation === 'boolean') {
      return {
        monetized: annotation
      };
    }
    
    // Handle object form with additional config
    if (typeof annotation === 'object' && !Array.isArray(annotation)) {
      return {
        monetized: annotation.monetized !== false, // Default to true if object present
        message: annotation.message,
        redirectTo: annotation.redirectTo
      };
    }
    
    return undefined;
  }
  
  /**
   * Apply the payment annotation by storing payment configuration in the IR's PaymentConfig.
   * Filters out disabled providers and applies default values.
   * Only stores frontend-safe fields (publishableKey). Backend secrets stay in environment variables.
   * 
   * @param value - The validated annotation value
   * @param context - The annotation context
   */
  apply(value: PaymentAnnotation, context: AnnotationContext): void {
    // Initialize payments config if not present
    if (!context.ir.payments) {
      context.ir.payments = {
        providers: [],
        products: [],
        defaultCurrency: value.defaultCurrency,
        successUrl: value.successUrl,
        cancelUrl: value.cancelUrl
      };
    }
    
    // Process each provider configuration
    for (const providerConfig of value.providers) {
      // Skip disabled providers
      if (providerConfig.enabled === false) {
        continue;
      }
      
      // Build PaymentProvider with only frontend-safe fields
      // Backend secrets (apiKey, clientId, clientSecret, webhookSecret) are read from environment variables
      const paymentProvider: PaymentProvider = {
        provider: providerConfig.provider,
        publishableKey: providerConfig.publishableKey || '',
        mode: providerConfig.mode,
        currency: providerConfig.currency,
        enabled: providerConfig.enabled === undefined ? true : providerConfig.enabled
      };
      
      // Add to IR
      context.ir.payments.providers.push(paymentProvider);
    }
    
    // Process products if present
    if (value.products) {
      for (const productConfig of value.products) {
        const paymentProduct: PaymentProduct = {
          id: productConfig.id,
          name: productConfig.name,
          description: productConfig.description,
          type: productConfig.type,
          price: productConfig.price,
          currency: productConfig.currency,
          interval: productConfig.interval,
          intervalCount: productConfig.intervalCount,
          features: productConfig.features,
          highlighted: productConfig.highlighted,
          metadata: productConfig.metadata
        };
        
        context.ir.payments.products?.push(paymentProduct);
      }
    }
    
    // Process pricing page config if present
    if (value.pricingPage) {
      const pricingPageConfig = this.extractPricingPageConfig(value);
      if (pricingPageConfig) {
        context.ir.payments.pricingPage = pricingPageConfig;
      }
    }
  }
}
