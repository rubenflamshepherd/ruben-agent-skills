#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.argv[2] || '.');
const ignored = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage', '.venv', 'venv', '__pycache__']);
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.html', '.htm', '.jinja', '.jinja2', '.py', '.json', '.toml', '.txt', '.md']);

function filesUnder(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(full));
    else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase()) && fs.statSync(full).size <= 2_000_000) files.push(full);
  }
  return files;
}

function relative(file) { return path.relative(root, file) || '.'; }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function read(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function matchesAny(content, patterns) { return patterns.some((pattern) => pattern.test(content)); }

const files = filesUnder(root);
const packageJson = exists('package.json') ? JSON.parse(read(path.join(root, 'package.json'))) : null;
const dependencies = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
const next = Boolean(dependencies.next || exists('next.config.js') || exists('next.config.mjs') || exists('next.config.ts'));
const appLayouts = files.filter((file) => /(^|\/)app\/layout\.(js|jsx|ts|tsx)$/.test(relative(file)));
const pagesRouter = files.some((file) => /(^|\/)pages\/(_app|_document|index)\.(js|jsx|ts|tsx)$/.test(relative(file)));
const vite = Boolean(dependencies.vite || files.some((file) => /(^|\/)vite\.config\.(js|mjs|ts)$/.test(relative(file))));
const pythonFiles = files.filter((file) => path.extname(file) === '.py');
const flask = pythonFiles.some((file) => /(?:from\s+flask\s+import|import\s+flask)/.test(read(file))) || /\bFlask\b/i.test(read(path.join(root, 'requirements.txt'))) || /\bflask\b/i.test(read(path.join(root, 'pyproject.toml')));
const templateFiles = files.filter((file) => relative(file).split(path.sep).includes('templates') && ['.html', '.htm', '.jinja', '.jinja2'].includes(path.extname(file).toLowerCase()));
const extendsTemplate = /\{%\s*extends\s+["']([^"']+)["']\s*%\}/;
const templateGraph = templateFiles.map((file) => ({ file: relative(file), extends: read(file).match(extendsTemplate)?.[1] ?? null }));
const extendedNames = new Set(templateGraph.map((item) => item.extends).filter(Boolean));
const baseTemplates = templateGraph.filter(({ file }) => extendedNames.has(path.basename(file)) || extendedNames.has(file.replace(/^templates\//, ''))).map(({ file }) => file);
const htmlEntries = files.filter((file) => ['.html', '.htm'].includes(path.extname(file).toLowerCase()) && !relative(file).split(path.sep).includes('templates')).map(relative);

const analyticsPatterns = [
  /googletagmanager\.com\/gtag\/js/i,
  /\bgtag\s*\(/,
  /@next\/third-parties\/google/,
  /<GoogleAnalytics\b/,
  /\bG-[A-Z0-9]{6,}\b/,
];
const cspPatterns = [
  /Content-Security-Policy/i,
  /contentSecurityPolicy/,
  /\b(?:default-src|script-src|connect-src)\s+['"]/,
];
const analyticsFindings = files.filter((file) => matchesAny(read(file), analyticsPatterns)).map(relative);
const cspFindings = files.filter((file) => matchesAny(read(file), cspPatterns)).map(relative);

const canonicalCandidates = [];
for (const file of files) {
  const content = read(file);
  for (const match of content.matchAll(/https:\/\/[a-z0-9.-]+(?::\d+)?/gi)) {
    const value = match[0];
    if (!/google|github|npmjs|schema\.org|w3\.org|localhost/i.test(value)) canonicalCandidates.push({ value, source: relative(file) });
  }
}
const uniqueCandidates = [...new Map(canonicalCandidates.map((item) => [item.value, item])).values()].slice(0, 20);

const locks = [
  ['npm', 'package-lock.json'],
  ['pnpm', 'pnpm-lock.yaml'],
  ['yarn', 'yarn.lock'],
  ['bun', 'bun.lock'],
  ['bun', 'bun.lockb'],
].filter(([, file]) => exists(file));
const lockManagers = [...new Set(locks.map(([manager]) => manager))];

let git = { repository: false, clean: null, branch: null };
try {
  const invoke = (args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  git = { repository: true, clean: invoke(['status', '--porcelain']) === '', branch: invoke(['branch', '--show-current']) };
} catch {}

const activeTargets = [
  ...(next && appLayouts.length ? ['next-app-router'] : []),
  ...(next && pagesRouter ? ['next-pages-router'] : []),
  ...(vite && !next ? ['vite-vanilla'] : []),
  ...(flask ? ['flask-jinja'] : []),
  ...(!next && !vite && !flask && htmlEntries.length ? ['static-html'] : []),
];

const blockers = [];
if (activeTargets.length === 0) blockers.push('unsupported-or-undetected-project');
if (activeTargets.includes('next-app-router') && activeTargets.includes('next-pages-router')) blockers.push('both-next-router-architectures-active');
if (lockManagers.length > 1) blockers.push('conflicting-package-manager-lockfiles');
if (analyticsFindings.length) blockers.push('existing-google-analytics-detected');
if (cspFindings.length) blockers.push('content-security-policy-requires-review');

console.log(JSON.stringify({
  root,
  git,
  targets: activeTargets,
  packageManager: lockManagers.length === 1 ? lockManagers[0] : null,
  lockfiles: locks.map(([, file]) => file),
  next: next ? { appLayouts: appLayouts.map(relative), pagesRouter } : null,
  flask: flask ? { templates: templateGraph, sharedBaseCandidates: baseTemplates } : null,
  htmlEntries: next || flask ? [] : htmlEntries,
  analyticsFindings,
  cspFindings,
  canonicalUrlCandidates: uniqueCandidates,
  blockers,
}, null, 2));

if (blockers.length) process.exitCode = 2;
