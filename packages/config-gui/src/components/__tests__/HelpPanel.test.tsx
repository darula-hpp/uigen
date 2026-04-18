import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpPanel } from '../HelpPanel.js';
import type { AnnotationMetadata } from '../../types/index.js';

describe('HelpPanel', () => {
  const mockAnnotations: AnnotationMetadata[] = [
    {
      name: 'x-uigen-label',
      description: 'Customize the display label for a field',
      targetType: 'field',
      parameterSchema: {
        type: 'string',
        properties: {
          value: {
            type: 'string',
            description: 'The custom label text'
          }
        },
        required: ['value']
      },
      examples: [
        {
          description: 'Set a custom label',
          value: 'Full Name'
        }
      ]
    },
    {
      name: 'x-uigen-ignore',
      description: 'Hide a field from the generated UI',
      targetType: 'field',
      parameterSchema: {
        type: 'boolean'
      },
      examples: [
        {
          description: 'Ignore a field',
          value: true
        }
      ]
    }
  ];

  describe('Rendering', () => {
    it('should render help panel', () => {
      render(<HelpPanel annotations={mockAnnotations} />);
      expect(screen.getByTestId('help-panel')).toBeInTheDocument();
    });

    it('should render toggle button', () => {
      render(<HelpPanel annotations={mockAnnotations} />);
      expect(screen.getByTestId('help-panel-toggle')).toBeInTheDocument();
      expect(screen.getByText('Help & Documentation')).toBeInTheDocument();
    });

    it('should be collapsed by default', () => {
      render(<HelpPanel annotations={mockAnnotations} />);
      expect(screen.queryByTestId('getting-started-guide')).not.toBeInTheDocument();
    });

    it('should be open when initiallyOpen is true', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      expect(screen.getByTestId('getting-started-guide')).toBeInTheDocument();
    });
  });

  describe('Toggle Behavior', () => {
    it('should expand when toggle button is clicked', () => {
      render(<HelpPanel annotations={mockAnnotations} />);
      
      const toggle = screen.getByTestId('help-panel-toggle');
      fireEvent.click(toggle);
      
      expect(screen.getByTestId('getting-started-guide')).toBeInTheDocument();
    });

    it('should collapse when toggle button is clicked again', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      const toggle = screen.getByTestId('help-panel-toggle');
      fireEvent.click(toggle);
      
      expect(screen.queryByTestId('getting-started-guide')).not.toBeInTheDocument();
    });

    it('should update aria-expanded attribute', () => {
      render(<HelpPanel annotations={mockAnnotations} />);
      
      const toggle = screen.getByTestId('help-panel-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Tab Navigation', () => {
    it('should render tab buttons when open', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      expect(screen.getByTestId('getting-started-tab')).toBeInTheDocument();
      expect(screen.getByTestId('annotations-tab')).toBeInTheDocument();
    });

    it('should show getting started guide by default', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      expect(screen.getByTestId('getting-started-guide')).toBeInTheDocument();
      expect(screen.queryByTestId('annotations-reference')).not.toBeInTheDocument();
    });

    it('should switch to annotations reference when tab is clicked', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      const annotationsTab = screen.getByTestId('annotations-tab');
      fireEvent.click(annotationsTab);
      
      expect(screen.queryByTestId('getting-started-guide')).not.toBeInTheDocument();
      expect(screen.getByTestId('annotations-reference')).toBeInTheDocument();
    });

    it('should switch back to getting started when tab is clicked', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      // Switch to annotations
      fireEvent.click(screen.getByTestId('annotations-tab'));
      
      // Switch back to getting started
      fireEvent.click(screen.getByTestId('getting-started-tab'));
      
      expect(screen.getByTestId('getting-started-guide')).toBeInTheDocument();
      expect(screen.queryByTestId('annotations-reference')).not.toBeInTheDocument();
    });
  });

  describe('Getting Started Guide', () => {
    it('should render welcome message', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      expect(screen.getByText('Welcome to UIGen Config GUI')).toBeInTheDocument();
    });

    it('should render quick start steps', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      expect(screen.getByText(/Enable\/Disable Annotations:/)).toBeInTheDocument();
      expect(screen.getByText(/Set Default Values:/)).toBeInTheDocument();
      expect(screen.getByText(/Visual Editor:/)).toBeInTheDocument();
      expect(screen.getByText(/Preview:/)).toBeInTheDocument();
    });

    it('should render visual editor tips', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      expect(screen.getByText(/Labels:/)).toBeInTheDocument();
      expect(screen.getByText(/Ignore:/)).toBeInTheDocument();
      expect(screen.getByText(/Ref Links:/)).toBeInTheDocument();
      expect(screen.getByText(/Login:/)).toBeInTheDocument();
    });

    it('should render configuration precedence note', () => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      
      expect(screen.getByText('Configuration Precedence')).toBeInTheDocument();
    });
  });

  describe('Annotations Reference', () => {
    beforeEach(() => {
      render(<HelpPanel annotations={mockAnnotations} initiallyOpen={true} />);
      fireEvent.click(screen.getByTestId('annotations-tab'));
    });

    it('should render annotation list', () => {
      expect(screen.getByTestId('annotation-help-x-uigen-label')).toBeInTheDocument();
      expect(screen.getByTestId('annotation-help-x-uigen-ignore')).toBeInTheDocument();
    });

    it('should render annotation names', () => {
      expect(screen.getByText('x-uigen-label')).toBeInTheDocument();
      expect(screen.getByText('x-uigen-ignore')).toBeInTheDocument();
    });

    it('should render annotation targets', () => {
      const targets = screen.getAllByText('field');
      expect(targets.length).toBeGreaterThan(0);
    });

    it('should expand annotation details when clicked', () => {
      const labelAnnotation = screen.getByTestId('annotation-help-x-uigen-label');
      const button = labelAnnotation.querySelector('button');
      
      fireEvent.click(button!);
      
      expect(screen.getByText('Customize the display label for a field')).toBeInTheDocument();
    });

    it('should render parameter information', () => {
      const labelAnnotation = screen.getByTestId('annotation-help-x-uigen-label');
      const button = labelAnnotation.querySelector('button');
      
      fireEvent.click(button!);
      
      expect(screen.getByText('Parameters:')).toBeInTheDocument();
      expect(screen.getByText('value')).toBeInTheDocument();
      expect(screen.getByText('The custom label text')).toBeInTheDocument();
    });

    it('should render example code', () => {
      const labelAnnotation = screen.getByTestId('annotation-help-x-uigen-label');
      const button = labelAnnotation.querySelector('button');
      
      fireEvent.click(button!);
      
      expect(screen.getByText('Examples:')).toBeInTheDocument();
      expect(screen.getByText('Set a custom label')).toBeInTheDocument();
    });

    it('should collapse annotation details when clicked again', () => {
      const labelAnnotation = screen.getByTestId('annotation-help-x-uigen-label');
      const button = labelAnnotation.querySelector('button');
      
      fireEvent.click(button!);
      expect(screen.getByText('Customize the display label for a field')).toBeInTheDocument();
      
      fireEvent.click(button!);
      expect(screen.queryByText('Customize the display label for a field')).not.toBeInTheDocument();
    });

    it('should handle empty annotations list', () => {
      const { container } = render(<HelpPanel annotations={[]} initiallyOpen={true} />);
      const annotationsTab = container.querySelectorAll('[data-testid="annotations-tab"]')[0];
      
      fireEvent.click(annotationsTab!);
      
      expect(screen.getByText('No annotations available')).toBeInTheDocument();
    });
  });
});
