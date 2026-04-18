import { describe, it, expect, beforeEach } from 'vitest';
import { PruningEngine, type VisibilityResult } from '../pruning-engine.js';
import type { SpecNode } from '../ignore-state-calculator.js';

describe('PruningEngine', () => {
  let engine: PruningEngine;
  
  beforeEach(() => {
    engine = new PruningEngine();
  });
  
  describe('setShowPrunedElements() and getShowPrunedElements()', () => {
    it('should default to showing pruned elements', () => {
      expect(engine.getShowPrunedElements()).toBe(true);
    });
    
    it('should update show pruned elements preference', () => {
      engine.setShowPrunedElements(false);
      expect(engine.getShowPrunedElements()).toBe(false);
    });
    
    it('should allow toggling preference multiple times', () => {
      engine.setShowPrunedElements(false);
      expect(engine.getShowPrunedElements()).toBe(false);
      
      engine.setShowPrunedElements(true);
      expect(engine.getShowPrunedElements()).toBe(true);
      
      engine.setShowPrunedElements(false);
      expect(engine.getShowPrunedElements()).toBe(false);
    });
  });
  
  describe('calculateVisibility()', () => {
    describe('active elements', () => {
      it('should return visible for active elements', () => {
        const result = engine.calculateVisibility(
          'components.schemas.User.properties.email',
          false
        );
        
        expect(result.visible).toBe(true);
        expect(result.reason).toBe('active');
        expect(result.prunedBy).toBeUndefined();
      });
      
      it('should return visible for active elements regardless of preference', () => {
        engine.setShowPrunedElements(false);
        
        const result = engine.calculateVisibility(
          'components.schemas.User.properties.email',
          false
        );
        
        expect(result.visible).toBe(true);
        expect(result.reason).toBe('active');
      });
    });
    
    describe('pruned elements with show preference enabled', () => {
      it('should return visible for pruned elements when show preference is true', () => {
        engine.setShowPrunedElements(true);
        
        const result = engine.calculateVisibility(
          'components.schemas.User.properties.email',
          true,
          'components.schemas.User'
        );
        
        expect(result.visible).toBe(true);
        expect(result.reason).toBe('pruned-shown');
        expect(result.prunedBy).toBe('components.schemas.User');
      });
      
      it('should include prunedBy information when provided', () => {
        const result = engine.calculateVisibility(
          'components.schemas.User.properties.email',
          true,
          'components.schemas.User'
        );
        
        expect(result.prunedBy).toBe('components.schemas.User');
      });
    });
    
    describe('pruned elements with show preference disabled', () => {
      it('should return not visible for pruned elements when show preference is false', () => {
        engine.setShowPrunedElements(false);
        
        const result = engine.calculateVisibility(
          'components.schemas.User.properties.email',
          true,
          'components.schemas.User'
        );
        
        expect(result.visible).toBe(false);
        expect(result.reason).toBe('pruned-hidden');
        expect(result.prunedBy).toBe('components.schemas.User');
      });
      
      it('should include prunedBy information even when hidden', () => {
        engine.setShowPrunedElements(false);
        
        const result = engine.calculateVisibility(
          'components.schemas.User.properties.email',
          true,
          'components.schemas.User'
        );
        
        expect(result.prunedBy).toBe('components.schemas.User');
      });
    });
  });
  
  describe('getAffectedChildren()', () => {
    it('should return all children without explicit annotations', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          },
          {
            path: 'components.schemas.User.properties.name',
            type: 'property',
            name: 'name',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>();
      
      const affected = engine.getAffectedChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(2);
      expect(affected).toContain('components.schemas.User.properties.email');
      expect(affected).toContain('components.schemas.User.properties.name');
    });
    
    it('should exclude children with explicit false (overrides)', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          },
          {
            path: 'components.schemas.User.properties.name',
            type: 'property',
            name: 'name',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', false]
      ]);
      
      const affected = engine.getAffectedChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(1);
      expect(affected).toContain('components.schemas.User.properties.name');
      expect(affected).not.toContain('components.schemas.User.properties.email');
    });
    
    it('should include children with explicit true', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          },
          {
            path: 'components.schemas.User.properties.name',
            type: 'property',
            name: 'name',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', true]
      ]);
      
      const affected = engine.getAffectedChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(2);
      expect(affected).toContain('components.schemas.User.properties.email');
      expect(affected).toContain('components.schemas.User.properties.name');
    });
    
    it('should recursively collect nested children', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.address',
            type: 'property',
            name: 'address',
            children: [
              {
                path: 'components.schemas.User.properties.address.properties.city',
                type: 'property',
                name: 'city',
                children: []
              },
              {
                path: 'components.schemas.User.properties.address.properties.street',
                type: 'property',
                name: 'street',
                children: []
              }
            ]
          }
        ]
      };
      
      const annotations = new Map<string, boolean>();
      
      const affected = engine.getAffectedChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(3);
      expect(affected).toContain('components.schemas.User.properties.address');
      expect(affected).toContain('components.schemas.User.properties.address.properties.city');
      expect(affected).toContain('components.schemas.User.properties.address.properties.street');
    });
    
    it('should stop recursion at override nodes', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.address',
            type: 'property',
            name: 'address',
            children: [
              {
                path: 'components.schemas.User.properties.address.properties.city',
                type: 'property',
                name: 'city',
                children: []
              }
            ]
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.address', false]
      ]);
      
      const affected = engine.getAffectedChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(0);
      expect(affected).not.toContain('components.schemas.User.properties.address');
      expect(affected).not.toContain('components.schemas.User.properties.address.properties.city');
    });
    
    it('should return empty array when parent not found', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: []
      };
      
      const annotations = new Map<string, boolean>();
      
      const affected = engine.getAffectedChildren(
        'components.schemas.NonExistent',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(0);
    });
  });
  
  describe('getHiddenChildren()', () => {
    const specStructure: SpecNode = {
      path: 'components.schemas.User',
      type: 'schema',
      name: 'User',
      children: [
        {
          path: 'components.schemas.User.properties.email',
          type: 'property',
          name: 'email',
          children: []
        },
        {
          path: 'components.schemas.User.properties.name',
          type: 'property',
          name: 'name',
          children: []
        }
      ]
    };
    
    it('should return empty array when show pruned elements is true', () => {
      engine.setShowPrunedElements(true);
      
      const annotations = new Map<string, boolean>();
      
      const hidden = engine.getHiddenChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(hidden).toHaveLength(0);
    });
    
    it('should return affected children when show pruned elements is false', () => {
      engine.setShowPrunedElements(false);
      
      const annotations = new Map<string, boolean>();
      
      const hidden = engine.getHiddenChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(hidden).toHaveLength(2);
      expect(hidden).toContain('components.schemas.User.properties.email');
      expect(hidden).toContain('components.schemas.User.properties.name');
    });
    
    it('should exclude overrides from hidden children', () => {
      engine.setShowPrunedElements(false);
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', false]
      ]);
      
      const hidden = engine.getHiddenChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(hidden).toHaveLength(1);
      expect(hidden).toContain('components.schemas.User.properties.name');
      expect(hidden).not.toContain('components.schemas.User.properties.email');
    });
  });
  
  describe('hasChildOverrides()', () => {
    it('should return false when no children have overrides', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>();
      
      const hasOverrides = engine.hasChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(hasOverrides).toBe(false);
    });
    
    it('should return true when direct child has override', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', false]
      ]);
      
      const hasOverrides = engine.hasChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(hasOverrides).toBe(true);
    });
    
    it('should return true when nested child has override', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.address',
            type: 'property',
            name: 'address',
            children: [
              {
                path: 'components.schemas.User.properties.address.properties.city',
                type: 'property',
                name: 'city',
                children: []
              }
            ]
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.address.properties.city', false]
      ]);
      
      const hasOverrides = engine.hasChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(hasOverrides).toBe(true);
    });
    
    it('should return false when children have explicit true', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', true]
      ]);
      
      const hasOverrides = engine.hasChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(hasOverrides).toBe(false);
    });
    
    it('should return false when parent not found', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: []
      };
      
      const annotations = new Map<string, boolean>();
      
      const hasOverrides = engine.hasChildOverrides(
        'components.schemas.NonExistent',
        specStructure,
        annotations
      );
      
      expect(hasOverrides).toBe(false);
    });
  });
  
  describe('getChildOverrides()', () => {
    it('should return empty array when no children have overrides', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>();
      
      const overrides = engine.getChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(overrides).toHaveLength(0);
    });
    
    it('should return direct child overrides', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          },
          {
            path: 'components.schemas.User.properties.name',
            type: 'property',
            name: 'name',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', false]
      ]);
      
      const overrides = engine.getChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(overrides).toHaveLength(1);
      expect(overrides).toContain('components.schemas.User.properties.email');
    });
    
    it('should return multiple child overrides', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          },
          {
            path: 'components.schemas.User.properties.name',
            type: 'property',
            name: 'name',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', false],
        ['components.schemas.User.properties.name', false]
      ]);
      
      const overrides = engine.getChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(overrides).toHaveLength(2);
      expect(overrides).toContain('components.schemas.User.properties.email');
      expect(overrides).toContain('components.schemas.User.properties.name');
    });
    
    it('should return nested child overrides', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.address',
            type: 'property',
            name: 'address',
            children: [
              {
                path: 'components.schemas.User.properties.address.properties.city',
                type: 'property',
                name: 'city',
                children: []
              },
              {
                path: 'components.schemas.User.properties.address.properties.street',
                type: 'property',
                name: 'street',
                children: []
              }
            ]
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.address.properties.city', false]
      ]);
      
      const overrides = engine.getChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(overrides).toHaveLength(1);
      expect(overrides).toContain('components.schemas.User.properties.address.properties.city');
    });
    
    it('should not include children with explicit true', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          },
          {
            path: 'components.schemas.User.properties.name',
            type: 'property',
            name: 'name',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', false],
        ['components.schemas.User.properties.name', true]
      ]);
      
      const overrides = engine.getChildOverrides(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(overrides).toHaveLength(1);
      expect(overrides).toContain('components.schemas.User.properties.email');
      expect(overrides).not.toContain('components.schemas.User.properties.name');
    });
    
    it('should return empty array when parent not found', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: []
      };
      
      const annotations = new Map<string, boolean>();
      
      const overrides = engine.getChildOverrides(
        'components.schemas.NonExistent',
        specStructure,
        annotations
      );
      
      expect(overrides).toHaveLength(0);
    });
  });
  
  describe('edge cases', () => {
    it('should handle deeply nested structures', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.level1',
            type: 'property',
            name: 'level1',
            children: [
              {
                path: 'components.schemas.User.properties.level1.properties.level2',
                type: 'property',
                name: 'level2',
                children: [
                  {
                    path: 'components.schemas.User.properties.level1.properties.level2.properties.level3',
                    type: 'property',
                    name: 'level3',
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      };
      
      const annotations = new Map<string, boolean>();
      
      const affected = engine.getAffectedChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(3);
    });
    
    it('should handle empty spec structure', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: []
      };
      
      const annotations = new Map<string, boolean>();
      
      const affected = engine.getAffectedChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(0);
    });
    
    it('should handle mixed override and non-override children', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: [
          {
            path: 'components.schemas.User.properties.email',
            type: 'property',
            name: 'email',
            children: []
          },
          {
            path: 'components.schemas.User.properties.name',
            type: 'property',
            name: 'name',
            children: []
          },
          {
            path: 'components.schemas.User.properties.age',
            type: 'property',
            name: 'age',
            children: []
          }
        ]
      };
      
      const annotations = new Map<string, boolean>([
        ['components.schemas.User.properties.email', false],
        ['components.schemas.User.properties.age', true]
      ]);
      
      const affected = engine.getAffectedChildren(
        'components.schemas.User',
        specStructure,
        annotations
      );
      
      expect(affected).toHaveLength(2);
      expect(affected).toContain('components.schemas.User.properties.name');
      expect(affected).toContain('components.schemas.User.properties.age');
      expect(affected).not.toContain('components.schemas.User.properties.email');
    });
  });
});
