/**
 * UndoRedoManager - Manages undo/redo functionality for annotation changes
 * 
 * Maintains a stack of up to 50 actions and supports keyboard shortcuts.
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

export interface AnnotationChange {
  path: string;
  before: boolean | undefined;
  after: boolean | undefined;
}

export interface IgnoreAction {
  type: 'toggle' | 'bulk' | 'override' | 'clear';
  timestamp: number;
  changes: AnnotationChange[];
  description?: string;
}

export class UndoRedoManager {
  private stack: IgnoreAction[] = [];
  private position: number = -1;
  private readonly maxSize: number = 50;

  /**
   * Push a new action onto the stack
   * Clears any actions after the current position (redo history)
   */
  push(action: IgnoreAction): void {
    // Remove any actions after current position
    this.stack = this.stack.slice(0, this.position + 1);
    
    // Add new action
    this.stack.push(action);
    
    // Enforce max size limit
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.position++;
    }
  }

  /**
   * Undo the last action
   * Returns the changes to revert, or null if nothing to undo
   */
  undo(): AnnotationChange[] | null {
    if (!this.canUndo()) {
      return null;
    }

    const action = this.stack[this.position];
    this.position--;

    // Return changes with before/after swapped to revert
    return action.changes.map(change => ({
      path: change.path,
      before: change.after,
      after: change.before
    }));
  }

  /**
   * Redo the last undone action
   * Returns the changes to reapply, or null if nothing to redo
   */
  redo(): AnnotationChange[] | null {
    if (!this.canRedo()) {
      return null;
    }

    this.position++;
    const action = this.stack[this.position];

    // Return original changes to reapply
    return action.changes;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.position >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.position < this.stack.length - 1;
  }

  /**
   * Clear the entire stack
   */
  clear(): void {
    this.stack = [];
    this.position = -1;
  }

  /**
   * Get the current action (for debugging/display)
   */
  getCurrentAction(): IgnoreAction | null {
    if (this.position >= 0 && this.position < this.stack.length) {
      return this.stack[this.position];
    }
    return null;
  }

  /**
   * Get the next action that would be redone (for debugging/display)
   */
  getNextAction(): IgnoreAction | null {
    if (this.canRedo()) {
      return this.stack[this.position + 1];
    }
    return null;
  }

  /**
   * Get the size of the stack
   */
  getStackSize(): number {
    return this.stack.length;
  }

  /**
   * Get the current position in the stack
   */
  getPosition(): number {
    return this.position;
  }
}
