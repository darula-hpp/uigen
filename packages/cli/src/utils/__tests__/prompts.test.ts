import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';
import { promptForOptions } from '../prompts.js';

// Mock readline
const mockQuestion = vi.fn();
const mockClose = vi.fn();

vi.mock('readline/promises', () => ({
  createInterface: vi.fn(() => ({
    question: mockQuestion,
    close: mockClose,
  })),
}));

describe('promptForOptions', () => {
  const testDir = resolve(__dirname, '../../../test-prompts');

  beforeEach(() => {
    // Create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Clear mocks
    mockQuestion.mockClear();
    mockClose.mockClear();

    // Mock process.cwd to return test directory
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('should use provided project name', async () => {
    mockQuestion
      .mockResolvedValueOnce('y') // has spec
      .mockResolvedValueOnce('openapi.yaml') // spec path
      .mockResolvedValueOnce('y') // auto-annotate
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('y'); // confirm

    // Create spec file
    writeFileSync(resolve(testDir, 'openapi.yaml'), 'openapi: 3.0.0', 'utf-8');

    const result = await promptForOptions('my-project', {});

    expect(result.name).toBe('my-project');
    expect(result.dir).toBe('my-project');
  });

  it('should use default project name when not provided', async () => {
    mockQuestion
      .mockResolvedValueOnce('') // project name (empty = default)
      .mockResolvedValueOnce('n') // no spec
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('y'); // confirm

    const result = await promptForOptions(undefined, {});

    expect(result.name).toBe('my-uigen-project');
    expect(result.dir).toBe('my-uigen-project');
  });

  it('should handle spec file validation', async () => {
    mockQuestion
      .mockResolvedValueOnce('y') // has spec
      .mockResolvedValueOnce('openapi.yaml') // spec path
      .mockResolvedValueOnce('y') // auto-annotate
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('y'); // confirm

    // Create spec file
    writeFileSync(resolve(testDir, 'openapi.yaml'), 'openapi: 3.0.0', 'utf-8');

    const result = await promptForOptions('test-project', {});

    expect(result.spec).toBe('openapi.yaml');
    expect(result.autoAnnotate).toBe(true);
  });

  it('should handle missing spec file with continue', async () => {
    mockQuestion
      .mockResolvedValueOnce('y') // has spec
      .mockResolvedValueOnce('missing.yaml') // spec path (doesn't exist)
      .mockResolvedValueOnce('y') // continue without spec
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('y'); // confirm

    const result = await promptForOptions('test-project', {});

    expect(result.spec).toBeUndefined();
    expect(result.autoAnnotate).toBe(false);
  });

  it('should exit when user cancels on missing spec', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    mockQuestion
      .mockResolvedValueOnce('y') // has spec
      .mockResolvedValueOnce('missing.yaml') // spec path (doesn't exist)
      .mockResolvedValueOnce('n'); // don't continue without spec

    await promptForOptions('test-project', {});

    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('should handle no spec scenario', async () => {
    mockQuestion
      .mockResolvedValueOnce('n') // no spec
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('y'); // confirm

    const result = await promptForOptions('test-project', {});

    expect(result.spec).toBeUndefined();
    expect(result.autoAnnotate).toBe(false);
  });

  it('should handle auto-annotate prompt', async () => {
    mockQuestion
      .mockResolvedValueOnce('y') // has spec
      .mockResolvedValueOnce('openapi.yaml') // spec path
      .mockResolvedValueOnce('n') // no auto-annotate
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('y'); // confirm

    // Create spec file
    writeFileSync(resolve(testDir, 'openapi.yaml'), 'openapi: 3.0.0', 'utf-8');

    const result = await promptForOptions('test-project', {});

    expect(result.spec).toBe('openapi.yaml');
    expect(result.autoAnnotate).toBe(false);
  });

  it('should handle git initialization prompt', async () => {
    mockQuestion
      .mockResolvedValueOnce('n') // no spec
      .mockResolvedValueOnce('n') // no git init
      .mockResolvedValueOnce('y'); // confirm

    const result = await promptForOptions('test-project', {});

    expect(result.git).toBe(false);
  });

  it('should exit when user cancels at confirmation', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    mockQuestion
      .mockResolvedValueOnce('n') // no spec
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('n'); // don't confirm

    await promptForOptions('test-project', {});

    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('should use custom directory from options', async () => {
    mockQuestion
      .mockResolvedValueOnce('n') // no spec
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('y'); // confirm

    const result = await promptForOptions('test-project', { dir: './custom-dir' });

    expect(result.name).toBe('test-project');
    expect(result.dir).toBe('./custom-dir');
  });

  it('should default to yes for all prompts when empty input', async () => {
    mockQuestion
      .mockResolvedValueOnce('') // has spec (default yes)
      .mockResolvedValueOnce('') // spec path (default openapi.yaml)
      .mockResolvedValueOnce('') // auto-annotate (default yes)
      .mockResolvedValueOnce('') // git init (default yes)
      .mockResolvedValueOnce(''); // confirm (default yes)

    // Create spec file
    writeFileSync(resolve(testDir, 'openapi.yaml'), 'openapi: 3.0.0', 'utf-8');

    const result = await promptForOptions('test-project', {});

    expect(result.spec).toBe('openapi.yaml');
    expect(result.autoAnnotate).toBe(true);
    expect(result.git).toBe(true);
  });

  it('should close readline interface after completion', async () => {
    mockQuestion
      .mockResolvedValueOnce('n') // no spec
      .mockResolvedValueOnce('y') // git init
      .mockResolvedValueOnce('y'); // confirm

    await promptForOptions('test-project', {});

    expect(mockClose).toHaveBeenCalled();
  });

  it('should close readline interface even on error', async () => {
    mockQuestion.mockRejectedValueOnce(new Error('Test error'));

    try {
      await promptForOptions('test-project', {});
    } catch (error) {
      // Expected to throw
    }

    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle yes variations (y, yes, Y, YES)', async () => {
    mockQuestion
      .mockResolvedValueOnce('YES') // has spec
      .mockResolvedValueOnce('openapi.yaml') // spec path
      .mockResolvedValueOnce('Y') // auto-annotate
      .mockResolvedValueOnce('yes') // git init
      .mockResolvedValueOnce('y'); // confirm

    // Create spec file
    writeFileSync(resolve(testDir, 'openapi.yaml'), 'openapi: 3.0.0', 'utf-8');

    const result = await promptForOptions('test-project', {});

    expect(result.spec).toBe('openapi.yaml');
    expect(result.autoAnnotate).toBe(true);
    expect(result.git).toBe(true);
  });

  it('should handle no variations (n, no, N, NO)', async () => {
    mockQuestion
      .mockResolvedValueOnce('NO') // no spec
      .mockResolvedValueOnce('N') // no git init
      .mockResolvedValueOnce(''); // confirm (default yes)

    const result = await promptForOptions('test-project', {});

    expect(result.spec).toBeUndefined();
    expect(result.git).toBe(false);
  });
});
