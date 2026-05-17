/**
 * Payment Strategy Factory
 * 
 * Creates payment strategy instances based on provider name.
 * Uses the Factory pattern for strategy creation.
 */

import type { PaymentStrategy } from './payment-strategy.js';
import { StripeStrategy } from './stripe-strategy.js';
import { PayPalStrategy } from './paypal-strategy.js';

/**
 * Payment Strategy Factory
 * 
 * Manages registration and creation of payment strategies.
 * Strategies are registered statically on module load.
 */
export class PaymentStrategyFactory {
  private static strategies = new Map<string, PaymentStrategy>();
  private static initialized = false;
  
  /**
   * Initialize and register default strategies
   */
  private static initialize(): void {
    if (this.initialized) {
      return;
    }
    
    // Register built-in strategies
    this.register('stripe', new StripeStrategy());
    this.register('paypal', new PayPalStrategy());
    
    this.initialized = true;
  }
  
  /**
   * Register a payment strategy
   * 
   * @param provider - Provider identifier (e.g., 'stripe', 'paypal')
   * @param strategy - Strategy instance
   */
  static register(provider: string, strategy: PaymentStrategy): void {
    this.strategies.set(provider.toLowerCase(), strategy);
  }
  
  /**
   * Create a payment strategy instance
   * 
   * @param provider - Provider identifier
   * @returns Payment strategy instance
   * @throws Error if provider is not supported
   */
  static create(provider: string): PaymentStrategy {
    this.initialize();
    
    const strategy = this.strategies.get(provider.toLowerCase());
    
    if (!strategy) {
      throw new Error(
        `Unknown payment provider: ${provider}. Supported providers are: ${Array.from(this.strategies.keys()).join(', ')}`
      );
    }
    
    return strategy;
  }
  
  /**
   * Check if a provider is supported
   * 
   * @param provider - Provider identifier
   * @returns true if provider is supported
   */
  static isSupported(provider: string): boolean {
    this.initialize();
    return this.strategies.has(provider.toLowerCase());
  }
  
  /**
   * Get list of supported providers
   * 
   * @returns Array of supported provider names
   */
  static getSupportedProviders(): string[] {
    this.initialize();
    return Array.from(this.strategies.keys());
  }
  
  /**
   * Clear all registered strategies (for testing)
   */
  static clear(): void {
    this.strategies.clear();
    this.initialized = false;
  }
}
