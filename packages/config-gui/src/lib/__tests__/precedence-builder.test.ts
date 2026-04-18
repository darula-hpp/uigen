import { describe, it, expect } from 'vitest';
import { buildAnnotationHierarchy, createElementInfo } from '../precedence-builder.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Unit tests for precedence-builder utility
 * 
 * Tests the logic for building annotation hierarchies based on element paths
 */

describe('precedence-builder', () => {
  describe('buildAnnotationHierarchy', () => {
    describe('Property elements', () => {
      it('should build hierarchy for schema property', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'components.schemas.User.properties.email': {
              'x-uigen-ignore': true
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'components.schemas.User.properties.email',
          'property',
          config
        );

        expect(hierarchy).toHaveLength(2);
        expect(hierarchy[0].level).toBe('property');
        expect(hierarchy[0].path).toBe('components.schemas.User.properties.email');
        expect(hierarchy[0].annotation).toBe(true);
        expect(hierarchy[0].isActive).toBe(true);

        expect(hierarchy[1].level).toBe('schema');
        expect(hierarchy[1].path).toBe('components.schemas.User');
        expect(hierarchy[1].annotation).toBeUndefined();
        expect(hierarchy[1].isActive).toBe(false);
      });

      it('should mark schema level as active when property has no annotation', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'components.schemas.User': {
              'x-uigen-ignore': true
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'components.schemas.User.properties.email',
          'property',
          config
        );

        expect(hierarchy[0].isActive).toBe(false);
        expect(hierarchy[1].isActive).toBe(true);
      });
    });

    describe('Schema elements', () => {
      it('should build hierarchy for schema object', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'components.schemas.User': {
              'x-uigen-ignore': false
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'components.schemas.User',
          'schema',
          config
        );

        expect(hierarchy).toHaveLength(1);
        expect(hierarchy[0].level).toBe('schema');
        expect(hierarchy[0].path).toBe('components.schemas.User');
        expect(hierarchy[0].annotation).toBe(false);
        expect(hierarchy[0].isActive).toBe(true);
      });
    });

    describe('Parameter elements', () => {
      it('should build hierarchy for operation-level parameter', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./users.get.parameters.query.limit': {
              'x-uigen-ignore': true
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users.get.parameters.query.limit',
          'parameter',
          config
        );

        expect(hierarchy).toHaveLength(3);
        expect(hierarchy[0].level).toBe('parameter');
        expect(hierarchy[0].path).toBe('paths./users.get.parameters.query.limit');
        expect(hierarchy[0].annotation).toBe(true);
        expect(hierarchy[0].isActive).toBe(true);

        expect(hierarchy[1].level).toBe('operation');
        expect(hierarchy[1].path).toBe('paths./users.get');

        expect(hierarchy[2].level).toBe('path');
        expect(hierarchy[2].path).toBe('paths./users');
      });

      it('should mark operation level as active when parameter has no annotation', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./users.get': {
              'x-uigen-ignore': true
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users.get.parameters.query.limit',
          'parameter',
          config
        );

        expect(hierarchy[0].isActive).toBe(false);
        expect(hierarchy[1].isActive).toBe(true);
        expect(hierarchy[2].isActive).toBe(false);
      });
    });

    describe('Request body elements', () => {
      it('should build hierarchy for request body', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./users.post.requestBody': {
              'x-uigen-ignore': true
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users.post.requestBody',
          'requestBody',
          config
        );

        expect(hierarchy).toHaveLength(2);
        expect(hierarchy[0].level).toBe('operation');
        expect(hierarchy[0].path).toBe('paths./users.post.requestBody');
        expect(hierarchy[0].annotation).toBe(true);

        expect(hierarchy[1].level).toBe('path');
        expect(hierarchy[1].path).toBe('paths./users');
      });
    });

    describe('Response elements', () => {
      it('should build hierarchy for response', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./users.get.responses.200': {
              'x-uigen-ignore': false
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users.get.responses.200',
          'response',
          config
        );

        expect(hierarchy).toHaveLength(2);
        expect(hierarchy[0].level).toBe('operation');
        expect(hierarchy[0].path).toBe('paths./users.get.responses.200');
        expect(hierarchy[0].annotation).toBe(false);

        expect(hierarchy[1].level).toBe('path');
        expect(hierarchy[1].path).toBe('paths./users');
      });
    });

    describe('Operation elements', () => {
      it('should build hierarchy for operation', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./users.get': {
              'x-uigen-ignore': true
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users.get',
          'operation',
          config
        );

        expect(hierarchy).toHaveLength(2);
        expect(hierarchy[0].level).toBe('operation');
        expect(hierarchy[0].path).toBe('paths./users.get');
        expect(hierarchy[0].annotation).toBe(true);
        expect(hierarchy[0].isActive).toBe(true);

        expect(hierarchy[1].level).toBe('path');
        expect(hierarchy[1].path).toBe('paths./users');
        expect(hierarchy[1].annotation).toBeUndefined();
        expect(hierarchy[1].isActive).toBe(false);
      });
    });

    describe('Path elements', () => {
      it('should build hierarchy for path item', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./users': {
              'x-uigen-ignore': false
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users',
          'path',
          config
        );

        expect(hierarchy).toHaveLength(1);
        expect(hierarchy[0].level).toBe('path');
        expect(hierarchy[0].path).toBe('paths./users');
        expect(hierarchy[0].annotation).toBe(false);
        expect(hierarchy[0].isActive).toBe(true);
      });
    });

    describe('Precedence resolution', () => {
      it('should mark most specific annotation as active', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./users.get.parameters.query.limit': {
              'x-uigen-ignore': false
            },
            'paths./users.get': {
              'x-uigen-ignore': true
            },
            'paths./users': {
              'x-uigen-ignore': true
            }
          }
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users.get.parameters.query.limit',
          'parameter',
          config
        );

        // Parameter level should be active (most specific)
        expect(hierarchy[0].isActive).toBe(true);
        expect(hierarchy[1].isActive).toBe(false);
        expect(hierarchy[2].isActive).toBe(false);
      });

      it('should handle no annotations at any level', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {}
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users.get.parameters.query.limit',
          'parameter',
          config
        );

        // No level should be active
        expect(hierarchy.every(level => !level.isActive)).toBe(true);
        expect(hierarchy.every(level => level.annotation === undefined)).toBe(true);
      });
    });

    describe('Display names', () => {
      it('should generate appropriate display names', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {}
        };

        const hierarchy = buildAnnotationHierarchy(
          'paths./users.get.parameters.query.limit',
          'parameter',
          config
        );

        expect(hierarchy[0].displayName).toContain('Parameter');
        expect(hierarchy[0].displayName).toContain('limit');

        expect(hierarchy[1].displayName).toContain('Operation');
        expect(hierarchy[1].displayName).toContain('get');

        expect(hierarchy[2].displayName).toContain('Path');
        expect(hierarchy[2].displayName).toContain('/users');
      });
    });
  });

  describe('createElementInfo', () => {
    it('should create ElementInfo with provided name', () => {
      const info = createElementInfo(
        'components.schemas.User.properties.email',
        'property',
        'Email Address'
      );

      expect(info.path).toBe('components.schemas.User.properties.email');
      expect(info.type).toBe('property');
      expect(info.name).toBe('Email Address');
    });

    it('should use last path segment as default name', () => {
      const info = createElementInfo(
        'components.schemas.User.properties.email',
        'property'
      );

      expect(info.name).toBe('email');
    });

    it('should handle path without segments', () => {
      const info = createElementInfo('User', 'schema');

      expect(info.name).toBe('User');
    });
  });
});
