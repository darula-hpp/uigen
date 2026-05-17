/**
 * Payment Reconciler
 * 
 * Handles bidirectional synchronization of payment provider configurations
 * between config.yaml and OpenAPI spec x-uigen-payments annotations.
 * 
 * Reconciliation Rules:
 * 1. config.yaml is the source of truth when both sources define providers
 * 2. New providers in config.yaml are added to OpenAPI spec
 * 3. Providers removed from config.yaml are removed from OpenAPI spec
 * 4. Providers with enabled: false in config.yaml are disabled in OpenAPI spec
 * 5. Provider order from config.yaml is preserved in OpenAPI spec
 * 6. Products are synced similarly to providers
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { Swagger2Document } from './types.js';

/**
 * Payment configuration structure
 */
export interface PaymentConfig {
  providers?: PaymentProviderConfig[];
  products?: PaymentProductConfig[];
  defaultCurrency?: string;
  successUrl?: string;
  cancelUrl?: string;
  pricingPage?: {
    enabled: boolean;
    source: 'inline' | 'endpoint' | 'component';
    products?: PaymentProductConfig[];
    endpoint?: string;
    override?: {
      id: string;
      enabled: boolean;
    };
  };
}

/**
 * Configuration file structure for payments section
 */
export interface PaymentConfigFile {
  annotations?: {
    document?: {
      'x-uigen-payments'?: PaymentConfig;
    };
  };
}

/**
 * Payment provider configuration from config.yaml
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
 * Payment product configuration from config.yaml
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
 * Result of reconciliation operation
 */
export interface ReconcileResult {
  /** Updated OpenAPI spec with reconciled payment configuration */
  spec: OpenAPIV3.Document | Swagger2Document;
  
  /** Updated config with reconciled payment configuration */
  config: PaymentConfigFile;
  
  /** Number of providers reconciled */
  reconciledProviders: number;
  
  /** Number of products reconciled */
  reconciledProducts: number;
  
  /** Validation errors encountered during reconciliation */
  errors: string[];
}

/**
 * Payment Reconciler
 * 
 * Manages bidirectional sync of payment provider and product configurations.
 */
export class PaymentReconciler {
  /**
   * Reconcile payment configuration between OpenAPI spec and config.yaml
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @param config - The config file with payments section
   * @returns Reconciliation result with updated spec and config
   */
  reconcile(
    spec: OpenAPIV3.Document | Swagger2Document,
    config: PaymentConfigFile
  ): ReconcileResult {
    const errors: string[] = [];
    
    // Extract providers and products from both sources
    const specPayments = this.extractPaymentsFromSpec(spec);
    const configPayments = config.annotations?.document?.['x-uigen-payments'] || {};
    
    // Validate config providers and products
    const validationErrors = this.validatePayments(configPayments);
    errors.push(...validationErrors);
    
    // Merge providers with config as source of truth
    const mergedProviders = this.mergeProviders(
      specPayments?.providers || [],
      configPayments.providers || []
    );
    
    // Merge products with config as source of truth
    const mergedProducts = this.mergeProducts(
      specPayments?.products || [],
      configPayments.products || []
    );
    
    // Create merged payments config
    const mergedPayments = {
      providers: mergedProviders,
      products: mergedProducts,
      pricingPage: configPayments.pricingPage || specPayments?.pricingPage,
      defaultCurrency: configPayments.defaultCurrency || specPayments?.defaultCurrency,
      successUrl: configPayments.successUrl || specPayments?.successUrl,
      cancelUrl: configPayments.cancelUrl || specPayments?.cancelUrl
    };
    
    // Create updated spec and config
    const updatedSpec = this.syncToSpec(mergedPayments, spec);
    const updatedConfig = this.syncToConfig(mergedPayments, config);
    
    return {
      spec: updatedSpec,
      config: updatedConfig,
      reconciledProviders: mergedProviders.length,
      reconciledProducts: mergedProducts.length,
      errors,
    };
  }
  
  /**
   * Extract payment configuration from OpenAPI spec x-uigen-payments annotation in info object
   * 
   * @param spec - The OpenAPI/Swagger specification
   * @returns Payment configuration object
   */
  private extractPaymentsFromSpec(
    spec: OpenAPIV3.Document | Swagger2Document
  ): Partial<PaymentConfig> {
    const info = spec.info as Record<string, unknown>;
    const paymentsAnnotation = info['x-uigen-payments'] as PaymentConfig | undefined;
    
    if (!paymentsAnnotation) {
      return {};
    }
    
    return {
      providers: paymentsAnnotation.providers || [],
      products: paymentsAnnotation.products || [],
      pricingPage: paymentsAnnotation.pricingPage,
      defaultCurrency: paymentsAnnotation.defaultCurrency,
      successUrl: paymentsAnnotation.successUrl,
      cancelUrl: paymentsAnnotation.cancelUrl
    };
  }
  
  /**
   * Validate payment configuration
   * 
   * @param payments - Payment configuration to validate
   * @returns Array of validation error messages
   */
  private validatePayments(payments: Partial<PaymentConfig>): string[] {
    const errors: string[] = [];
    const supportedProviders = ['stripe', 'paypal', 'square'];
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'nzd', 'sgd', 'hkd'];
    const supportedPaymentTypes = ['one-time', 'subscription', 'usage-based'];
    const supportedIntervals = ['day', 'week', 'month', 'year'];
    const urlPattern = /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?(\/.*)?$/;
    
    const providers = payments?.providers || [];
    const products = payments?.products || [];
    
    if (providers.length > 5) {
      errors.push('Maximum 5 payment providers allowed');
    }
    
    if (products.length > 50) {
      errors.push('Maximum 50 payment products allowed');
    }
    
    // Validate providers
    providers.forEach((provider: any, index: number) => {
      const prefix = `Provider ${index + 1}`;
      
      if (!provider.provider) {
        errors.push(`${prefix}: provider field is required`);
      } else if (!supportedProviders.includes(provider.provider)) {
        errors.push(
          `${prefix}: Unsupported provider "${provider.provider}". Supported providers are: ${supportedProviders.join(', ')}`
        );
      }
      
      // Only require frontend-safe keys (publishableKey or clientId)
      // Backend secrets (apiKey, webhookSecret) are read from environment variables on the backend
      if (!provider.publishableKey && !provider.clientId) {
        errors.push(`${prefix}: either publishableKey or clientId is required for frontend`);
      }
      
      if (!provider.mode) {
        errors.push(`${prefix}: mode field is required`);
      } else if (!['test', 'live'].includes(provider.mode)) {
        errors.push(`${prefix}: mode must be either "test" or "live"`);
      }
      
      if (provider.currency && !supportedCurrencies.includes(provider.currency.toLowerCase())) {
        errors.push(`${prefix}: unsupported currency "${provider.currency}"`);
      }
    });
    
    // Validate products
    products.forEach((product: any, index: number) => {
      const prefix = `Product ${index + 1}`;
      
      if (!product.id) {
        errors.push(`${prefix}: id field is required`);
      }
      
      if (!product.name) {
        errors.push(`${prefix}: name field is required`);
      }
      
      if (!product.type) {
        errors.push(`${prefix}: type field is required`);
      } else if (!supportedPaymentTypes.includes(product.type)) {
        errors.push(`${prefix}: unsupported payment type "${product.type}"`);
      }
      
      if (product.price === undefined || product.price === null) {
        errors.push(`${prefix}: price field is required`);
      } else if (product.price !== 'custom' && (typeof product.price !== 'number' || product.price < 0)) {
        errors.push(`${prefix}: price must be a positive number or "custom"`);
      }
      
      if (product.type === 'subscription') {
        if (!product.interval) {
          errors.push(`${prefix}: interval is required for subscription products`);
        } else if (!supportedIntervals.includes(product.interval)) {
          errors.push(`${prefix}: unsupported interval "${product.interval}"`);
        }
      }
      
      if (product.currency && !supportedCurrencies.includes(product.currency.toLowerCase())) {
        errors.push(`${prefix}: unsupported currency "${product.currency}"`);
      }
    });
    
    // Validate URLs
    if (payments?.successUrl && !urlPattern.test(payments.successUrl)) {
      errors.push('successUrl must be a valid URL');
    }
    
    if (payments?.cancelUrl && !urlPattern.test(payments.cancelUrl)) {
      errors.push('cancelUrl must be a valid URL');
    }
    
    return errors;
  }
  
  /**
   * Merge providers from spec and config, with config as source of truth
   * 
   * Rules:
   * - Providers in config override providers in spec (by provider name)
   * - Providers only in config are added
   * - Providers only in spec are removed
   * - Providers with enabled: false are filtered out
   * - Provider order from config is preserved
   * 
   * @param _specProviders - Providers from OpenAPI spec (unused, config is source of truth)
   * @param configProviders - Providers from config.yaml
   * @returns Merged array of providers
   */
  mergeProviders(
    _specProviders: PaymentProviderConfig[],
    configProviders: PaymentProviderConfig[]
  ): PaymentProviderConfig[] {
    // If no config providers, return empty array (config is source of truth)
    if (configProviders.length === 0) {
      return [];
    }
    
    // Filter out disabled providers and return config providers
    // (config is source of truth, so we ignore spec providers)
    return configProviders.filter(provider => provider.enabled !== false);
  }
  
  /**
   * Merge products from spec and config, with config as source of truth
   * 
   * Rules:
   * - Products in config override products in spec (by product ID)
   * - Products only in config are added
   * - Products only in spec are removed
   * - Product order from config is preserved
   * 
   * @param _specProducts - Products from OpenAPI spec (unused, config is source of truth)
   * @param configProducts - Products from config.yaml
   * @returns Merged array of products
   */
  mergeProducts(
    _specProducts: PaymentProductConfig[],
    configProducts: PaymentProductConfig[]
  ): PaymentProductConfig[] {
    // If no config products, return empty array (config is source of truth)
    if (configProducts.length === 0) {
      return [];
    }
    
    // Return config products (config is source of truth)
    return configProducts;
  }
  
  /**
   * Sync merged payment configuration to OpenAPI spec
   * 
   * Updates or creates x-uigen-payments annotation in info object (like x-uigen-auth)
   * 
   * @param payments - Merged payment configuration
   * @param spec - The OpenAPI/Swagger specification
   * @returns Updated specification
   */
  syncToSpec(
    payments: {
      providers: PaymentProviderConfig[];
      products: PaymentProductConfig[];
      pricingPage?: {
        enabled: boolean;
        source: 'inline' | 'endpoint' | 'component';
        products?: PaymentProductConfig[];
        endpoint?: string;
        override?: {
          id: string;
          enabled: boolean;
        };
      };
      defaultCurrency?: string;
      successUrl?: string;
      cancelUrl?: string;
    },
    spec: OpenAPIV3.Document | Swagger2Document
  ): OpenAPIV3.Document | Swagger2Document {
    // Deep clone to avoid mutation
    const updatedSpec = JSON.parse(JSON.stringify(spec)) as OpenAPIV3.Document | Swagger2Document;
    
    // Get info object
    const info = updatedSpec.info as Record<string, unknown>;
    
    if (payments.providers.length === 0 && payments.products.length === 0) {
      // Remove x-uigen-payments if no providers or products
      delete info['x-uigen-payments'];
    } else {
      // Set or update x-uigen-payments annotation in info object
      info['x-uigen-payments'] = {
        providers: payments.providers.map(provider => ({
          provider: provider.provider,
          apiKey: provider.apiKey,
          ...(provider.publishableKey && { publishableKey: provider.publishableKey }),
          ...(provider.clientId && { clientId: provider.clientId }),
          ...(provider.clientSecret && { clientSecret: provider.clientSecret }),
          webhookSecret: provider.webhookSecret,
          mode: provider.mode,
          ...(provider.currency && { currency: provider.currency }),
          ...(provider.enabled !== undefined && { enabled: provider.enabled }),
        })),
        ...(payments.products.length > 0 && {
          products: payments.products.map(product => ({
            id: product.id,
            name: product.name,
            ...(product.description && { description: product.description }),
            type: product.type,
            price: product.price,
            ...(product.currency && { currency: product.currency }),
            ...(product.interval && { interval: product.interval }),
            ...(product.intervalCount && { intervalCount: product.intervalCount }),
            ...(product.features && { features: product.features }),
            ...(product.highlighted !== undefined && { highlighted: product.highlighted }),
            ...(product.metadata && { metadata: product.metadata }),
          }))
        }),
        ...(payments.pricingPage && { pricingPage: payments.pricingPage }),
        ...(payments.defaultCurrency && { defaultCurrency: payments.defaultCurrency }),
        ...(payments.successUrl && { successUrl: payments.successUrl }),
        ...(payments.cancelUrl && { cancelUrl: payments.cancelUrl }),
      };
    }
    
    return updatedSpec;
  }
  
  /**
   * Sync merged payment configuration to config.yaml
   * 
   * Updates or creates x-uigen-payments in annotations.document section
   * 
   * @param payments - Merged payment configuration
   * @param config - The config file
   * @returns Updated config
   */
  syncToConfig(
    payments: {
      providers: PaymentProviderConfig[];
      products: PaymentProductConfig[];
      pricingPage?: {
        enabled: boolean;
        source: 'inline' | 'endpoint' | 'component';
        products?: PaymentProductConfig[];
        endpoint?: string;
        override?: {
          id: string;
          enabled: boolean;
        };
      };
      defaultCurrency?: string;
      successUrl?: string;
      cancelUrl?: string;
    },
    config: PaymentConfigFile
  ): PaymentConfigFile {
    // Deep clone to avoid mutation
    const updatedConfig = JSON.parse(JSON.stringify(config)) as PaymentConfigFile;
    
    // Ensure annotations.document structure exists
    if (!updatedConfig.annotations) {
      updatedConfig.annotations = {};
    }
    if (!updatedConfig.annotations.document) {
      updatedConfig.annotations.document = {};
    }
    
    if (payments.providers.length === 0 && payments.products.length === 0) {
      // Remove x-uigen-payments if no providers or products
      delete updatedConfig.annotations.document['x-uigen-payments'];
    } else {
      // Set x-uigen-payments in annotations.document
      updatedConfig.annotations.document['x-uigen-payments'] = {
        providers: payments.providers.map(provider => ({
          provider: provider.provider,
          apiKey: provider.apiKey,
          ...(provider.publishableKey && { publishableKey: provider.publishableKey }),
          ...(provider.clientId && { clientId: provider.clientId }),
          ...(provider.clientSecret && { clientSecret: provider.clientSecret }),
          webhookSecret: provider.webhookSecret,
          mode: provider.mode,
          ...(provider.currency && { currency: provider.currency }),
          ...(provider.enabled !== undefined && { enabled: provider.enabled }),
        })),
        ...(payments.products.length > 0 && {
          products: payments.products.map(product => ({
            id: product.id,
            name: product.name,
            ...(product.description && { description: product.description }),
            type: product.type,
            price: product.price,
            ...(product.currency && { currency: product.currency }),
            ...(product.interval && { interval: product.interval }),
            ...(product.intervalCount && { intervalCount: product.intervalCount }),
            ...(product.features && { features: product.features }),
            ...(product.highlighted !== undefined && { highlighted: product.highlighted }),
            ...(product.metadata && { metadata: product.metadata }),
          }))
        }),
        ...(payments.pricingPage && { pricingPage: payments.pricingPage }),
        ...(payments.defaultCurrency && { defaultCurrency: payments.defaultCurrency }),
        ...(payments.successUrl && { successUrl: payments.successUrl }),
        ...(payments.cancelUrl && { cancelUrl: payments.cancelUrl }),
      };
    }
    
    return updatedConfig;
  }
}
