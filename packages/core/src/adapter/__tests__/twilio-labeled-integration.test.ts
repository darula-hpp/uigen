/**
 * Integration test: x-uigen-label with the real Twilio Messaging spec.
 *
 * examples/twilio_messaging_v1_labeled.yaml has meaningful x-uigen-label
 * annotations on 282 schema properties (e.g. sid → "SID", friendly_name →
 * "Display Name", tcr_id → "TCR Brand ID").
 *
 * These tests verify:
 * 1. Specific fields carry the expected human-readable override label.
 * 2. The original spec uses humanize() for the same fields (proving the
 *    override is actually doing something).
 * 3. Fields without x-uigen-label still use humanize() in the labeled spec.
 * 4. x-uigen-label does not affect any other SchemaNode field.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as jsyaml from 'js-yaml';
import type { UIGenApp, SchemaNode } from '../../ir/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'examples'))) return currentDir;
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find workspace root');
}

function loadSpec(filename: string): UIGenApp {
  const root = findWorkspaceRoot(process.cwd());
  const content = fs.readFileSync(path.join(root, 'examples', filename), 'utf-8');
  const spec = jsyaml.load(content);
  return new OpenAPI3Adapter(spec).adapt();
}

function findField(node: SchemaNode, key: string): SchemaNode | undefined {
  if (node.key === key) return node;
  for (const child of node.children ?? []) {
    const found = findField(child, key);
    if (found) return found;
  }
  if (node.items) return findField(node.items, key);
  return undefined;
}

function findFieldInIR(ir: UIGenApp, key: string): SchemaNode | undefined {
  for (const resource of ir.resources) {
    const inSchema = findField(resource.schema, key);
    if (inSchema) return inSchema;
    for (const op of resource.operations) {
      if (op.requestBody) {
        const inBody = findField(op.requestBody, key);
        if (inBody) return inBody;
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let labeled: UIGenApp;
let original: UIGenApp;

beforeAll(() => {
  labeled = loadSpec('twilio_messaging_v1_labeled.yaml');
  original = loadSpec('twilio_messaging_v1.yaml');
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('x-uigen-label — Twilio Messaging spec integration', () => {

  it('labeled spec parses successfully and produces resources', () => {
    expect(labeled.resources.length).toBeGreaterThan(0);
    expect(labeled.meta.title).toBe('Twilio - Messaging');
  });

  it('original spec parses successfully and produces the same resource count', () => {
    expect(original.resources.length).toBe(labeled.resources.length);
  });

  // -------------------------------------------------------------------------
  // Spot-checks: labeled spec uses meaningful human-readable labels
  // -------------------------------------------------------------------------

  it.each([
    ['sid',                    'SID'],
    ['account_sid',            'Account SID'],
    ['service_sid',            'Service SID'],
    ['tcr_id',                 'TCR Brand ID'],
    ['friendly_name',          'Display Name'],
    ['campaign_id',            'TCR Campaign ID'],
    ['validity_period',        'Validity Period (seconds)'],
    ['mms_converter',          'MMS Converter'],
    ['mock',                   'Mock (Test Only)'],
    ['doing_business_as',      'Doing Business As (DBA)'],
    ['fallback_url',           'Fallback URL'],
    ['privacy_policy_url',     'Privacy Policy URL'],
    ['terms_and_conditions_url', 'Terms & Conditions URL'],
    ['skip_automatic_sec_vet', 'Skip Auto Secondary Vetting'],
    ['brand_score',            'Brand Score'],
    ['domain_sid',             'Domain SID'],
    ['certificate_sid',        'Certificate SID'],
    ['vetting_id',             'Vetting ID'],
    ['country_code',           'Country Code (ISO)'],
    ['phone_number',           'Phone Number (E.164)'],
    ['status_callback',        'Status Callback URL'],
    ['date_created',           'Created At'],
    ['date_updated',           'Updated At'],
    ['business_name',           'Business Name'],
  ])('%s → "%s"', (key, expectedLabel) => {
    const field = findFieldInIR(labeled, key);
    expect(field, `field "${key}" not found in IR`).toBeDefined();
    expect(field!.label).toBe(expectedLabel);
  });

  // -------------------------------------------------------------------------
  // Contrast: original spec uses humanize() for the same fields
  // -------------------------------------------------------------------------

  it.each([
    ['sid',           'Sid'],
    ['account_sid',   'Account Sid'],
    ['tcr_id',        'Tcr Id'],
    ['friendly_name', 'Friendly Name'],
    ['mms_converter', 'Mms Converter'],
    ['mock',          'Mock'],
    ['fallback_url',  'Fallback Url'],
    ['brand_score',   'Brand Score'],
    ['domain_sid',    'Domain Sid'],
    ['vetting_id',    'Vetting Id'],
    ['date_created',  'Date Created'],
  ])('original: %s → "%s" (humanize fallback)', (key, humanizedLabel) => {
    const field = findFieldInIR(original, key);
    expect(field, `field "${key}" not found in original IR`).toBeDefined();
    expect(field!.label).toBe(humanizedLabel);
  });

  // -------------------------------------------------------------------------
  // Overrides actually differ from the humanized fallback
  // -------------------------------------------------------------------------

  it.each([
    ['sid',           'SID',                    'Sid'],
    ['account_sid',   'Account SID',            'Account Sid'],
    ['tcr_id',        'TCR Brand ID',           'Tcr Id'],
    ['friendly_name', 'Display Name',           'Friendly Name'],
    ['mms_converter', 'MMS Converter',          'Mms Converter'],
    ['fallback_url',  'Fallback URL',           'Fallback Url'],
    ['date_created',  'Created At',             'Date Created'],
  ])('%s: labeled "%s" ≠ original "%s"', (key, labeledLabel, originalLabel) => {
    const labeledField = findFieldInIR(labeled, key);
    const originalField = findFieldInIR(original, key);
    expect(labeledField!.label).toBe(labeledLabel);
    expect(originalField!.label).toBe(originalLabel);
    expect(labeledField!.label).not.toBe(originalField!.label);
  });

  // -------------------------------------------------------------------------
  // Non-label fields are unaffected
  // -------------------------------------------------------------------------

  it('x-uigen-label does not change field type, key, or required', () => {
    const labeledSid = findFieldInIR(labeled, 'sid');
    const originalSid = findFieldInIR(original, 'sid');
    expect(labeledSid!.type).toBe(originalSid!.type);
    expect(labeledSid!.key).toBe(originalSid!.key);
    expect(labeledSid!.required).toBe(originalSid!.required);
  });

  it('x-uigen-label does not change validations', () => {
    const labeledField = findFieldInIR(labeled, 'account_sid');
    const originalField = findFieldInIR(original, 'account_sid');
    expect(labeledField!.validations).toEqual(originalField!.validations);
  });

  // -------------------------------------------------------------------------
  // Bulk comparison
  // -------------------------------------------------------------------------

  it('labeled spec has significantly more overridden labels than the original', () => {
    function humanize(str: string): string {
      return str
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    function countOverrides(ir: UIGenApp): number {
      let count = 0;
      function walk(node: SchemaNode) {
        if (node.label !== humanize(node.key)) count++;
        for (const child of node.children ?? []) walk(child);
        if (node.items) walk(node.items);
      }
      for (const resource of ir.resources) {
        walk(resource.schema);
        for (const op of resource.operations) {
          if (op.requestBody) walk(op.requestBody);
        }
      }
      return count;
    }

    const labeledOverrides = countOverrides(labeled);
    const originalOverrides = countOverrides(original);
    expect(labeledOverrides).toBeGreaterThan(originalOverrides + 50);
  });
});
