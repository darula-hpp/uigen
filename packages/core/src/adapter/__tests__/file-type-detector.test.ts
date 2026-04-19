import { describe, it, expect } from 'vitest';
import { FileTypeDetector, FileTypeCategory } from '../file-type-detector';

describe('FileTypeDetector', () => {
  describe('detectFileType', () => {
    describe('image category', () => {
      it('should classify single image MIME type as image', () => {
        const result = FileTypeDetector.detectFileType(['image/png']);
        expect(result).toBe('image');
      });

      it('should classify multiple image MIME types as image', () => {
        const result = FileTypeDetector.detectFileType([
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/gif'
        ]);
        expect(result).toBe('image');
      });
    });

    describe('document category', () => {
      it('should classify PDF as document', () => {
        const result = FileTypeDetector.detectFileType(['application/pdf']);
        expect(result).toBe('document');
      });

      it('should classify Word document as document', () => {
        const result = FileTypeDetector.detectFileType(['application/msword']);
        expect(result).toBe('document');
      });

      it('should classify Office Open XML formats as document', () => {
        const result = FileTypeDetector.detectFileType([
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ]);
        expect(result).toBe('document');
      });

      it('should classify text files as document', () => {
        const result = FileTypeDetector.detectFileType(['text/plain', 'text/csv']);
        expect(result).toBe('document');
      });

      it('should classify Excel and PowerPoint as document', () => {
        const result = FileTypeDetector.detectFileType([
          'application/vnd.ms-excel',
          'application/vnd.ms-powerpoint'
        ]);
        expect(result).toBe('document');
      });
    });

    describe('video category', () => {
      it('should classify single video MIME type as video', () => {
        const result = FileTypeDetector.detectFileType(['video/mp4']);
        expect(result).toBe('video');
      });

      it('should classify multiple video MIME types as video', () => {
        const result = FileTypeDetector.detectFileType([
          'video/mp4',
          'video/mpeg',
          'video/quicktime'
        ]);
        expect(result).toBe('video');
      });
    });

    describe('audio category', () => {
      it('should classify single audio MIME type as audio', () => {
        const result = FileTypeDetector.detectFileType(['audio/mpeg']);
        expect(result).toBe('audio');
      });

      it('should classify multiple audio MIME types as audio', () => {
        const result = FileTypeDetector.detectFileType([
          'audio/mpeg',
          'audio/wav',
          'audio/ogg'
        ]);
        expect(result).toBe('audio');
      });
    });

    describe('mixed categories', () => {
      it('should classify mixed image and document as generic', () => {
        const result = FileTypeDetector.detectFileType([
          'image/png',
          'application/pdf'
        ]);
        expect(result).toBe('generic');
      });

      it('should classify mixed image, video, and audio as generic', () => {
        const result = FileTypeDetector.detectFileType([
          'image/png',
          'video/mp4',
          'audio/mpeg'
        ]);
        expect(result).toBe('generic');
      });

      it('should classify mixed document and video as generic', () => {
        const result = FileTypeDetector.detectFileType([
          'application/pdf',
          'video/mp4'
        ]);
        expect(result).toBe('generic');
      });
    });

    describe('edge cases', () => {
      it('should classify empty array as generic', () => {
        const result = FileTypeDetector.detectFileType([]);
        expect(result).toBe('generic');
      });

      it('should classify wildcard as generic', () => {
        const result = FileTypeDetector.detectFileType(['*/*']);
        expect(result).toBe('generic');
      });

      it('should classify wildcard with other types as generic', () => {
        const result = FileTypeDetector.detectFileType(['*/*', 'image/png']);
        expect(result).toBe('generic');
      });

      it('should classify unknown MIME type as generic', () => {
        const result = FileTypeDetector.detectFileType(['application/unknown']);
        expect(result).toBe('generic');
      });

      it('should classify invalid format as generic', () => {
        const result = FileTypeDetector.detectFileType(['invalid']);
        expect(result).toBe('generic');
      });
    });

    describe('document MIME type recognition', () => {
      it('should recognize all standard document MIME types', () => {
        const documentTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.ms-excel',
          'application/vnd.ms-powerpoint',
          'text/plain',
          'text/csv'
        ];

        for (const mimeType of documentTypes) {
          const result = FileTypeDetector.detectFileType([mimeType]);
          expect(result).toBe('document');
        }
      });

      it('should recognize Office Open XML document formats', () => {
        const result = FileTypeDetector.detectFileType([
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]);
        expect(result).toBe('document');
      });
    });
  });
});
