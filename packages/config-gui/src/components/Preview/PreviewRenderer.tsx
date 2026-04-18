import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.js';
import type { SpecStructure } from '../../types/index.js';

/**
 * Props for PreviewRenderer component
 */
export interface PreviewRendererProps {
  structure: SpecStructure | null;
}

/**
 * PreviewRenderer displays a live preview of how annotation settings affect the generated UI.
 *
 * Features:
 * - Parses spec with current config applied
 * - Renders sample views (form, list, detail)
 * - Debounces updates (500ms) on config changes
 * - Shows UI without annotation when disabled
 * - Uses same rendering logic as serve command
 *
 * Requirements: 7.1, 7.2, 7.5
 *
 * Usage:
 * ```tsx
 * <PreviewRenderer structure={specStructure} />
 * ```
 */
export function PreviewRenderer({ structure }: PreviewRendererProps) {
  const { state } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce config changes (500ms)
  const [debouncedConfig, setDebouncedConfig] = useState(state.config);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setDebouncedConfig(state.config);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [state.config]);

  // Generate preview data based on structure and config
  const previewData = useMemo(() => {
    if (!structure || !debouncedConfig) {
      return null;
    }

    try {
      return generatePreviewData(structure, debouncedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
      return null;
    }
  }, [structure, debouncedConfig]);

  if (!structure) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No preview available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Load a spec file to see a preview of the generated UI.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Preview Error</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="preview-renderer">
      {isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-blue-900 dark:text-blue-200">Updating preview...</span>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">UI Preview</h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            This preview shows how your annotation settings affect the generated UI
          </p>
        </div>

        <div className="p-6 space-y-8">
          {previewData && (
            <>
              {/* Form View Preview */}
              {previewData.formView && (
                <PreviewSection
                  title="Form View"
                  description="How fields appear in create/edit forms"
                >
                  <FormPreview data={previewData.formView} />
                </PreviewSection>
              )}

              {/* List View Preview */}
              {previewData.listView && (
                <PreviewSection
                  title="List View"
                  description="How fields appear in list tables"
                >
                  <ListPreview data={previewData.listView} />
                </PreviewSection>
              )}

              {/* Detail View Preview */}
              {previewData.detailView && (
                <PreviewSection
                  title="Detail View"
                  description="How fields appear in detail pages"
                >
                  <DetailPreview data={previewData.detailView} />
                </PreviewSection>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

interface PreviewSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function PreviewSection({ title, description, children }: PreviewSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
}

interface FormPreviewProps {
  data: FormPreviewData;
}

function FormPreview({ data }: FormPreviewProps) {
  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
      {data.fields.map(field => (
        <div key={field.path} className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.ignored ? (
            <div className="text-xs text-gray-400 italic">Field ignored</div>
          ) : field.isRef ? (
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>Select {field.refResource}...</option>
            </select>
          ) : (
            <input
              type="text"
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={field.ignored}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface ListPreviewProps {
  data: ListPreviewData;
}

function ListPreview({ data }: ListPreviewProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {data.columns.map(col => (
              <th
                key={col.path}
                className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr>
            {data.columns.map(col => (
              <td key={col.path} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                {col.ignored ? (
                  <span className="text-gray-400 dark:text-gray-500 italic">Hidden</span>
                ) : (
                  <span>Sample {col.label}</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface DetailPreviewProps {
  data: DetailPreviewData;
}

function DetailPreview({ data }: DetailPreviewProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 space-y-3">
      {data.fields.map(field => (
        <div key={field.path} className="flex items-start gap-3">
          <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 flex-shrink-0">
            {field.label}:
          </dt>
          <dd className="text-sm text-gray-900 dark:text-white flex-1">
            {field.ignored ? (
              <span className="text-gray-400 dark:text-gray-500 italic">Hidden</span>
            ) : (
              <span>Sample {field.label}</span>
            )}
          </dd>
        </div>
      ))}
    </div>
  );
}

// --- Helper Functions ---

interface PreviewData {
  formView: FormPreviewData | null;
  listView: ListPreviewData | null;
  detailView: DetailPreviewData | null;
}

interface FormPreviewData {
  fields: Array<{
    path: string;
    label: string;
    required: boolean;
    ignored: boolean;
    isRef: boolean;
    refResource?: string;
  }>;
}

interface ListPreviewData {
  columns: Array<{
    path: string;
    label: string;
    ignored: boolean;
  }>;
}

interface DetailPreviewData {
  fields: Array<{
    path: string;
    label: string;
    ignored: boolean;
  }>;
}

/**
 * Generate preview data from spec structure and config
 */
function generatePreviewData(
  structure: SpecStructure,
  config: any
): PreviewData {
  // Get first resource for preview
  const resource = structure.resources[0];
  if (!resource) {
    return {
      formView: null,
      listView: null,
      detailView: null
    };
  }

  const annotations = config?.annotations || {};

  // Generate field data with annotations applied
  const fields = resource.fields.map(field => {
    const fieldAnnotations = annotations[field.path] || {};
    const label = fieldAnnotations['x-uigen-label'] || field.label;
    const ignored = Boolean(fieldAnnotations['x-uigen-ignore']);
    const refConfig = fieldAnnotations['x-uigen-ref'];

    return {
      path: field.path,
      label,
      required: field.required,
      ignored,
      isRef: Boolean(refConfig),
      refResource: refConfig?.resource
    };
  });

  return {
    formView: {
      fields: fields.filter(f => !f.ignored)
    },
    listView: {
      columns: fields.slice(0, 5) // Show first 5 columns
    },
    detailView: {
      fields: fields.filter(f => !f.ignored)
    }
  };
}
