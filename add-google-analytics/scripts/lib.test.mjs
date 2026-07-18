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
  retry,
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

test('state validation preserves reviewed CSP integration metadata', () => {
  const state = projectState({
    account: 'accounts/123',
    property: { name: 'properties/456' },
    stream: { name: 'properties/456/dataStreams/789', webStreamData: { measurementId: 'G-ABC123XYZ' } },
    propertyName: 'Example',
    canonicalUrl: 'https://Example.com/',
  });
  state.integration = {
    adapter: 'next-app-router',
    target: 'app/layout.tsx',
    excludedPaths: ['/pages-content/**'],
    cspBoundaryReviewed: true,
  };
  assert.equal(state.canonicalUrl, 'https://example.com');
  assert.equal(state.measurementId, 'G-ABC123XYZ');
  assert.equal(validateState(state), state);
  assert.throws(
    () => validateState({ ...state, integration: { ...state.integration, cspBoundaryReviewed: false } }),
    /CSP exclusions require/,
  );
});

test('retry uses bounded exponential delays only for approved errors', async () => {
  const delays = [];
  let calls = 0;
  const result = await retry(async () => {
    calls += 1;
    if (calls < 4) throw new Error('propagating');
    return 'ready';
  }, {
    attempts: 6,
    baseDelayMs: 5,
    maxDelayMs: 12,
    shouldRetry: (error) => error.message === 'propagating',
    sleep: async (delay) => delays.push(delay),
  });
  assert.equal(result, 'ready');
  assert.equal(calls, 4);
  assert.deepEqual(delays, [5, 10, 12]);

  await assert.rejects(
    retry(async () => { throw new Error('permanent'); }, { shouldRetry: () => false }),
    /permanent/,
  );
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

test('bootstrap grants both impersonation and quota-consumption roles', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-bootstrap-'));
  const binaryDirectory = path.join(directory, 'bin');
  const logFile = path.join(directory, 'gcloud.jsonl');
  const configFile = path.join(directory, 'config.json');
  fs.mkdirSync(binaryDirectory);
  const fakeGcloud = path.join(binaryDirectory, 'gcloud');
  fs.writeFileSync(fakeGcloud, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.GCLOUD_TEST_LOG, JSON.stringify(args) + '\\n');
if (args.join(' ') === 'config get-value account') console.log('owner@example.com');
`);
  fs.chmodSync(fakeGcloud, 0o755);
  const result = spawnSync(process.execPath, [
    path.join(import.meta.dirname, 'ga4-admin.mjs'),
    'bootstrap',
    '--quota-project', 'example-12345',
    '--config', configFile,
    '--confirmed',
  ], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binaryDirectory}:${process.env.PATH}`, GCLOUD_TEST_LOG: logFile },
  });
  assert.equal(result.status, 0, result.stderr);
  const commands = fs.readFileSync(logFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.ok(commands.some((args) => args.includes('roles/iam.serviceAccountTokenCreator') && args.includes('user:owner@example.com')));
  assert.ok(commands.some((args) => args.includes('roles/serviceusage.serviceUsageConsumer') && args.includes('serviceAccount:analytics-automation@example-12345.iam.gserviceaccount.com')));
  assert.equal(fs.statSync(configFile).mode & 0o777, 0o600);
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

test('project inspector separates global and route-scoped CSP findings', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-csp-'));
  fs.mkdirSync(path.join(directory, 'app'));
  fs.mkdirSync(path.join(directory, 'lib'));
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ dependencies: { next: '16.0.0' } }));
  fs.writeFileSync(path.join(directory, 'package-lock.json'), '{}');
  fs.writeFileSync(path.join(directory, 'app', 'layout.tsx'), 'export default function Layout({ children }) { return children; }');
  fs.writeFileSync(path.join(directory, 'lib', 'isolated-route.ts'), `export const csp = "default-src 'none'; connect-src 'none'";`);

  let result = spawnSync(process.execPath, [path.join(import.meta.dirname, 'inspect-project.mjs'), directory], { encoding: 'utf8' });
  let report = JSON.parse(result.stdout);
  assert.equal(result.status, 0);
  assert.deepEqual(report.csp.blockingFindings, []);
  assert.deepEqual(report.csp.scopedFindings, ['lib/isolated-route.ts']);
  assert.deepEqual(report.warnings, ['scoped-content-security-policy-requires-boundary-review']);

  fs.writeFileSync(path.join(directory, 'next.config.ts'), `export default { headers: "script-src 'self'" };`);
  result = spawnSync(process.execPath, [path.join(import.meta.dirname, 'inspect-project.mjs'), directory], { encoding: 'utf8' });
  report = JSON.parse(result.stdout);
  assert.equal(result.status, 2);
  assert.deepEqual(report.csp.blockingFindings, ['next.config.ts']);
  assert.ok(report.blockers.includes('content-security-policy-affects-integration-target'));
  fs.rmSync(directory, { recursive: true, force: true });
});
