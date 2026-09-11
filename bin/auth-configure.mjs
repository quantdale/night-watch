#!/usr/bin/env node
/**
 * One-time hidden configuration for the designated DEV test account.
 *
 * The credential is read from the terminal with echo disabled and passed only
 * to the narrow auth provider. It is never accepted as an argument, inherited
 * environment value, or printed diagnostic.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function usage() {
  console.log('Usage: npm run auth:configure');
  console.log('Configures the designated DEV test account using hidden terminal prompts.');
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('interactive terminal required');
  }
  process.stdout.write(prompt);
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('cancelled'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };
    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }
  if (args.length > 0) throw new Error('auth:configure accepts no credential or account arguments');

  const provider = loadTypeScriptModule('src/auth/devCredentialProvider.ts');
  console.log('target-environment=dev');
  console.log(`provider=${provider.DEV_CREDENTIAL_PROVIDER_TYPE}`);
  console.log(`account-alias=${provider.DEV_CREDENTIAL_ACCOUNT_ALIAS}`);
  console.log('Enter the designated DEV account values. Input is hidden and values are never echoed or logged.');

  let username = '';
  let password = '';
  try {
    username = await readHidden('Username: ');
    password = await readHidden('Password: ');
    const result = provider.configureDevCredential(username, password);
    console.log(`configured=${result.configured}`);
    console.log(`provider=${result.providerType}`);
    console.log(`environment=${result.environment}`);
    console.log(`account-alias=${result.accountAlias}`);
    console.log(`storage-permissions-valid=${result.storagePermissionsValid}`);
  } finally {
    // Drop the only named references held by the CLI as soon as configuration
    // returns. The provider never exposes the stored record in its result.
    username = '';
    password = '';
  }
}

main().catch(() => {
  // Never print provider errors: a malformed file or implementation error must
  // not turn into a secret-bearing diagnostic.
  console.error('auth:configure failed; no credential values were printed');
  process.exitCode = 2;
});
