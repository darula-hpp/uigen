import { readFileSync } from 'fs';
import { parseSpec } from './adapter/index.js';

async function testSwagger2() {
  console.log('Testing Swagger 2.0 adapter...\n');
  
  try {
    const content = readFileSync('examples/swagger2-petstore.yaml', 'utf-8');
    const ir = await parseSpec(content);
    
    console.log('✓ Successfully parsed Swagger 2.0 spec');
    console.log('\nMeta:', JSON.stringify(ir.meta, null, 2));
    console.log('\nServers:', JSON.stringify(ir.servers, null, 2));
    console.log('\nAuth schemes:', JSON.stringify(ir.auth.schemes, null, 2));
    console.log('\nResources:', ir.resources.map(r => ({
      name: r.name,
      slug: r.slug,
      operations: r.operations.map(op => `${op.method} ${op.path} (${op.viewHint})`)
    })));
    
    console.log('\n✓ All checks passed!');
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

testSwagger2();
