import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { OpenAPI3Adapter } from '../openapi3.js';

describe('esp32 simulator sensors IR', () => {
  it('includes Sensor fields for detail rendering', () => {
    const specPath = new URL(
      '../../../../../examples/apps/cpp/esp32-simulator/openapi.yaml',
      import.meta.url
    );
    const spec = load(readFileSync(specPath, 'utf8'));
    const app = new OpenAPI3Adapter(spec).adapt();
    const sensors = app.resources.find((resource) => resource.slug === 'sensors');
    const detailOp = sensors?.operations.find((operation) => operation.viewHint === 'detail');

    expect(sensors).toBeDefined();
    expect(detailOp?.path).toBe('/api/v1/sensors/{sensor_id}');

    const resourceFieldKeys = sensors?.schema.children?.map((field) => field.key) ?? [];
    const detailFieldKeys = detailOp?.responses['200']?.schema?.children?.map((field) => field.key) ?? [];

    expect(resourceFieldKeys.length).toBeGreaterThan(0);
    expect(resourceFieldKeys).toEqual(
      expect.arrayContaining(['id', 'name', 'type', 'unit', 'min_value', 'max_value'])
    );
    expect(detailFieldKeys.length).toBeGreaterThan(0);
  });
});
