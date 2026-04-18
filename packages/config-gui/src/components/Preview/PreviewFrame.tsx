import { useState, useEffect, useRef } from 'react';

/**
 * Props for PreviewFrame component
 */
export interface PreviewFrameProps {
  /** HTML content to render in the iframe */
  content: string;
  /** Called when preview encounters an error */
  onError?: (error: Error) => void;
}

/**
 * PreviewFrame renders preview content in an isolated iframe with sandbox.
 *
 * Features:
 * - Renders preview in isolated iframe
 * - Handles preview errors gracefully
 * - Displays loading spinner during updates
 * - Sandboxed for security
 *
 * Requirements: 7.1, 12.4
 *
 * Usage:
 * ```tsx
 * <PreviewFrame content={htmlContent} onError={handleError} />
 * ```
 */
export function PreviewFrame({ content, onError }: PreviewFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      try {
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument;
          if (doc) {
            doc.open();
            doc.write(content);
            doc.close();
            setIsLoading(false);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render preview';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [content, onError]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
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
            <h3 className="text-sm font-semibold text-red-900">Preview Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white shadow rounded-lg overflow-hidden" data-testid="preview-frame">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              data-testid="loading-spinner"
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
            <span className="text-sm text-gray-600">Loading preview...</span>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="UI Preview"
        className="w-full h-[600px] border-0"
        sandbox="allow-same-origin allow-scripts"
        data-testid="preview-iframe"
      />
    </div>
  );
}
