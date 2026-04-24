import { useState, useCallback, useMemo } from 'react';
import type { SpecStructure, ResourceNode } from '../../types/index.js';
import type { RefLinkConfig, PanelState } from './RefLinkTypes.js';
import { RefLinkGraphCanvas } from './RefLinkGraphCanvas.js';
import { RefLinkConfigForm } from './RefLinkConfigForm.js';
import { RefLinkEditPanel } from './RefLinkEditPanel.js';
import { useAppContext } from '../../contexts/AppContext.js';

/**
 * Props for RefLinkVisualCanvas component
 */
export interface RefLinkVisualCanvasProps {
  /** Parsed spec structure containing resources and fields */
  structure: SpecStructure;
}

/**
 * RefLinkVisualCanvas - Top-level orchestrator component for visual ref link editor
 * 
 * This component integrates all the pieces of the visual canvas editor:
 * - Extracts existing ref links from config.annotations on load
 * - Manages panel state (none, config, edit)
 * - Renders RefLinkGraphCanvas with resources and ref links
 * - Handles connection initiated event to open config form
 * - Handles connection complete to save new ref link to config.annotations
 * - Handles ref link select to open edit panel
 * - Handles ref link update to modify config.annotations
 * - Handles ref link delete to remove from config.annotations
 * - Passes loadConfig and saveConfig from AppContext
 * 
 * Requirements: 1.1, 4.4, 5.1, 5.7, 6.1, 6.2, 6.5, 7.1, 7.4, 8.1, 8.2, 8.3
 * 
 * @param props - Component props
 * @returns RefLinkVisualCanvas component
 */
export function RefLinkVisualCanvas({ structure }: RefLinkVisualCanvasProps) {
  const { state, actions } = useAppContext();
  const { config } = state;

  // Panel state management
  const [panel, setPanel] = useState<PanelState>({ type: 'none' });

  /**
   * Extract ref links from config.annotations
   * 
   * Scans config.annotations for x-uigen-ref entries and converts them to RefLinkConfig objects.
   * 
   * Requirements: 6.1
   */
  const refLinks = useMemo<RefLinkConfig[]>(() => {
    if (!config?.annotations) {
      return [];
    }

    const links: RefLinkConfig[] = [];

    // Iterate through all annotation entries
    for (const [fieldPath, annotations] of Object.entries(config.annotations)) {
      // Check if this field has an x-uigen-ref annotation
      const refAnnotation = annotations['x-uigen-ref'];
      if (refAnnotation && typeof refAnnotation === 'object') {
        // Extract the ref link configuration
        const refConfig = refAnnotation as {
          resource?: string;
          valueField?: string;
          labelField?: string;
        };

        // Only include if all required fields are present
        if (refConfig.resource && refConfig.valueField && refConfig.labelField) {
          links.push({
            fieldPath,
            resource: refConfig.resource,
            valueField: refConfig.valueField,
            labelField: refConfig.labelField,
          });
        }
      }
    }

    return links;
  }, [config?.annotations]);

  /**
   * Find a resource by slug
   */
  const findResourceBySlug = useCallback(
    (slug: string): ResourceNode | undefined => {
      return structure.resources.find((r) => r.slug === slug);
    },
    [structure.resources]
  );

  /**
   * Handle connection initiated - open config form
   * 
   * Called when user completes a drag-to-connect operation.
   * Opens the configuration form to select valueField and labelField.
   * 
   * Requirements: 4.4, 5.1
   */
  const handleConnectionInitiated = useCallback((fieldPath: string, targetSlug: string) => {
    setPanel({
      type: 'config',
      fieldPath,
      targetSlug,
    });
  }, []);

  /**
   * Handle connection complete - save new ref link
   * 
   * Called when user confirms the configuration form.
   * Saves the new x-uigen-ref annotation to config.annotations.
   * 
   * Requirements: 5.7
   */
  const handleConnectionComplete = useCallback(
    async (refLinkConfig: RefLinkConfig) => {
      if (!config) {
        return;
      }

      // Create updated config with new ref link
      const updatedConfig = {
        ...config,
        annotations: {
          ...config.annotations,
          [refLinkConfig.fieldPath]: {
            ...config.annotations[refLinkConfig.fieldPath],
            'x-uigen-ref': {
              resource: refLinkConfig.resource,
              valueField: refLinkConfig.valueField,
              labelField: refLinkConfig.labelField,
            },
          },
        },
      };

      // Save config
      await actions.saveConfig(updatedConfig);

      // Close panel
      setPanel({ type: 'none' });
    },
    [config, actions]
  );

  /**
   * Handle ref link select - open edit panel
   * 
   * Called when user clicks on an existing ref link line.
   * Opens the edit panel to modify or delete the ref link.
   * 
   * Requirements: 6.5, 7.1
   */
  const handleRefLinkSelect = useCallback((refLink: RefLinkConfig) => {
    setPanel({
      type: 'edit',
      refLink,
    });
  }, []);

  /**
   * Handle ref link update - modify existing ref link
   * 
   * Called when user saves changes in the edit panel.
   * Updates the x-uigen-ref annotation in config.annotations.
   * 
   * Requirements: 7.4
   */
  const handleRefLinkUpdate = useCallback(
    async (refLinkConfig: RefLinkConfig) => {
      if (!config) {
        return;
      }

      // Create updated config with modified ref link
      const updatedConfig = {
        ...config,
        annotations: {
          ...config.annotations,
          [refLinkConfig.fieldPath]: {
            ...config.annotations[refLinkConfig.fieldPath],
            'x-uigen-ref': {
              resource: refLinkConfig.resource,
              valueField: refLinkConfig.valueField,
              labelField: refLinkConfig.labelField,
            },
          },
        },
      };

      // Save config
      await actions.saveConfig(updatedConfig);

      // Close panel
      setPanel({ type: 'none' });
    },
    [config, actions]
  );

  /**
   * Handle ref link delete - remove ref link
   * 
   * Called when user confirms deletion in the edit panel.
   * Removes the x-uigen-ref annotation from config.annotations.
   * 
   * Requirements: 8.2, 8.3
   */
  const handleRefLinkDelete = useCallback(async () => {
    if (!config || panel.type !== 'edit') {
      return;
    }

    const { refLink } = panel;

    // Create updated config with ref link removed
    const updatedAnnotations = { ...config.annotations };
    const fieldAnnotations = { ...updatedAnnotations[refLink.fieldPath] };

    // Remove x-uigen-ref annotation
    delete fieldAnnotations['x-uigen-ref'];

    // If no annotations remain for this field, remove the field entry
    if (Object.keys(fieldAnnotations).length === 0) {
      delete updatedAnnotations[refLink.fieldPath];
    } else {
      updatedAnnotations[refLink.fieldPath] = fieldAnnotations;
    }

    const updatedConfig = {
      ...config,
      annotations: updatedAnnotations,
    };

    // Save config
    await actions.saveConfig(updatedConfig);

    // Close panel
    setPanel({ type: 'none' });
  }, [config, panel, actions]);

  /**
   * Handle cancel - close panel
   */
  const handleCancel = useCallback(() => {
    setPanel({ type: 'none' });
  }, []);

  /**
   * Load config function for PositionManager
   */
  const loadConfig = useCallback(async () => {
    // Fetch config directly from API
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }

    const loadedConfig = await response.json();
    return loadedConfig ?? { version: '1.0', enabled: {}, defaults: {}, annotations: {} };
  }, []);

  /**
   * Save config function for PositionManager
   */
  const saveConfig = useCallback(async (configToSave: any) => {
    // Save config directly via API
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configToSave),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to save config: ${errorData.error || response.statusText}`);
    }
  }, []);

  return (
    <div className="relative" data-testid="ref-link-visual-canvas">
      {/* Canvas */}
      <RefLinkGraphCanvas
        resources={structure.resources}
        refLinks={refLinks}
        onConnectionInitiated={handleConnectionInitiated}
        onRefLinkSelect={handleRefLinkSelect}
        loadConfig={loadConfig}
        saveConfig={saveConfig}
      />

      {/* Config Form */}
      {panel.type === 'config' && (() => {
        const targetResource = findResourceBySlug(panel.targetSlug);
        if (!targetResource) {
          return null;
        }

        return (
          <RefLinkConfigForm
            fieldPath={panel.fieldPath}
            targetResource={targetResource}
            onConfirm={handleConnectionComplete}
            onCancel={handleCancel}
          />
        );
      })()}

      {/* Edit Panel */}
      {panel.type === 'edit' && (() => {
        const targetResource = findResourceBySlug(panel.refLink.resource);
        if (!targetResource) {
          return null;
        }

        return (
          <RefLinkEditPanel
            refLink={panel.refLink}
            targetResource={targetResource}
            onUpdate={handleRefLinkUpdate}
            onDelete={handleRefLinkDelete}
            onClose={handleCancel}
          />
        );
      })()}
    </div>
  );
}
