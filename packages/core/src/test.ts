import { readFileSync } from 'fs';
import { parseSpec } from './index.js';
import { resolve } from 'path';

const specPath = resolve(process.cwd(), 'examples/petstore.yaml');
const specContent = readFileSync(specPath, 'utf-8');
const ir = await parseSpec(specContent);

console.log('Parsed IR:');
console.log(JSON.stringify(ir, null, 2));
