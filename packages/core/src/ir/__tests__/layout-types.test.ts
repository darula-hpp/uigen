import { describe, it, expect } from 'vitest';
import type {
  LayoutConfig,
  LayoutType,
  LayoutMetadata,
  ResponsiveColumns,
  UIGenApp,
  Resource,
} from '../types.js';

describe('Layout Types', () => {
  describe('LayoutType', () => {
    it('should accept built-in layout types', () => {
      const sidebarType: LayoutType = 'sidebar';
      const centeredType: LayoutType = 'centered';
      const dashboardType: LayoutType = 'dashboard-grid';
      const customType: LayoutType = 'custom-layout';

      expect(sidebarType).toBe('sidebar');
      expect(centeredType).toBe('centered');
      expect(dashboardType).toBe('dashboard-grid');
      expect(customType).toBe('custom-layout');
    });
  });

  describe('ResponsiveColumns', () => {
    it('should create responsive column configuration', () => {
      const columns: ResponsiveColumns = {
        mobile: 1,
        tablet: 2,
        desktop: 3,
      };

      expect(columns.mobile).toBe(1);
      expect(columns.tablet).toBe(2);
      expect(columns.desktop).toBe(3);
    });

    it('should allow partial responsive column configuration', () => {
      const columns: ResponsiveColumns = {
        mobile: 1,
        desktop: 3,
      };

      expect(columns.mobile).toBe(1);
      expect(columns.tablet).toBeUndefined();
      expect(columns.desktop).toBe(3);
    });
  });

  describe('LayoutMetadata', () => {
    it('should create sidebar layout metadata', () => {
      const metadata: LayoutMetadata = {
        sidebarWidth: 250,
        sidebarCollapsible: true,
        sidebarDefaultCollapsed: false,
      };

      expect(metadata.sidebarWidth).toBe(250);
      expect(metadata.sidebarCollapsible).toBe(true);
      expect(metadata.sidebarDefaultCollapsed).toBe(false);
    });

    it('should create centered layout metadata', () => {
      const metadata: LayoutMetadata = {
        maxWidth: 600,
        showHeader: true,
        verticalCenter: true,
      };

      expect(metadata.maxWidth).toBe(600);
      expect(metadata.showHeader).toBe(true);
      expect(metadata.verticalCenter).toBe(true);
    });

    it('should create dashboard grid layout metadata', () => {
      const metadata: LayoutMetadata = {
        columns: {
          mobile: 1,
          tablet: 2,
          desktop: 3,
        },
        gap: 16,
      };

      expect(metadata.columns?.mobile).toBe(1);
      expect(metadata.columns?.tablet).toBe(2);
      expect(metadata.columns?.desktop).toBe(3);
      expect(metadata.gap).toBe(16);
    });

    it('should support custom metadata properties', () => {
      const metadata: LayoutMetadata = {
        customProperty: 'custom-value',
        anotherCustom: 42,
      };

      expect(metadata.customProperty).toBe('custom-value');
      expect(metadata.anotherCustom).toBe(42);
    });

    it('should support breakpoints configuration', () => {
      const metadata: LayoutMetadata = {
        breakpoints: {
          mobile: 640,
          tablet: 768,
          desktop: 1024,
        },
      };

      expect(metadata.breakpoints?.mobile).toBe(640);
      expect(metadata.breakpoints?.tablet).toBe(768);
      expect(metadata.breakpoints?.desktop).toBe(1024);
    });
  });

  describe('LayoutConfig', () => {
    it('should create layout config with type only', () => {
      const config: LayoutConfig = {
        type: 'sidebar',
      };

      expect(config.type).toBe('sidebar');
      expect(config.metadata).toBeUndefined();
    });

    it('should create layout config with type and metadata', () => {
      const config: LayoutConfig = {
        type: 'centered',
        metadata: {
          maxWidth: 600,
          verticalCenter: true,
        },
      };

      expect(config.type).toBe('centered');
      expect(config.metadata?.maxWidth).toBe(600);
      expect(config.metadata?.verticalCenter).toBe(true);
    });

    it('should support custom layout types', () => {
      const config: LayoutConfig = {
        type: 'my-custom-layout',
        metadata: {
          customOption: 'value',
        },
      };

      expect(config.type).toBe('my-custom-layout');
      expect(config.metadata?.customOption).toBe('value');
    });
  });

  describe('UIGenApp with layoutConfig', () => {
    it('should extend UIGenApp with optional layoutConfig', () => {
      const app: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [],
        layoutConfig: {
          type: 'sidebar',
          metadata: {
            sidebarWidth: 280,
            sidebarCollapsible: true,
          },
        },
      };

      expect(app.layoutConfig?.type).toBe('sidebar');
      expect(app.layoutConfig?.metadata?.sidebarWidth).toBe(280);
    });

    it('should allow UIGenApp without layoutConfig', () => {
      const app: UIGenApp = {
        meta: {
          title: 'Test App',
          version: '1.0.0',
        },
        resources: [],
        auth: {
          schemes: [],
          globalRequired: false,
        },
        dashboard: {
          enabled: false,
          widgets: [],
        },
        servers: [],
      };

      expect(app.layoutConfig).toBeUndefined();
    });
  });

  describe('Resource with layoutOverride', () => {
    it('should extend Resource with optional layoutOverride', () => {
      const resource: Resource = {
        name: 'User',
        slug: 'users',
        uigenId: 'user-resource',
        operations: [],
        schema: {
          type: 'object',
          key: 'user',
          label: 'User',
          required: false,
        },
        relationships: [],
        layoutOverride: {
          type: 'centered',
          metadata: {
            maxWidth: 500,
          },
        },
      };

      expect(resource.layoutOverride?.type).toBe('centered');
      expect(resource.layoutOverride?.metadata?.maxWidth).toBe(500);
    });

    it('should allow Resource without layoutOverride', () => {
      const resource: Resource = {
        name: 'User',
        slug: 'users',
        uigenId: 'user-resource',
        operations: [],
        schema: {
          type: 'object',
          key: 'user',
          label: 'User',
          required: false,
        },
        relationships: [],
      };

      expect(resource.layoutOverride).toBeUndefined();
    });
  });

  describe('Type serialization', () => {
    it('should serialize and deserialize LayoutConfig to JSON', () => {
      const config: LayoutConfig = {
        type: 'dashboard-grid',
        metadata: {
          columns: {
            mobile: 1,
            tablet: 2,
            desktop: 4,
          },
          gap: 20,
          breakpoints: {
            mobile: 640,
            tablet: 768,
            desktop: 1024,
          },
        },
      };

      const json = JSON.stringify(config);
      const parsed = JSON.parse(json) as LayoutConfig;

      expect(parsed.type).toBe('dashboard-grid');
      expect(parsed.metadata?.columns?.mobile).toBe(1);
      expect(parsed.metadata?.columns?.tablet).toBe(2);
      expect(parsed.metadata?.columns?.desktop).toBe(4);
      expect(parsed.metadata?.gap).toBe(20);
      expect(parsed.metadata?.breakpoints?.mobile).toBe(640);
    });
  });
});
