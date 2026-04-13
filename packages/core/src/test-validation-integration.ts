import { OpenAPI3Adapter } from './adapter/openapi3.js';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

// Load the petstore example
const petstorePath = path.join(process.cwd(), '../../examples/petstore.yaml');
const petstoreContent = fs.readFileSync(petstorePath, 'utf-8');
const petstoreSpec = yaml.load(petstoreContent) as any;

// Parse with adapter
const adapter = new OpenAPI3Adapter(petstoreSpec);
const result = adapter.adapt();

// Find the Pet resource
const petResource = result.resources.find(r => r.slug === 'pet');
if (!petResource) {
  console.error('Pet resource not found!');
  process.exit(1);
}

// Find the create operation
const createOp = petResource.operations.find(op => op.viewHint === 'create');
if (!createOp || !createOp.requestBody) {
  console.error('Create operation or request body not found!');
  process.exit(1);
}

// Check the name field validations
const nameField = createOp.requestBody.children?.find(c => c.key === 'name');
if (!nameField) {
  console.error('Name field not found!');
  process.exit(1);
}

console.log('Name field validations:', JSON.stringify(nameField.validations, null, 2));

// Verify validations
const minLengthRule = nameField.validations?.find(v => v.type === 'minLength');
const maxLengthRule = nameField.validations?.find(v => v.type === 'maxLength');

if (!minLengthRule || minLengthRule.value !== 1) {
  console.error('minLength validation not found or incorrect!');
  process.exit(1);
}

if (!maxLengthRule || maxLengthRule.value !== 100) {
  console.error('maxLength validation not found or incorrect!');
  process.exit(1);
}

if (!minLengthRule.message || !maxLengthRule.message) {
  console.error('Validation messages not found!');
  process.exit(1);
}

console.log('✓ Validation extraction working correctly!');
console.log('✓ minLength rule:', minLengthRule);
console.log('✓ maxLength rule:', maxLengthRule);
