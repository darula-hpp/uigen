import { describe, it, expect, beforeEach } from 'vitest';
import { IgnoreStateCalculator, type SpecNode, type ElementType } from '../ignore-state-calculator.js';

describe('IgnoreStateCalculator', () => {
  let calculator: IgnoreStateCalculator;
  
  beforeEach(() => {
    calculator = new IgnoreStateCalculator();
  });
  
  describe('calculateState()', () => {
    describe('explicit annotations', () => {
      it('should return explicit state when element has direct annotation', () => {
        const annotations = new Map<string, boolean>([
          ['components.schemas.User.properties.email', true]
        ]);
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.explicit).toBe(true);
        expect(state.effective).toBe(true);
        expect(state.source).toBe('explicit');
        expect(state.isOverride).toBe(false);
      });
      
      it('should return explicit false when element is explicitly included', () => {
        const annotations = new Map<string, boolean>([
          ['components.schemas.User.properties.email', false]
        ]);
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.explicit).toBe(false);
        expect(state.effective).toBe(false);
        expect(state.source).toBe('explicit');
        expect(state.isOverride).toBe(false);
      });
    });
    
    describe('precedence resolution', () => {
      it('should prioritize property annotation over schema annotation', () => {
        const annotations = new Map<string, boolean>([
          ['components.schemas.User', true],
          ['components.schemas.User.properties.email', false]
        ]);
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.effective).toBe(false);
        expect(state.source).toBe('explicit');
      });
      
      it('should prioritize parameter annotation over operation annotation', () => {
        const annotations = new Map<string, boolean>([
          ['paths./users.get', true],
          ['paths./users.get.parameters.query.limit', false]
        ]);
        
        const state = calculator.calculateState(
          'paths./users.get.parameters.query.limit',
          'parameter',
          annotations
        );
        
        expect(state.effective).toBe(false);
        expect(state.source).toBe('explicit');
      });
      
      it('should prioritize operation annotation over path annotation', () => {
        const annotations = new Map<string, boolean>([
          ['paths./users', true],
          ['paths./users.get', false]
        ]);
        
        const state = calculator.calculateState(
          'paths./users.get',
          'operation',
          annotations
        );
        
        expect(state.effective).toBe(false);
        expect(state.source).toBe('explicit');
      });
    });
    
    describe('inheritance detection', () => {
      it('should inherit ignored state from parent schema', () => {
        const annotations = new Map<string, boolean>([
          ['components.schemas.User', true]
        ]);
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.explicit).toBeUndefined();
        expect(state.effective).toBe(true);
        expect(state.source).toBe('inherited');
        expect(state.inheritedFrom).toBe('components.schemas.User');
      });
      
      it('should inherit ignored state from parent operation', () => {
        const annotations = new Map<string, boolean>([
          ['paths./users.get', true]
        ]);
        
        const state = calculator.calculateState(
          'paths./users.get.requestBody',
          'requestBody',
          annotations
        );
        
        expect(state.explicit).toBeUndefined();
        expect(state.effective).toBe(true);
        expect(state.source).toBe('inherited');
        expect(state.inheritedFrom).toBe('paths./users.get');
      });
      
      it('should inherit ignored state from parent path', () => {
        const annotations = new Map<string, boolean>([
          ['paths./users', true]
        ]);
        
        const state = calculator.calculateState(
          'paths./users.get',
          'operation',
          annotations
        );
        
        expect(state.explicit).toBeUndefined();
        expect(state.effective).toBe(true);
        expect(state.source).toBe('inherited');
        expect(state.inheritedFrom).toBe('paths./users');
      });
      
      it('should propagate inheritance through multiple levels', () => {
        const annotations = new Map<string, boolean>([
          ['paths./users', true]
        ]);
        
        const state = calculator.calculateState(
          'paths./users.get.parameters.query.limit',
          'parameter',
          annotations
        );
        
        expect(state.effective).toBe(true);
        expect(state.source).toBe('inherited');
        expect(state.inheritedFrom).toBe('paths./users');
      });
    });
    
    describe('override detection', () => {
      it('should detect override when child has explicit false and parent has true', () => {
        const annotations = new Map<string, boolean>([
          ['components.schemas.User', true],
          ['components.schemas.User.properties.email', false]
        ]);
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.explicit).toBe(false);
        expect(state.effective).toBe(false);
        expect(state.source).toBe('explicit');
        expect(state.isOverride).toBe(true);
      });
      
      it('should not detect override when both parent and child are false', () => {
        const annotations = new Map<string, boolean>([
          ['components.schemas.User', false],
          ['components.schemas.User.properties.email', false]
        ]);
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.isOverride).toBe(false);
      });
      
      it('should not detect override when child has true and parent has true', () => {
        const annotations = new Map<string, boolean>([
          ['components.schemas.User', true],
          ['components.schemas.User.properties.email', true]
        ]);
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.isOverride).toBe(false);
      });
    });
    
    describe('default state', () => {
      it('should return default included state when no annotations exist', () => {
        const annotations = new Map<string, boolean>();
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.explicit).toBeUndefined();
        expect(state.effective).toBe(false);
        expect(state.source).toBe('default');
        expect(state.isOverride).toBe(false);
      });
      
      it('should return default included state when parent is not ignored', () => {
        const annotations = new Map<string, boolean>([
          ['components.schemas.User', false]
        ]);
        
        const state = calculator.calculateState(
          'components.schemas.User.properties.email',
          'property',
          annotations
        );
        
        expect(state.effective).toBe(false);
        expect(state.source).toBe('default');
      });
    });
  });
  
  describe('isPruned()', () => {
    it('should return false when element has explicit annotation', () => {
      const annotations = new Map<string, boolean>([
        ['components.schemas.User', true],
        ['components.schemas.User.properties.email', false]
      ]);
      
      const isPruned = calculator.isPruned(
        'components.schemas.User.properties.email',
        annotations
      );
      
      expect(isPruned).toBe(false);
    });
    
    it('should return true when parent is ignored and element has no annotation', () => {
      const annotations = new Map<string, boolean>([
        ['components.schemas.User', true]
      ]);
      
      const isPruned = calculator.isPruned(
        'components.schemas.User.properties.email',
        annotations
      );
      
      expect(isPruned).toBe(true);
    });
    
    it('should return false when no parent is ignored', () => {
      const annotations = new Map<string, boolean>();
      
      const isPruned = calculator.isPruned(
        'components.schemas.User.properties.email',
        annotations
      );
      
      expect(isPruned).toBe(false);
    });
    
    it('should return true when grandparent is ignored', () => {
      const annotations = new Map<string, boolean>([
        ['paths./users', true]
      ]);
      
      const isPruned = calculator.isPruned(
        'paths./users.get.parameters.query.limit',
        annotations
      );
      
      expect(isPruned).toBe(true);
    });
  });
  
  describe('getPrunedChildren()', () => {
    it('should return all children of ignored parent', () => {
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
      
      const prunedChildren = calculator.getPrunedChildren(
        'components.schemas.User',
        specStructure
      );
      
      expect(prunedChildren).toHaveLength(2);
      expect(prunedChildren).toContain('components.schemas.User.properties.email');
      expect(prunedChildren).toContain('components.schemas.User.properties.name');
    });
    
    it('should return nested children recursively', () => {
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
      
      const prunedChildren = calculator.getPrunedChildren(
        'components.schemas.User',
        specStructure
      );
      
      expect(prunedChildren).toHaveLength(2);
      expect(prunedChildren).toContain('components.schemas.User.properties.address');
      expect(prunedChildren).toContain('components.schemas.User.properties.address.properties.city');
    });
    
    it('should return empty array when parent not found', () => {
      const specStructure: SpecNode = {
        path: 'components.schemas.User',
        type: 'schema',
        name: 'User',
        children: []
      };
      
      const prunedChildren = calculator.getPrunedChildren(
        'components.schemas.NonExistent',
        specStructure
      );
      
      expect(prunedChildren).toHaveLength(0);
    });
  });
  
  describe('isOverride()', () => {
    it('should return true when child is false and parent is true', () => {
      const isOverride = calculator.isOverride(
        'components.schemas.User.properties.email',
        false,
        'components.schemas.User',
        true
      );
      
      expect(isOverride).toBe(true);
    });
    
    it('should return false when child is true and parent is true', () => {
      const isOverride = calculator.isOverride(
        'components.schemas.User.properties.email',
        true,
        'components.schemas.User',
        true
      );
      
      expect(isOverride).toBe(false);
    });
    
    it('should return false when child is false and parent is false', () => {
      const isOverride = calculator.isOverride(
        'components.schemas.User.properties.email',
        false,
        'components.schemas.User',
        false
      );
      
      expect(isOverride).toBe(false);
    });
    
    it('should return false when child is undefined', () => {
      const isOverride = calculator.isOverride(
        'components.schemas.User.properties.email',
        undefined,
        'components.schemas.User',
        true
      );
      
      expect(isOverride).toBe(false);
    });
    
    it('should return false when parent is undefined', () => {
      const isOverride = calculator.isOverride(
        'components.schemas.User.properties.email',
        false,
        'components.schemas.User',
        undefined
      );
      
      expect(isOverride).toBe(false);
    });
  });
  
  describe('caching', () => {
    it('should cache computed states', () => {
      const annotations = new Map<string, boolean>([
        ['components.schemas.User', true]
      ]);
      
      const state1 = calculator.calculateState(
        'components.schemas.User.properties.email',
        'property',
        annotations
      );
      
      const state2 = calculator.calculateState(
        'components.schemas.User.properties.email',
        'property',
        annotations
      );
      
      // Should return the same object reference (cached)
      expect(state1).toBe(state2);
    });
    
    it('should invalidate cache when requested', () => {
      const annotations = new Map<string, boolean>([
        ['components.schemas.User', true]
      ]);
      
      const state1 = calculator.calculateState(
        'components.schemas.User.properties.email',
        'property',
        annotations
      );
      
      calculator.invalidateCache();
      
      const state2 = calculator.calculateState(
        'components.schemas.User.properties.email',
        'property',
        annotations
      );
      
      // Should return different object reference (cache cleared)
      expect(state1).not.toBe(state2);
      // But values should be the same
      expect(state1).toEqual(state2);
    });
    
    it('should use different cache entries for different annotations', () => {
      const annotations1 = new Map<string, boolean>([
        ['components.schemas.User', true]
      ]);
      
      const annotations2 = new Map<string, boolean>([
        ['components.schemas.User', false]
      ]);
      
      const state1 = calculator.calculateState(
        'components.schemas.User.properties.email',
        'property',
        annotations1
      );
      
      const state2 = calculator.calculateState(
        'components.schemas.User.properties.email',
        'property',
        annotations2
      );
      
      expect(state1.effective).toBe(true);
      expect(state2.effective).toBe(false);
    });
  });
  
  describe('edge cases', () => {
    it('should handle deeply nested properties', () => {
      const annotations = new Map<string, boolean>([
        ['components.schemas.User', true]
      ]);
      
      const state = calculator.calculateState(
        'components.schemas.User.properties.address.properties.street.properties.number',
        'property',
        annotations
      );
      
      expect(state.effective).toBe(true);
      expect(state.source).toBe('inherited');
    });
    
    it('should handle paths with special characters', () => {
      const annotations = new Map<string, boolean>([
        ['paths./users/{id}', true]
      ]);
      
      const state = calculator.calculateState(
        'paths./users/{id}.get',
        'operation',
        annotations
      );
      
      expect(state.effective).toBe(true);
      expect(state.source).toBe('inherited');
    });
    
    it('should handle response paths', () => {
      const annotations = new Map<string, boolean>([
        ['paths./users.get', true]
      ]);
      
      const state = calculator.calculateState(
        'paths./users.get.responses.200',
        'response',
        annotations
      );
      
      expect(state.effective).toBe(true);
      expect(state.source).toBe('inherited');
    });
    
    it('should handle parameter paths with type', () => {
      const annotations = new Map<string, boolean>([
        ['paths./users.get', true]
      ]);
      
      const state = calculator.calculateState(
        'paths./users.get.parameters.query.limit',
        'parameter',
        annotations
      );
      
      expect(state.effective).toBe(true);
      expect(state.source).toBe('inherited');
    });
  });
});
