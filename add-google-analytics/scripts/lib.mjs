import fs from "node:fs";
import path from "node:path";

export const CONFIG_VERSION = 1;
export const STATE_VERSION = 1;

export function normalizeUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`URL must use http or https: ${value}`);
  }
  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  return url.toString().replace(/\/$/, '');
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith('--')) throw new Error(`Unexpected argument: ${item}`);
    const key = item.slice(2);
    if (!key) throw new Error('Empty option name');
    if (rest[index + 1] && !rest[index + 1].startsWith('--')) {
      options[key] = rest[index + 1];
      index += 1;
    } else {
      options[key] = true;
    }
  }
  return { command, options };
}

export function assertResource(value, prefix, label) {
  if (typeof value !== 'string' || !new RegExp(`^${prefix}/[0-9]+$`).test(value)) {
    throw new Error(`${label} must look like ${prefix}/123456`);
  }
  return value;
}

export function validateConfig(config) {
  if (!config || config.version !== CONFIG_VERSION) throw new Error(`Unsupported config version; expected ${CONFIG_VERSION}`);
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.quotaProject ?? '')) throw new Error('Invalid quotaProject');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$/.test(config.serviceAccountEmail ?? '')) throw new Error('Invalid serviceAccountEmail');
  if (config.analyticsAccount) assertResource(config.analyticsAccount, 'accounts', 'analyticsAccount');
  if (typeof config.timeZone !== 'string' || !config.timeZone.includes('/')) throw new Error('Invalid IANA timeZone');
  if (!/^[A-Z]{3}$/.test(config.currencyCode ?? '')) throw new Error('Invalid ISO 4217 currencyCode');
  return config;
}

export function validateState(state) {
  if (!state || state.version !== STATE_VERSION) throw new Error(`Unsupported .ga4.json version; expected ${STATE_VERSION}`);
  assertResource(state.account, 'accounts', 'account');
  assertResource(state.property, 'properties', 'property');
  if (typeof state.dataStream !== 'string' || !/^properties\/[0-9]+\/dataStreams\/[0-9]+$/.test(state.dataStream)) throw new Error('Invalid dataStream');
  if (!/^G-[A-Z0-9]+$/.test(state.measurementId ?? '')) throw new Error('Invalid measurementId');
  state.canonicalUrl = normalizeUrl(state.canonicalUrl);
  if (typeof state.propertyName !== 'string' || !state.propertyName.trim()) throw new Error('Invalid propertyName');
  if (state.integration !== undefined) {
    const integration = state.integration;
    if (!integration || typeof integration !== 'object') throw new Error('Invalid integration metadata');
    if (typeof integration.adapter !== 'string' || !integration.adapter) throw new Error('Invalid integration adapter');
    if (typeof integration.target !== 'string' || !integration.target) throw new Error('Invalid integration target');
    if (!Array.isArray(integration.excludedPaths) || integration.excludedPaths.some((value) => typeof value !== 'string' || !value)) {
      throw new Error('Invalid integration excludedPaths');
    }
    if (integration.excludedPaths.length && integration.cspBoundaryReviewed !== true) {
      throw new Error('CSP exclusions require cspBoundaryReviewed');
    }
  }
  return state;
}

export async function retry(operation, {
  attempts = 6,
  baseDelayMs = 5_000,
  maxDelayMs = 30_000,
  shouldRetry = () => true,
  sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
  onRetry = () => {},
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      onRetry(error, { attempt, nextAttempt: attempt + 1, delay });
      await sleep(delay);
    }
  }
  throw lastError;
}

export function findExistingCandidates(properties, streamsByProperty, propertyName, canonicalUrl) {
  const normalizedUrl = normalizeUrl(canonicalUrl);
  const matches = [];
  for (const property of properties) {
    const streams = streamsByProperty.get(property.name) ?? [];
    const urlStreams = streams.filter((stream) => {
      const value = stream.webStreamData?.defaultUri;
      if (!value) return false;
      try { return normalizeUrl(value) === normalizedUrl; } catch { return false; }
    });
    if (property.displayName === propertyName || urlStreams.length) {
      matches.push({
        property: property.name,
        displayName: property.displayName,
        reasons: [
          ...(property.displayName === propertyName ? ['property-name'] : []),
          ...(urlStreams.length ? ['canonical-url'] : []),
        ],
        streams: urlStreams.map((stream) => stream.name),
      });
    }
  }
  return matches;
}

export function readJson(file, { optional = false } = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (optional && error.code === 'ENOENT') return null;
    throw new Error(`Cannot read ${file}: ${error.message}`);
  }
}

export function writeJsonAtomic(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode });
  fs.chmodSync(temporary, mode);
  fs.renameSync(temporary, file);
  fs.chmodSync(file, mode);
}

export function projectState({ account, property, stream, propertyName, canonicalUrl }) {
  const measurementId = stream.webStreamData?.measurementId;
  if (!measurementId) throw new Error('Web stream response has no measurement ID');
  return validateState({
    version: STATE_VERSION,
    account,
    property: property.name,
    dataStream: stream.name,
    measurementId,
    canonicalUrl: normalizeUrl(canonicalUrl),
    propertyName,
    provisionedBy: 'add-google-analytics',
  });
}
