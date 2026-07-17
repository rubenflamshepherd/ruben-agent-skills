import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  findExistingCandidates,
  normalizeUrl,
  parseArgs,
  projectState,
  readJson,
  validateConfig,
  validateState,
  writeJsonAtomic,
} from './lib.mjs';

test('normalizeUrl removes incidental URL differences', () => {
  assert.equal(normalizeUrl('HTTPS://Example.COM:443/path/?query=1#hash'), 'https://example.com/path');
  assert.equal(normalizeUrl('https://example.com/'), 'https://example.com');
  assert.throws(() => normalizeUrl('ftp://example.com'), /http or https/);
});

test('parseArgs supports flags and values', () => {
  assert.deepEqual(parseArgs(['apply', '--url', 'https://example.com', '--confirmed']), {
    command: 'apply',
    options: { url: 'https://example.com', confirmed: true },
  });
  assert.throws(() => parseArgs(['plan', 'surprise']), /Unexpected/);
});

test('config validation rejects malformed identity configuration', () => {
  const valid = {
    version: 1,
    quotaProject: 'scout-397801',
    serviceAccountEmail: 'analytics-automation@scout-397801.iam.gserviceaccount.com',
    analyticsAccount: 'accounts/123',
    timeZone: 'America/Toronto',
    currencyCode: 'CAD',
  };
  assert.equal(validateConfig(valid), valid);
  assert.throws(() => validateConfig({ ...valid, currencyCode: 'cad' }), /currency/);
  assert.throws(() => validateConfig({ ...valid, analyticsAccount: 'properties/123' }), /analyticsAccount/);
});

test('state validation and construction preserve public provisioning metadata', () => {
  const state = projectState({
    account: 'accounts/123',
    property: { name: 'properties/456' },
    stream: { name: 'properties/456/dataStreams/789', webStreamData: { measurementId: 'G-ABC123XYZ' } },
    propertyName: 'Example',
    canonicalUrl: 'https://Example.com/',
  });
  assert.equal(state.canonicalUrl, 'https://example.com');
  assert.equal(state.measurementId, 'G-ABC123XYZ');
  assert.equal(validateState(state), state);
});

test('candidate discovery catches exact names and normalized stream URLs', () => {
  const properties = [
    { name: 'properties/1', displayName: 'Example' },
    { name: 'properties/2', displayName: 'Other' },
  ];
  const streams = new Map([
    ['properties/1', []],
    ['properties/2', [{ name: 'properties/2/dataStreams/3', webStreamData: { defaultUri: 'https://example.com/' } }]],
  ]);
  assert.deepEqual(findExistingCandidates(properties, streams, 'Example', 'https://example.com'), [
    { property: 'properties/1', displayName: 'Example', reasons: ['property-name'], streams: [] },
    { property: 'properties/2', displayName: 'Other', reasons: ['canonical-url'], streams: ['properties/2/dataStreams/3'] },
  ]);
});

test('atomic JSON writes use the requested mode', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-state-'));
  const file = path.join(directory, 'state.json');
  writeJsonAtomic(file, { hello: 'world' }, 0o600);
  assert.deepEqual(readJson(file), { hello: 'world' });
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  fs.rmSync(directory, { recursive: true, force: true });
});

test('project inspector detects a Next App Router project and existing GA', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-inspect-'));
  fs.mkdirSync(path.join(directory, 'app'));
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ dependencies: { next: '16.0.0' } }));
  fs.writeFileSync(path.join(directory, 'package-lock.json'), '{}');
  fs.writeFileSync(path.join(directory, 'app', 'layout.tsx'), 'import { GoogleAnalytics } from "@next/third-parties/google";');
  const result = spawnSync(process.execPath, [path.join(import.meta.dirname, 'inspect-project.mjs'), directory], { encoding: 'utf8' });
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.targets, ['next-app-router']);
  assert.equal(report.packageManager, 'npm');
  assert.deepEqual(report.analyticsFindings, ['app/layout.tsx']);
  assert.equal(result.status, 2);
  fs.rmSync(directory, { recursive: true, force: true });
});
