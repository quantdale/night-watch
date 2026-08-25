import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = join(packageRoot, 'dist');
const forbiddenExternalPattern = /(?:https?:|wss?:|ftp:)\/\//i;
const generatedNamespaceReferences = [
  /https:\/\/react\.dev\/errors\//g,
  /http:\/\/www\.w3\.org\/(?:2000\/svg|1998\/Math\/MathML|XML\/1998\/namespace|1999\/xlink)/g,
];

function hasForbiddenExternalReference(content) {
  let normalized = content;
  for (const allowedReference of generatedNamespaceReferences) normalized = normalized.replace(allowedReference, '');
  return forbiddenExternalPattern.test(normalized);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else files.push(path);
  }
  return files;
}

const distStats = await stat(distRoot).catch(() => null);
if (distStats === null || !distStats.isDirectory()) throw new Error('CONTROL_CENTER_UI_BUILD_MISSING');

const files = await collectFiles(distRoot);
if (!files.some((file) => file.endsWith('index.html'))) throw new Error('CONTROL_CENTER_UI_INDEX_MISSING');

for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (hasForbiddenExternalReference(content)) throw new Error('CONTROL_CENTER_UI_EXTERNAL_REFERENCE');
  if (/<(?:img|iframe|object|embed)\b/i.test(content)) throw new Error('CONTROL_CENTER_UI_UNAPPROVED_EMBED');
}

process.stdout.write(`[control-center-ui] PASS: ${files.length} built files, no external references or embedded content\n`);
