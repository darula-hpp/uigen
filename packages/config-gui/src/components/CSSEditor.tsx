import { useState, useEffect, useRef, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-css';
import 'prismjs/themes/prism.css';
import './CSSEditor.css';

/**
 * Props for CSSEditor component
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
interface CSSEditorProps {
  baseStyles: string;  // Read-only reference
  theme: string;       // Editable custom theme
  onSave: (theme: string) => Promise<void>;
  className?: string;
}

/**
 * CSSEditor component provides a two-section editor:
 * 1. Base Styles (collapsed, read-only reference)
 * 2. Custom Theme (editable, auto-saved)
 * 
 * Features:
 * - Monospace font for code editing
 * - Line numbers display
 * - Standard text editing operations (copy, paste, undo, redo)
 * - Debounced auto-save with 500ms delay
 * - Save status indicators (saving, saved, error)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function CSSEditor({ baseStyles, theme, onSave, className = '' }: CSSEditorProps) {
  const [content, setContent] = useState(theme);
  const [highlightedContent, setHighlightedContent] = useState('');
  const [baseStylesExpanded, setBaseStylesExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    state: 'idle' | 'saving' | 'saved' | 'error';
    message?: string;
  }>({ state: 'idle' });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Update content when theme prop changes
  useEffect(() => {
    setContent(theme);
  }, [theme]);
  
  // Update syntax highlighting when content changes
  // Requirements: 2.2
  useEffect(() => {
    const highlighted = Prism.highlight(content, Prism.languages.css, 'css');
    setHighlightedContent(highlighted);
  }, [content]);
  
  /**
   * Debounced save handler
   * Requirements: 2.5, 4.1, 4.2
   */
  const debouncedSave = useCallback((newContent: string) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus({ state: 'saving' });
      
      try {
        await onSave(newContent);
        setSaveStatus({ state: 'saved' });
        
        // Auto-hide success indicator after 2 seconds
        setTimeout(() => {
          setSaveStatus({ state: 'idle' });
        }, 2000);
      } catch (error) {
        console.error('CSS save error:', error);
        setSaveStatus({
          state: 'error',
          message: error instanceof Error ? error.message : 'Failed to save CSS'
        });
      }
    }, 500);
  }, [onSave]);
  
  /**
   * Handle content changes
   * Requirements: 2.5, 4.1
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    debouncedSave(newContent);
  };
  
  /**
   * Calculate line numbers based on content
   * Requirements: 2.3
   */
  const lineCount = content.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Save Status Indicator */}
      {/* Requirements: 4.3, 4.4, 4.5 */}
      <div className="mb-4 h-6">
        {saveStatus.state === 'saving' && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </div>
        )}
        
        {saveStatus.state === 'saved' && (
          <div className="flex items-center text-sm text-green-600 dark:text-green-400">
            <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Saved
          </div>
        )}
        
        {saveStatus.state === 'error' && (
          <div className="flex items-center text-sm text-red-600 dark:text-red-400">
            <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {saveStatus.message || 'Failed to save'}
          </div>
        )}
      </div>
      
      {/* Base Styles Section (Collapsible, Read-Only) */}
      {baseStyles && (
        <div className="mb-4 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
          <button
            onClick={() => setBaseStylesExpanded(!baseStylesExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Base Styles (Reference Only)
            </span>
            <svg
              className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${baseStylesExpanded ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {baseStylesExpanded && (
            <div className="bg-gray-50 dark:bg-gray-900 p-4 max-h-96 overflow-auto">
              <pre className="font-mono text-xs text-gray-500 dark:text-gray-500 whitespace-pre-wrap">
                {baseStyles}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {/* Custom Theme Editor Section */}
      <div className="flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Custom Theme
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Add your custom CSS overrides here. Changes are auto-saved.
          </p>
        </div>
        
        <div className="flex-1 flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-800">
          {/* Line Numbers */}
          <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-600 px-3 py-3 text-right select-none">
            <div className="font-mono text-sm text-gray-500 dark:text-gray-400 leading-6">
              {lineNumbers.map(num => (
                <div key={num}>{num}</div>
              ))}
            </div>
          </div>
          
          {/* Editor with Syntax Highlighting */}
          <div className="flex-1 relative overflow-auto">
            {/* Highlighted Code (Background Layer) */}
            <pre
              ref={highlightRef}
              className="absolute inset-0 px-4 py-3 font-mono text-sm leading-6 pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <code
                className="language-css"
                dangerouslySetInnerHTML={{ __html: highlightedContent }}
              />
            </pre>
            
            {/* Textarea (Foreground Layer) */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              className="absolute inset-0 px-4 py-3 font-mono text-sm leading-6 bg-transparent text-transparent caret-gray-900 dark:caret-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              style={{ caretColor: 'inherit' }}
              spellCheck={false}
              data-testid="css-editor-textarea"
              aria-label="CSS theme editor"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
