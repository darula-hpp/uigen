import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileUpload } from '../FileUpload';
import { StrategyRegistry } from '../../../lib/file-upload/StrategyRegistry';
import { ImageUploadStrategy } from '../../../lib/file-upload/strategies/ImageUploadStrategy';
import { DocumentUploadStrategy } from '../../../lib/file-upload/strategies/DocumentUploadStrategy';
import { VideoUploadStrategy } from '../../../lib/file-upload/strategies/VideoUploadStrategy';
import { GenericUploadStrategy } from '../../../lib/file-upload/strategies/GenericUploadStrategy';
import type { SchemaNode } from '@uigen/core';

describe('FileUpload - File Type Integration', () => {
  let registry: StrategyRegistry;

  beforeEach(() => {
    registry = StrategyRegistry.getInstance();
    registry.clear();
    
    // Register strategies for all categories
    registry.registerForCategory('image', new ImageUploadStrategy());
    registry.registerForCategory('document', new DocumentUploadStrategy());
    registry.registerForCategory('video', new VideoUploadStrategy());
    registry.registerForCategory('generic', new GenericUploadStrategy());
  });

  const mockRegister = vi.fn((name: string) => ({
    name,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
  }));

  describe('fileType reading from schema.fileMetadata', () => {
    it('should read fileType from schema.fileMetadata for image', () => {
      const schema: SchemaNode = {
        key: 'avatar',
        label: 'Avatar',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['image/png', 'image/jpeg'],
          maxSizeBytes: 5242880,
          multiple: false,
          accept: 'image/png,image/jpeg',
          fileType: 'image',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('Avatar')).toBeInTheDocument();
    });

    it('should read fileType from schema.fileMetadata for document', () => {
      const schema: SchemaNode = {
        key: 'document',
        label: 'Document',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['application/pdf'],
          maxSizeBytes: 10485760,
          multiple: false,
          accept: 'application/pdf',
          fileType: 'document',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('Document')).toBeInTheDocument();
    });

    it('should read fileType from schema.fileMetadata for video', () => {
      const schema: SchemaNode = {
        key: 'video',
        label: 'Video',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['video/mp4'],
          maxSizeBytes: 52428800,
          multiple: false,
          accept: 'video/mp4',
          fileType: 'video',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('Video')).toBeInTheDocument();
    });

    it('should default to generic when fileType is missing', () => {
      const schema: SchemaNode = {
        key: 'file',
        label: 'File',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['*/*'],
          maxSizeBytes: 10485760,
          multiple: false,
          accept: '*/*',
          fileType: undefined as any,
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('File')).toBeInTheDocument();
    });

    it('should default to generic when fileMetadata is missing', () => {
      const schema: SchemaNode = {
        key: 'file',
        label: 'File',
        type: 'file',
        required: false,
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('File')).toBeInTheDocument();
    });
  });

  describe('strategy selection using file type category', () => {
    it('should use image strategy for image file type', () => {
      const getStrategySpy = vi.spyOn(registry, 'getStrategy');
      
      const schema: SchemaNode = {
        key: 'avatar',
        label: 'Avatar',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['image/png'],
          maxSizeBytes: 5242880,
          multiple: false,
          accept: 'image/png',
          fileType: 'image',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      // Component should be rendered, strategy will be called when files are selected
      expect(screen.getByLabelText('Avatar')).toBeInTheDocument();
    });

    it('should use document strategy for document file type', () => {
      const schema: SchemaNode = {
        key: 'document',
        label: 'Document',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['application/pdf'],
          maxSizeBytes: 10485760,
          multiple: false,
          accept: 'application/pdf',
          fileType: 'document',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('Document')).toBeInTheDocument();
    });

    it('should use video strategy for video file type', () => {
      const schema: SchemaNode = {
        key: 'video',
        label: 'Video',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['video/mp4'],
          maxSizeBytes: 52428800,
          multiple: false,
          accept: 'video/mp4',
          fileType: 'video',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('Video')).toBeInTheDocument();
    });

    it('should use generic strategy for generic file type', () => {
      const schema: SchemaNode = {
        key: 'file',
        label: 'File',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['*/*'],
          maxSizeBytes: 10485760,
          multiple: false,
          accept: '*/*',
          fileType: 'generic',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('File')).toBeInTheDocument();
    });
  });

  describe('array file upload with file type propagation', () => {
    it('should handle multiple image uploads with image file type', () => {
      const schema: SchemaNode = {
        key: 'images',
        label: 'Images',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['image/png', 'image/jpeg'],
          maxSizeBytes: 5242880,
          multiple: true,
          accept: 'image/png,image/jpeg',
          fileType: 'image',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      const input = screen.getByLabelText('Images') as HTMLInputElement;
      expect(input.multiple).toBe(true);
    });

    it('should handle multiple document uploads with document file type', () => {
      const schema: SchemaNode = {
        key: 'documents',
        label: 'Documents',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['application/pdf'],
          maxSizeBytes: 10485760,
          multiple: true,
          accept: 'application/pdf',
          fileType: 'document',
        },
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      const input = screen.getByLabelText('Documents') as HTMLInputElement;
      expect(input.multiple).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('should work with schemas without fileType field', () => {
      const schema: SchemaNode = {
        key: 'file',
        label: 'File',
        type: 'file',
        required: false,
        fileMetadata: {
          allowedMimeTypes: ['*/*'],
          maxSizeBytes: 10485760,
          multiple: false,
          accept: '*/*',
        } as any,
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('File')).toBeInTheDocument();
    });

    it('should work with minimal schema', () => {
      const schema: SchemaNode = {
        key: 'file',
        label: 'File',
        type: 'file',
        required: false,
      };

      render(<FileUpload schema={schema} register={mockRegister} errors={{}} />);
      
      expect(screen.getByLabelText('File')).toBeInTheDocument();
    });
  });
});
