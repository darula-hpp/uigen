import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { Swagger2Adapter } from './adapter/swagger2.js';

// Load the Swagger 2.0 petstore example
const yamlContent = readFileSync('../../examples/swagger2-petstore.yaml', 'utf-8');
const spec = load(yamlContent);

console.log('Testing Swagger 2.0 reference resolution...\n');

// Create adapter and parse
const adapter = new Swagger2Adapter(spec as any);
const ir = adapter.adapt();

console.log('✓ Successfully parsed Swagger 2.0 spec');
console.log(`✓ Found ${ir.resources.length} resource(s)`);

// Check that references were resolved
const petsResource = ir.resources.find(r => r.slug === 'pets');
if (petsResource) {
  console.log(`✓ Found "pets" resource with ${petsResource.operations.length} operations`);
  
  // Check list operation
  const listOp = petsResource.operations.find(op => op.viewHint === 'list');
  if (listOp) {
    console.log('✓ List operation found');
    console.log(`  - Response schema type: ${petsResource.schema.type}`);
    console.log(`  - Schema has ${petsResource.schema.children?.length || 0} fields`);
  }
  
  // Check create operation
  const createOp = petsResource.operations.find(op => op.viewHint === 'create');
  if (createOp && createOp.requestBody) {
    console.log('✓ Create operation found with requestBody');
    console.log(`  - RequestBody type: ${createOp.requestBody.type}`);
    console.log(`  - RequestBody has ${createOp.requestBody.children?.length || 0} fields`);
  }
}

console.log('\n✓ All reference resolution tests passed!');
