import fs from 'fs';
import path from 'path';

export interface LatestRelease {
  version: string;
  date: string;
}

/**
 * Reads CHANGELOG.md from the repo root and returns the latest version + date.
 * Expects Keep a Changelog format: `## [x.y.z] - YYYY-MM-DD`
 * Runs at build time (zero runtime cost).
 */
export function getLatestRelease(): LatestRelease | null {
  try {
    // CHANGELOG.md lives at the monorepo root, two levels up from apps/docs
    const filePath = path.join(process.cwd(), '..', '..', 'CHANGELOG.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    const match = content.match(/^##\s+\[(\d+\.\d+\.\d+)\]\s+-\s+(\d{4}-\d{2}-\d{2})/m);
    if (!match) return null;

    return { version: match[1], date: match[2] };
  } catch {
    return null;
  }
}
