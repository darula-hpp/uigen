/**
 * Type definitions for the Visual Canvas Editor for x-uigen-ref annotations
 * 
 * This file contains all core data models and type definitions used across
 * the RefLink visual canvas components.
 */

/**
 * Configuration for a ref link (x-uigen-ref annotation)
 * Represents a connection from a field to a target resource
 */
export interface RefLinkConfig {
  /** Path to the source field (e.g., "users.departmentId") */
  fieldPath: string;
  /** Target resource slug */
  resource: string;
  /** Field to use as value in the target resource */
  valueField: string;
  /** Field to use as label in the target resource */
  labelField: string;
}

/**
 * Temporary state during connection creation
 * Used when user completes a drag-to-connect operation
 */
export interface PendingConnection {
  /** Path to the source field being connected */
  fieldPath: string;
  /** Slug of the target resource */
  targetSlug: string;
}

/**
 * Line coordinates during drag operation
 * Used to render the pending connection line while dragging
 */
export interface PendingLine {
  /** Path to the source field */
  fieldPath: string;
  /** Start X coordinate (world coordinates) */
  x1: number;
  /** Start Y coordinate (world coordinates) */
  y1: number;
  /** End X coordinate (world coordinates) */
  x2: number;
  /** End Y coordinate (world coordinates) */
  y2: number;
}

/**
 * Union type for different drag modes
 * Represents the current drag operation state
 */
export type DragMode =
  | {
      /** Card drag mode - moving a resource card */
      kind: 'card';
      /** Slug of the card being dragged */
      slug: string;
      /** Initial mouse X position */
      startMouseX: number;
      /** Initial mouse Y position */
      startMouseY: number;
      /** Initial card X position */
      startNodeX: number;
      /** Initial card Y position */
      startNodeY: number;
    }
  | {
      /** Port drag mode - creating a connection */
      kind: 'port';
      /** Path of the field being connected from */
      fieldPath: string;
      /** Initial mouse X position */
      startMouseX: number;
      /** Initial mouse Y position */
      startMouseY: number;
    }
  | {
      /** Pan mode - panning the canvas */
      kind: 'pan';
      /** Initial mouse X position */
      startMouseX: number;
      /** Initial mouse Y position */
      startMouseY: number;
      /** Initial pan X offset */
      startPanX: number;
      /** Initial pan Y offset */
      startPanY: number;
    };

/**
 * Union type for panel visibility state
 * Represents which panel (if any) is currently displayed
 */
export type PanelState =
  | {
      /** No panel displayed */
      type: 'none';
    }
  | {
      /** Configuration form for new ref link */
      type: 'config';
      /** Path to the source field */
      fieldPath: string;
      /** Slug of the target resource */
      targetSlug: string;
    }
  | {
      /** Edit panel for existing ref link */
      type: 'edit';
      /** The ref link being edited */
      refLink: RefLinkConfig;
    };
