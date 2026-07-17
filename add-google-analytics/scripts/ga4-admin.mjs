#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
  CONFIG_VERSION,
  assertResource,
  findExistingCandidates,
  normalizeUrl,
  parseArgs,
  projectState,
  readJson,
  validateConfig,
  validateState,
  writeJsonAtomic,
} from './lib.mjs';

const DEFAULT_CONFIG = path.join(os.homedir(), '.config', 'add-google-analytics', 'config.json');
const API_ROOT = 'https://analyticsadmin.googleapis.com';

function fail(message, code = 1) {
  console.error(`Error: ${message}`);
  process.exit(code);
}

function required(options, name) {
  const value = options[name];
  if (!value || value === true) throw new Error(`Missing --${name}`);
  return value;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function configPath(options) {
  return path.resolve(String(options.config || DEFAULT_CONFIG));
}

function statePath(options) {
  return path.resolve(String(options.state || '.ga4.json'));
}

function loadConfig(options, requireAccount = true) {
  const config = validateConfig(readJson(configPath(options)));
  if (requireAccount && !config.analyticsAccount) throw new Error(`No Analytics account configured. Run set-account first.`);
  return config;
}

function assertCleanWorktree(stateFile) {
  const root = run('git', ['rev-parse', '--show-toplevel']);
  const status = run('git', ['status', '--porcelain']);
  if (status) throw new Error('Apply requires a clean Git worktree. Plan and verify remain available.');
  const relative = path.relative(root, stateFile);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('The state file must be inside the current Git repository.');
}

async function jsonRequest(url, { token, quotaProject, method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': quotaProject,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
  if (!response.ok) {
    const message = payload?.error?.message || text || response.statusText;
    throw new Error(`${method} ${new URL(url).pathname} failed (${response.status}): ${message}`);
  }
  return payload;
}

async function analyticsToken(config) {
  const sourceToken = run('gcloud', ['auth', 'print-access-token']);
  const endpoint = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(config.serviceAccountEmail)}:generateAccessToken`;
  const result = await jsonRequest(endpoint, {
    token: sourceToken,
    quotaProject: config.quotaProject,
    method: 'POST',
    body: {
      scope: ['https://www.googleapis.com/auth/analytics.edit'],
      lifetime: '3600s',
    },
  });
  if (!result.accessToken) throw new Error('IAM Credentials API returned no access token');
  return result.accessToken;
}

class AnalyticsAdmin {
  constructor(config, token) {
    this.config = config;
    this.token = token;
  }

  request(version, resource, options = {}) {
    const query = options.query ? `?${new URLSearchParams(options.query)}` : '';
    return jsonRequest(`${API_ROOT}/${version}/${resource}${query}`, {
      token: this.token,
      quotaProject: this.config.quotaProject,
      method: options.method,
      body: options.body,
    });
  }

  async paged(version, resource, field, query = {}) {
    const values = [];
    let pageToken;
    do {
      const result = await this.request(version, resource, { query: { ...query, pageSize: '200', ...(pageToken ? { pageToken } : {}) } });
      values.push(...(result[field] ?? []));
      pageToken = result.nextPageToken;
    } while (pageToken);
    return values;
  }

  accountSummaries() {
    return this.paged('v1beta', 'accountSummaries', 'accountSummaries');
  }

  properties(account) {
    return this.paged('v1beta', 'properties', 'properties', { filter: `parent:${account}`, showDeleted: 'false' });
  }

  streams(property) {
    return this.paged('v1beta', `${property}/dataStreams`, 'dataStreams');
  }

  getProperty(name) { return this.request('v1beta', name); }
  getStream(name) { return this.request('v1beta', name); }

  createProperty(account, displayName, timeZone, currencyCode) {
    return this.request('v1beta', 'properties', {
      method: 'POST',
      body: { parent: account, displayName, timeZone, currencyCode, industryCategory: 'OTHER', propertyType: 'PROPERTY_TYPE_ORDINARY' },
    });
  }

  createStream(property, displayName, canonicalUrl) {
    return this.request('v1beta', `${property}/dataStreams`, {
      method: 'POST',
      body: { type: 'WEB_DATA_STREAM', displayName: `${displayName} production`, webStreamData: { defaultUri: canonicalUrl } },
    });
  }

  updateRetention(property) {
    return this.request('v1beta', `${property}/dataRetentionSettings`, {
      method: 'PATCH',
      query: { updateMask: 'eventDataRetention,userDataRetention,resetUserDataOnNewActivity' },
      body: { eventDataRetention: 'FOURTEEN_MONTHS', userDataRetention: 'FOURTEEN_MONTHS', resetUserDataOnNewActivity: true },
    });
  }

  getRetention(property) { return this.request('v1beta', `${property}/dataRetentionSettings`); }

  updateEnhancedMeasurement(stream) {
    const fields = ['streamEnabled', 'pageChangesEnabled', 'scrollsEnabled', 'outboundClicksEnabled', 'siteSearchEnabled', 'videoEngagementEnabled', 'fileDownloadsEnabled', 'formInteractionsEnabled'];
    return this.request('v1alpha', `${stream}/enhancedMeasurementSettings`, {
      method: 'PATCH',
      query: { updateMask: fields.join(',') },
      body: Object.fromEntries(fields.map((field) => [field, true])),
    });
  }

  getEnhancedMeasurement(stream) { return this.request('v1alpha', `${stream}/enhancedMeasurementSettings`); }

  disableGoogleSignals(property) {
    return this.request('v1alpha', `${property}/googleSignalsSettings`, {
      method: 'PATCH',
      query: { updateMask: 'state' },
      body: { state: 'GOOGLE_SIGNALS_DISABLED' },
    });
  }

  getGoogleSignals(property) { return this.request('v1alpha', `${property}/googleSignalsSettings`); }
}

async function client(options, requireAccount = true) {
  const config = loadConfig(options, requireAccount);
  return { config, admin: new AnalyticsAdmin(config, await analyticsToken(config)) };
}

async function bootstrap(options) {
  if (!options.confirmed) throw new Error('Bootstrap changes GCP IAM and services; rerun with --confirmed after reviewing the plan.');
  const quotaProject = required(options, 'quota-project');
  const serviceAccountName = String(options['service-account-name'] || 'analytics-automation');
  const timeZone = String(options['time-zone'] || 'America/Toronto');
  const currencyCode = String(options.currency || 'CAD').toUpperCase();
  const activeAccount = run('gcloud', ['config', 'get-value', 'account']);
  if (!activeAccount || activeAccount === '(unset)') throw new Error('No active gcloud account');
  run('gcloud', ['services', 'enable', 'analyticsadmin.googleapis.com', 'iamcredentials.googleapis.com', '--project', quotaProject, '--quiet']);
  const serviceAccountEmail = `${serviceAccountName}@${quotaProject}.iam.gserviceaccount.com`;
  try {
    run('gcloud', ['iam', 'service-accounts', 'describe', serviceAccountEmail, '--project', quotaProject]);
  } catch {
    run('gcloud', ['iam', 'service-accounts', 'create', serviceAccountName, '--display-name', 'Google Analytics automation', '--project', quotaProject, '--quiet']);
  }
  run('gcloud', ['iam', 'service-accounts', 'add-iam-policy-binding', serviceAccountEmail, '--member', `user:${activeAccount}`, '--role', 'roles/iam.serviceAccountTokenCreator', '--project', quotaProject, '--quiet']);
  const config = validateConfig({ version: CONFIG_VERSION, quotaProject, serviceAccountEmail, timeZone, currencyCode });
  writeJsonAtomic(configPath(options), config);
  console.log(JSON.stringify({ status: 'bootstrap-complete', config: configPath(options), serviceAccountEmail, next: 'Add this service account as Editor in Google Analytics Account Access Management, then run accounts.' }, null, 2));
}

async function listAccounts(options) {
  const { admin } = await client(options, false);
  const accounts = (await admin.accountSummaries()).map(({ account, displayName }) => ({ account, displayName }));
  console.log(JSON.stringify({ accounts }, null, 2));
}

function setAccount(options) {
  const file = configPath(options);
  const config = validateConfig(readJson(file));
  config.analyticsAccount = assertResource(required(options, 'account'), 'accounts', 'account');
  writeJsonAtomic(file, validateConfig(config));
  console.log(JSON.stringify({ status: 'configured', config: file, analyticsAccount: config.analyticsAccount }, null, 2));
}

async function discover(admin, account, propertyName, canonicalUrl) {
  const properties = await admin.properties(account);
  const streamsByProperty = new Map();
  for (const property of properties) streamsByProperty.set(property.name, await admin.streams(property.name));
  return { properties, streamsByProperty, candidates: findExistingCandidates(properties, streamsByProperty, propertyName, canonicalUrl) };
}

async function plan(options) {
  const { config, admin } = await client(options);
  const file = statePath(options);
  const existingState = readJson(file, { optional: true });
  if (existingState) {
    const state = validateState(existingState);
    const [property, stream] = await Promise.all([admin.getProperty(state.property), admin.getStream(state.dataStream)]);
    console.log(JSON.stringify({ action: 'reconcile', stateFile: file, state, live: { property: property.displayName, streamUrl: stream.webStreamData?.defaultUri } }, null, 2));
    return;
  }
  const propertyName = required(options, 'property-name');
  const canonicalUrl = normalizeUrl(required(options, 'url'));
  const discovery = await discover(admin, config.analyticsAccount, propertyName, canonicalUrl);
  console.log(JSON.stringify({
    action: discovery.candidates.length ? 'confirmation-required-to-adopt' : 'create',
    account: config.analyticsAccount,
    propertyName,
    canonicalUrl,
    timeZone: config.timeZone,
    currencyCode: config.currencyCode,
    retention: 'FOURTEEN_MONTHS',
    enhancedMeasurement: true,
    googleSignals: 'disabled',
    candidates: discovery.candidates,
    stateFile: file,
  }, null, 2));
}

async function configureSettings(admin, propertyName, streamName) {
  await admin.updateRetention(propertyName);
  await admin.updateEnhancedMeasurement(streamName);
  await admin.disableGoogleSignals(propertyName);
}

async function apply(options) {
  if (!options.confirmed) throw new Error('Apply requires --confirmed after the complete dry-run plan is approved.');
  const file = statePath(options);
  assertCleanWorktree(file);
  const { config, admin } = await client(options);
  const existingState = readJson(file, { optional: true });
  if (existingState) {
    const state = validateState(existingState);
    await configureSettings(admin, state.property, state.dataStream);
    console.log(JSON.stringify({ status: 'reconciled', state }, null, 2));
    return;
  }
  const propertyName = required(options, 'property-name');
  const canonicalUrl = normalizeUrl(required(options, 'url'));
  const discovery = await discover(admin, config.analyticsAccount, propertyName, canonicalUrl);
  let property;
  if (options['adopt-property']) {
    const adoptName = assertResource(String(options['adopt-property']), 'properties', 'adopt-property');
    property = discovery.properties.find(({ name }) => name === adoptName);
    if (!property) throw new Error(`Adopted property ${adoptName} is not an active property under ${config.analyticsAccount}`);
  } else {
    if (discovery.candidates.length) throw new Error('Possible existing Analytics resources found. Rerun plan and explicitly pass --adopt-property after confirmation.');
    property = await admin.createProperty(config.analyticsAccount, propertyName, config.timeZone, config.currencyCode);
  }
  const streams = discovery.streamsByProperty.get(property.name) ?? await admin.streams(property.name);
  const matchingStreams = streams.filter(({ webStreamData }) => {
    try { return normalizeUrl(webStreamData?.defaultUri) === canonicalUrl; } catch { return false; }
  });
  if (matchingStreams.length > 1) throw new Error(`Multiple streams match ${canonicalUrl}; refusing to guess.`);
  const stream = matchingStreams[0] ?? await admin.createStream(property.name, propertyName, canonicalUrl);
  const state = projectState({ account: config.analyticsAccount, property, stream, propertyName, canonicalUrl });
  writeJsonAtomic(file, state, 0o644);
  try {
    await configureSettings(admin, property.name, stream.name);
  } catch (error) {
    throw new Error(`${error.message}. Provisioning state was saved to ${file}; rerun apply to repair without creating duplicates.`);
  }
  console.log(JSON.stringify({ status: options['adopt-property'] ? 'adopted' : 'created', state }, null, 2));
}

async function verify(options) {
  const { config, admin } = await client(options);
  const state = validateState(readJson(statePath(options)));
  if (state.account !== config.analyticsAccount) throw new Error('State account differs from configured Analytics account');
  const [property, stream, retention, enhanced, signals] = await Promise.all([
    admin.getProperty(state.property),
    admin.getStream(state.dataStream),
    admin.getRetention(state.property),
    admin.getEnhancedMeasurement(state.dataStream),
    admin.getGoogleSignals(state.property),
  ]);
  const expectedEnhanced = ['streamEnabled', 'pageChangesEnabled', 'scrollsEnabled', 'outboundClicksEnabled', 'siteSearchEnabled', 'videoEngagementEnabled', 'fileDownloadsEnabled', 'formInteractionsEnabled'];
  const problems = [];
  if (property.displayName !== state.propertyName) problems.push('property display name drift');
  if (normalizeUrl(stream.webStreamData?.defaultUri) !== state.canonicalUrl) problems.push('stream URL drift');
  if (stream.webStreamData?.measurementId !== state.measurementId) problems.push('measurement ID drift');
  if (retention.eventDataRetention !== 'FOURTEEN_MONTHS' || retention.userDataRetention !== 'FOURTEEN_MONTHS' || retention.resetUserDataOnNewActivity !== true) problems.push('retention drift');
  for (const field of expectedEnhanced) if (enhanced[field] !== true) problems.push(`enhanced measurement ${field} is disabled`);
  if (signals.state !== 'GOOGLE_SIGNALS_DISABLED') problems.push('Google Signals is not disabled');
  console.log(JSON.stringify({ status: problems.length ? 'drifted' : 'verified', problems, state }, null, 2));
  if (problems.length) process.exitCode = 2;
}

function doctor(options) {
  const checks = {};
  for (const command of ['node', 'git', 'gcloud']) {
    try { checks[command] = run(command, ['--version']).split('\n')[0]; } catch { checks[command] = null; }
  }
  const file = configPath(options);
  let config = null;
  try { config = validateConfig(readJson(file)); } catch (error) { checks.configError = error.message; }
  checks.config = config ? file : null;
  console.log(JSON.stringify(checks, null, 2));
  if (Object.values(checks).some((value) => value === null)) process.exitCode = 2;
}

const usage = `Usage:
  ga4-admin.mjs doctor [--config FILE]
  ga4-admin.mjs bootstrap --quota-project PROJECT [--service-account-name NAME] [--time-zone ZONE] [--currency CODE] --confirmed
  ga4-admin.mjs accounts
  ga4-admin.mjs set-account --account accounts/123
  ga4-admin.mjs plan --property-name NAME --url URL [--state FILE]
  ga4-admin.mjs apply --property-name NAME --url URL [--adopt-property properties/123] --confirmed
  ga4-admin.mjs verify [--state FILE]
`;

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command || ['help', '--help', '-h'].includes(command)) {
    console.log(usage);
  } else if (command === 'doctor') doctor(options);
  else if (command === 'bootstrap') await bootstrap(options);
  else if (command === 'accounts') await listAccounts(options);
  else if (command === 'set-account') setAccount(options);
  else if (command === 'plan') await plan(options);
  else if (command === 'apply') await apply(options);
  else if (command === 'verify') await verify(options);
  else throw new Error(`Unknown command: ${command}\n${usage}`);
} catch (error) {
  fail(error.message);
}
