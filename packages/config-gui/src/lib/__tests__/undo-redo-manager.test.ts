import { describe, it, expect, beforeEach } from 'vitest';
import { UndoRedoManager, type IgnoreAction, type AnnotationChange } from '../undo-redo-manager.js';

describe('UndoRedoManager', () => {
  let manager: UndoRedoManager;

  beforeEach(() => {
    manager = new UndoRedoManager();
  });

  describe('push', () => {
    it('should add action to stack', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [
          { path: 'components.schemas.User.properties.email', before: undefined, after: true }
        ]
      };

      manager.push(action);

      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
      expect(manager.getStackSize()).toBe(1);
    });

    it('should clear redo history when pushing new action', () => {
      const action1: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };
      const action2: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path2', before: undefined, after: true }]
      };
      const action3: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path3', before: undefined, after: true }]
      };

      manager.push(action1);
      manager.push(action2);
      manager.undo();
      
      expect(manager.canRedo()).toBe(true);
      
      manager.push(action3);
      
      expect(manager.canRedo()).toBe(false);
      expect(manager.getStackSize()).toBe(2);
    });

    it('should enforce max size limit of 50 actions', () => {
      for (let i = 0; i < 60; i++) {
        const action: IgnoreAction = {
          type: 'toggle',
          timestamp: Date.now(),
          changes: [{ path: `path${i}`, before: undefined, after: true }]
        };
        manager.push(action);
      }

      expect(manager.getStackSize()).toBe(50);
      expect(manager.canUndo()).toBe(true);
    });
  });

  describe('undo', () => {
    it('should return null when nothing to undo', () => {
      expect(manager.undo()).toBeNull();
    });

    it('should return changes with before/after swapped', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [
          { path: 'path1', before: undefined, after: true },
          { path: 'path2', before: false, after: true }
        ]
      };

      manager.push(action);
      const undoChanges = manager.undo();

      expect(undoChanges).toEqual([
        { path: 'path1', before: true, after: undefined },
        { path: 'path2', before: true, after: false }
      ]);
    });

    it('should move position back', () => {
      const action1: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };
      const action2: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path2', before: undefined, after: true }]
      };

      manager.push(action1);
      manager.push(action2);
      
      expect(manager.getPosition()).toBe(1);
      
      manager.undo();
      
      expect(manager.getPosition()).toBe(0);
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(true);
    });

    it('should allow multiple undos', () => {
      const action1: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };
      const action2: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path2', before: undefined, after: true }]
      };

      manager.push(action1);
      manager.push(action2);
      
      const undo1 = manager.undo();
      const undo2 = manager.undo();
      
      expect(undo1).not.toBeNull();
      expect(undo2).not.toBeNull();
      expect(manager.canUndo()).toBe(false);
    });
  });

  describe('redo', () => {
    it('should return null when nothing to redo', () => {
      expect(manager.redo()).toBeNull();
    });

    it('should return original changes', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [
          { path: 'path1', before: undefined, after: true },
          { path: 'path2', before: false, after: true }
        ]
      };

      manager.push(action);
      manager.undo();
      const redoChanges = manager.redo();

      expect(redoChanges).toEqual([
        { path: 'path1', before: undefined, after: true },
        { path: 'path2', before: false, after: true }
      ]);
    });

    it('should move position forward', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };

      manager.push(action);
      manager.undo();
      
      expect(manager.getPosition()).toBe(-1);
      
      manager.redo();
      
      expect(manager.getPosition()).toBe(0);
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });

    it('should allow multiple redos', () => {
      const action1: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };
      const action2: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path2', before: undefined, after: true }]
      };

      manager.push(action1);
      manager.push(action2);
      manager.undo();
      manager.undo();
      
      const redo1 = manager.redo();
      const redo2 = manager.redo();
      
      expect(redo1).not.toBeNull();
      expect(redo2).not.toBeNull();
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('canUndo', () => {
    it('should return false when stack is empty', () => {
      expect(manager.canUndo()).toBe(false);
    });

    it('should return true when actions exist', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };

      manager.push(action);
      
      expect(manager.canUndo()).toBe(true);
    });

    it('should return false after undoing all actions', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };

      manager.push(action);
      manager.undo();
      
      expect(manager.canUndo()).toBe(false);
    });
  });

  describe('canRedo', () => {
    it('should return false when no undo has been performed', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };

      manager.push(action);
      
      expect(manager.canRedo()).toBe(false);
    });

    it('should return true after undo', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };

      manager.push(action);
      manager.undo();
      
      expect(manager.canRedo()).toBe(true);
    });

    it('should return false after redo', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };

      manager.push(action);
      manager.undo();
      manager.redo();
      
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all actions', () => {
      const action1: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };
      const action2: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path2', before: undefined, after: true }]
      };

      manager.push(action1);
      manager.push(action2);
      
      manager.clear();
      
      expect(manager.getStackSize()).toBe(0);
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
      expect(manager.getPosition()).toBe(-1);
    });
  });

  describe('bulk actions', () => {
    it('should handle bulk action as single undo/redo', () => {
      const bulkAction: IgnoreAction = {
        type: 'bulk',
        timestamp: Date.now(),
        changes: [
          { path: 'path1', before: undefined, after: true },
          { path: 'path2', before: undefined, after: true },
          { path: 'path3', before: undefined, after: true }
        ],
        description: 'Ignore all selected elements'
      };

      manager.push(bulkAction);
      
      expect(manager.getStackSize()).toBe(1);
      
      const undoChanges = manager.undo();
      
      expect(undoChanges).toHaveLength(3);
      expect(undoChanges).toEqual([
        { path: 'path1', before: true, after: undefined },
        { path: 'path2', before: true, after: undefined },
        { path: 'path3', before: true, after: undefined }
      ]);
    });
  });

  describe('getCurrentAction', () => {
    it('should return null when no actions', () => {
      expect(manager.getCurrentAction()).toBeNull();
    });

    it('should return current action', () => {
      const action: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };

      manager.push(action);
      
      expect(manager.getCurrentAction()).toEqual(action);
    });

    it('should return correct action after undo', () => {
      const action1: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };
      const action2: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path2', before: undefined, after: true }]
      };

      manager.push(action1);
      manager.push(action2);
      manager.undo();
      
      expect(manager.getCurrentAction()).toEqual(action1);
    });
  });

  describe('getNextAction', () => {
    it('should return null when nothing to redo', () => {
      expect(manager.getNextAction()).toBeNull();
    });

    it('should return next action after undo', () => {
      const action1: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path1', before: undefined, after: true }]
      };
      const action2: IgnoreAction = {
        type: 'toggle',
        timestamp: Date.now(),
        changes: [{ path: 'path2', before: undefined, after: true }]
      };

      manager.push(action1);
      manager.push(action2);
      manager.undo();
      
      expect(manager.getNextAction()).toEqual(action2);
    });
  });
});
