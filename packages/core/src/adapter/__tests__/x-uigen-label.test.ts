import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import { Swagger2Adapter } from '../swagger2.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal OpenAPI 3.x spec with a single POST /items operation whose
 * requestBody schema is the provided schema object.
 */
function makeOpenAPI3Spec(bodySchema: Record<string, unknown>) {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/items': {
        post: {
          operationId: 'createItem',
          requestBody: {
            content: {
              'application/json': { schema: bodySchema }
            }
          },
          responses: { '201': { description: 'Created' } }
        }
      }
    }
  } as any;
}

/**
 * Build a minimal Swagger 2.0 spec with a single POST /items operation whose
 * body parameter schema is the provided schema object.
 */
function makeSwagger2Spec(bodySchema: Record<string, unknown>) {
  return {
    swagger: '2.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/items': {
        post: {
          operationId: 'createItem',
          parameters: [
            { name: 'body', in: 'body', required: true, schema: bodySchema }
          ],
          responses: { '201': { description: 'Created' } }
        }
      }
    }
  } as any;
}

/** Adapt a spec and return the requestBody SchemaNode of the first operation. */
function adaptOpenAPI3Body(bodySchema: Record<string, unknown>) {
  const adapter = new OpenAPI3Adapter(makeOpenAPI3Spec(bodySchema));
  const ir = adapter.adapt();
  return ir.resources[0].operations[0].requestBody!;
}

/** Adapt a Swagger 2.0 spec and return the requestBody SchemaNode. */
function adaptSwagger2Body(bodySchema: Record<string, unknown>) {
  const adapter = new Swagger2Adapter(makeSwagger2Spec(bodySchema));
  const ir = adapter.adapt();
  return ir.resources[0].operations[0].requestBody!;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('x-uigen-label', () => {
  // -------------------------------------------------------------------------
  // 1. Valid non-empty string label is used as SchemaNode.label
  // -------------------------------------------------------------------------
  describe('1. Valid non-empty string label', () => {
    it('uses x-uigen-label as SchemaNode.label when it is a non-empty string', () => {
      // Requirements: 1.1
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          internal_code: {
            type: 'string',
            'x-uigen-label': 'Product SKU'
          }
        }
      });

      const field = body.children?.find(c => c.key === 'internal_code');
      expect(field).toBeDefined();
      expect(field!.label).toBe('Product SKU');
    });

    it('preserves the exact casing and spacing of the label string', () => {
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          usr_nm: {
            type: 'string',
            'x-uigen-label': 'Full Name (required)'
          }
        }
      });

      const field = body.children?.find(c => c.key === 'usr_nm');
      expect(field!.label).toBe('Full Name (required)');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Absent x-uigen-label → humanize(key) fallback
  // -------------------------------------------------------------------------
  describe('2. Absent x-uigen-label falls back to humanize(key)', () => {
    it('uses humanize(key) when x-uigen-label is not present', () => {
      // Requirements: 1.2
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          first_name: { type: 'string' }
        }
      });

      const field = body.children?.find(c => c.key === 'first_name');
      expect(field).toBeDefined();
      // humanize('first_name') → 'First Name'
      expect(field!.label).toBe('First Name');
    });

    it('uses humanize(key) for camelCase keys without the extension', () => {
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          createdAt: { type: 'string', format: 'date-time' }
        }
      });

      const field = body.children?.find(c => c.key === 'createdAt');
      // humanize('createdAt') → 'Created At'
      expect(field!.label).toBe('Created At');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Empty string x-uigen-label → humanize(key) fallback
  // -------------------------------------------------------------------------
  describe('3. Empty string x-uigen-label falls back to humanize(key)', () => {
    it('falls back to humanize(key) when x-uigen-label is an empty string', () => {
      // Requirements: 1.3
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            'x-uigen-label': ''
          }
        }
      });

      const field = body.children?.find(c => c.key === 'product_id');
      expect(field).toBeDefined();
      expect(field!.label).toBe('Product Id');
    });

    it('falls back to humanize(key) when x-uigen-label is a whitespace-only string', () => {
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          order_ref: {
            type: 'string',
            'x-uigen-label': '   '
          }
        }
      });

      const field = body.children?.find(c => c.key === 'order_ref');
      expect(field!.label).toBe('Order Ref');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Non-string values → humanize(key) fallback, no throw
  // -------------------------------------------------------------------------
  describe('4. Non-string x-uigen-label values fall back without throwing', () => {
    it('falls back to humanize(key) when x-uigen-label is a number (42)', () => {
      // Requirements: 1.4
      expect(() => {
        const body = adaptOpenAPI3Body({
          type: 'object',
          properties: {
            qty: { type: 'integer', 'x-uigen-label': 42 }
          }
        });
        const field = body.children?.find(c => c.key === 'qty');
        expect(field!.label).toBe('Qty');
      }).not.toThrow();
    });

    it('falls back to humanize(key) when x-uigen-label is a boolean (true)', () => {
      expect(() => {
        const body = adaptOpenAPI3Body({
          type: 'object',
          properties: {
            is_active: { type: 'boolean', 'x-uigen-label': true }
          }
        });
        const field = body.children?.find(c => c.key === 'is_active');
        expect(field!.label).toBe('Is Active');
      }).not.toThrow();
    });

    it('falls back to humanize(key) when x-uigen-label is null', () => {
      expect(() => {
        const body = adaptOpenAPI3Body({
          type: 'object',
          properties: {
            ref_code: { type: 'string', 'x-uigen-label': null }
          }
        });
        const field = body.children?.find(c => c.key === 'ref_code');
        expect(field!.label).toBe('Ref Code');
      }).not.toThrow();
    });

    it('falls back to humanize(key) when x-uigen-label is an object ({})', () => {
      expect(() => {
        const body = adaptOpenAPI3Body({
          type: 'object',
          properties: {
            meta_data: { type: 'object', 'x-uigen-label': {} }
          }
        });
        const field = body.children?.find(c => c.key === 'meta_data');
        expect(field!.label).toBe('Meta Data');
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Nested object property carries its own x-uigen-label
  // -------------------------------------------------------------------------
  describe('5. Nested object property carries its own x-uigen-label', () => {
    it('applies x-uigen-label to a deeply nested property', () => {
      // Requirements: 1.5
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              zip_code: {
                type: 'string',
                'x-uigen-label': 'Postal Code'
              }
            }
          }
        }
      });

      const addressField = body.children?.find(c => c.key === 'address');
      expect(addressField).toBeDefined();
      const zipField = addressField!.children?.find(c => c.key === 'zip_code');
      expect(zipField).toBeDefined();
      expect(zipField!.label).toBe('Postal Code');
    });

    it('applies x-uigen-label at multiple nesting levels independently', () => {
      const body = adaptOpenAPI3Body({
        type: 'object',
        'x-uigen-label': 'Root Object',
        properties: {
          billing: {
            type: 'object',
            'x-uigen-label': 'Billing Details',
            properties: {
              card_number: {
                type: 'string',
                'x-uigen-label': 'Card Number (last 4)'
              }
            }
          }
        }
      });

      // The root body node itself uses key 'body' — label comes from x-uigen-label on the schema
      expect(body.label).toBe('Root Object');

      const billingField = body.children?.find(c => c.key === 'billing');
      expect(billingField!.label).toBe('Billing Details');

      const cardField = billingField!.children?.find(c => c.key === 'card_number');
      expect(cardField!.label).toBe('Card Number (last 4)');
    });
  });

  // -------------------------------------------------------------------------
  // 6. Array items schema carries x-uigen-label
  // -------------------------------------------------------------------------
  describe('6. Array items schema carries x-uigen-label', () => {
    it('applies x-uigen-label to the items node of an array field', () => {
      // Requirements: 1.5
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: {
              type: 'string',
              'x-uigen-label': 'Tag Value'
            }
          }
        }
      });

      const tagsField = body.children?.find(c => c.key === 'tags');
      expect(tagsField).toBeDefined();
      expect(tagsField!.type).toBe('array');
      expect(tagsField!.items).toBeDefined();
      expect(tagsField!.items!.label).toBe('Tag Value');
    });

    it('applies x-uigen-label to the array field itself', () => {
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          phone_numbers: {
            type: 'array',
            'x-uigen-label': 'Contact Numbers',
            items: { type: 'string' }
          }
        }
      });

      const field = body.children?.find(c => c.key === 'phone_numbers');
      expect(field!.label).toBe('Contact Numbers');
    });
  });

  // -------------------------------------------------------------------------
  // 7. $ref property with x-uigen-label → property label wins over resolved target label
  // -------------------------------------------------------------------------
  describe('7. $ref property x-uigen-label wins over resolved target label', () => {
    it('uses the property-level x-uigen-label when the $ref property has one', () => {
      // Requirements: 3.1, 3.3
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        components: {
          schemas: {
            Address: {
              type: 'object',
              'x-uigen-label': 'Target Label (should be ignored)',
              properties: {
                street: { type: 'string' }
              }
            }
          }
        },
        paths: {
          '/orders': {
            post: {
              operationId: 'createOrder',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        shipping_address: {
                          $ref: '#/components/schemas/Address',
                          'x-uigen-label': 'Shipping Destination'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();
      const body = ir.resources[0].operations[0].requestBody!;
      const field = body.children?.find(c => c.key === 'shipping_address');

      expect(field).toBeDefined();
      expect(field!.label).toBe('Shipping Destination');
    });
  });

  // -------------------------------------------------------------------------
  // 8. $ref target schema carries x-uigen-label, referencing property has none → target label applied
  // -------------------------------------------------------------------------
  describe('8. $ref target x-uigen-label applied when property has none', () => {
    it('uses the target schema x-uigen-label when the referencing property has no override', () => {
      // Requirements: 3.2
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        components: {
          schemas: {
            Currency: {
              type: 'string',
              'x-uigen-label': 'Currency Code (ISO 4217)'
            }
          }
        },
        paths: {
          '/payments': {
            post: {
              operationId: 'createPayment',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        currency: {
                          $ref: '#/components/schemas/Currency'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();
      const body = ir.resources[0].operations[0].requestBody!;
      const field = body.children?.find(c => c.key === 'currency');

      expect(field).toBeDefined();
      expect(field!.label).toBe('Currency Code (ISO 4217)');
    });
  });

  // -------------------------------------------------------------------------
  // 9. Both property and $ref target carry x-uigen-label → property-level wins
  // -------------------------------------------------------------------------
  describe('9. Property-level x-uigen-label wins over $ref target label', () => {
    it('prefers the property-level label when both property and target have x-uigen-label', () => {
      // Requirements: 3.3
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        components: {
          schemas: {
            Country: {
              type: 'string',
              'x-uigen-label': 'Country (from target)'
            }
          }
        },
        paths: {
          '/addresses': {
            post: {
              operationId: 'createAddress',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        country_code: {
                          $ref: '#/components/schemas/Country',
                          'x-uigen-label': 'Country (from property)'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();
      const body = ir.resources[0].operations[0].requestBody!;
      const field = body.children?.find(c => c.key === 'country_code');

      expect(field).toBeDefined();
      expect(field!.label).toBe('Country (from property)');
    });
  });

  // -------------------------------------------------------------------------
  // 10. x-uigen-label alongside x-uigen-widget → both applied independently
  // -------------------------------------------------------------------------
  describe('10. x-uigen-label alongside x-uigen-widget — no interference', () => {
    it('x-uigen-label is applied correctly when x-uigen-widget is also present', () => {
      // Requirements: 4.1, 4.2
      // The presence of x-uigen-widget must not interfere with x-uigen-label processing.
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          bio: {
            type: 'string',
            'x-uigen-label': 'About Me',
            'x-uigen-widget': 'textarea'
          }
        }
      });

      const field = body.children?.find(c => c.key === 'bio');
      expect(field).toBeDefined();
      // Label override must be applied regardless of x-uigen-widget being present
      expect(field!.label).toBe('About Me');
      // No other SchemaNode fields (type, key, required) should be affected
      expect(field!.type).toBe('string');
      expect(field!.key).toBe('bio');
    });

    it('x-uigen-widget does not affect the label fallback when x-uigen-label is absent', () => {
      // Requirements: 4.1
      // x-uigen-widget must not change the label — humanize(key) should still be used.
      const body = adaptOpenAPI3Body({
        type: 'object',
        properties: {
          notes: {
            type: 'string',
            'x-uigen-widget': 'textarea'
          }
        }
      });

      const field = body.children?.find(c => c.key === 'notes');
      expect(field!.label).toBe('Notes');
      // type and key must be unaffected
      expect(field!.type).toBe('string');
      expect(field!.key).toBe('notes');
    });
  });

  // -------------------------------------------------------------------------
  // 11. Swagger 2.0 end-to-end: x-uigen-label on a property produces correct SchemaNode.label
  // -------------------------------------------------------------------------
  describe('11. Swagger 2.0 end-to-end', () => {
    it('produces the correct SchemaNode.label from x-uigen-label in a Swagger 2.0 spec', () => {
      // Requirements: 2.1, 2.2
      const body = adaptSwagger2Body({
        type: 'object',
        properties: {
          acct_num: {
            type: 'string',
            'x-uigen-label': 'Account Number'
          }
        }
      });

      const field = body.children?.find(c => c.key === 'acct_num');
      expect(field).toBeDefined();
      expect(field!.label).toBe('Account Number');
    });

    it('falls back to humanize(key) in Swagger 2.0 when x-uigen-label is absent', () => {
      // Requirements: 2.3
      const body = adaptSwagger2Body({
        type: 'object',
        properties: {
          acct_num: { type: 'string' }
        }
      });

      const field = body.children?.find(c => c.key === 'acct_num');
      expect(field!.label).toBe('Acct Num');
    });

    it('preserves x-uigen-label through Swagger 2.0 → OpenAPI 3.x conversion for nested properties', () => {
      // Requirements: 2.1, 2.2
      const body = adaptSwagger2Body({
        type: 'object',
        properties: {
          billing: {
            type: 'object',
            properties: {
              postal_code: {
                type: 'string',
                'x-uigen-label': 'ZIP / Postal Code'
              }
            }
          }
        }
      });

      const billingField = body.children?.find(c => c.key === 'billing');
      expect(billingField).toBeDefined();
      const postalField = billingField!.children?.find(c => c.key === 'postal_code');
      expect(postalField).toBeDefined();
      expect(postalField!.label).toBe('ZIP / Postal Code');
    });

    it('preserves x-uigen-label on array items through Swagger 2.0 conversion', () => {
      // Requirements: 2.1, 2.2
      const body = adaptSwagger2Body({
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: {
              type: 'string',
              'x-uigen-label': 'Tag Entry'
            }
          }
        }
      });

      const tagsField = body.children?.find(c => c.key === 'tags');
      expect(tagsField).toBeDefined();
      expect(tagsField!.items).toBeDefined();
      expect(tagsField!.items!.label).toBe('Tag Entry');
    });

    it('produces the same humanize(key) label from Swagger 2.0 as from OpenAPI 3.x for a property without the extension', () => {
      // Requirements: 2.3
      const key = 'shipping_address';

      const swagger2Body = adaptSwagger2Body({
        type: 'object',
        properties: { [key]: { type: 'string' } }
      });

      const openapi3Body = adaptOpenAPI3Body({
        type: 'object',
        properties: { [key]: { type: 'string' } }
      });

      const sw2Field = swagger2Body.children?.find(c => c.key === key);
      const oa3Field = openapi3Body.children?.find(c => c.key === key);

      expect(sw2Field!.label).toBe(oa3Field!.label);
    });
  });
});
