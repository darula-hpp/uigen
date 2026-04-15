import { buildSearchIndex } from './search-index';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('[build-search-index] Building search index...');
  const entries = await buildSearchIndex();
  const outputPath = join(process.cwd(), 'public', 'search-index.json');
  mkdirSync(join(process.cwd(), 'public'), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`[build-search-index] Written ${entries.length} entries to ${outputPath}`);
}

main().catch(err => {
  console.error('[build-search-index] Error:', err);
  process.exit(1);
});
