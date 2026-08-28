import fs from 'node:fs';
import path from 'node:path';

const MAX_STATIC_BYTES = 5 * 1024 * 1024;

export type StaticAssetResult =
  | { readonly kind: 'FOUND'; readonly body: Buffer; readonly contentType: string }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'REJECTED' }
  | { readonly kind: 'UNAVAILABLE' };

const CONTENT_TYPES: Readonly<Record<string, string>> = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
});

function inside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function readConfinedFile(root: string, candidate: string): StaticAssetResult {
  const noFollow = fs.constants.O_NOFOLLOW;
  if (noFollow === undefined) return { kind: 'REJECTED' };
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(candidate, fs.constants.O_RDONLY | noFollow);
    const before = fs.fstatSync(descriptor);
    if (!before.isFile() || before.size > MAX_STATIC_BYTES) return { kind: 'REJECTED' };
    // The descriptor, rather than the pathname, is the authority after open.
    // This closes the realpath/read TOCTOU window and also detects an
    // intermediate directory symlink that points outside the configured root.
    const openedPath = fs.realpathSync(`/proc/self/fd/${descriptor}`);
    if (!inside(root, openedPath)) return { kind: 'REJECTED' };
    const extension = path.extname(openedPath).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (contentType === undefined) return { kind: 'REJECTED' };
    const body = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs) return { kind: 'REJECTED' };
    return { kind: 'FOUND', body, contentType };
  } catch {
    return { kind: 'MISSING' };
  } finally {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* bounded read already classified */ }
    }
  }
}

/** Root-confined resolver for built UI assets only; it never serves arbitrary files. */
export class ControlCenterStaticAssets {
  private readonly root: string | null;

  constructor(uiRoot: string | undefined) {
    if (uiRoot === undefined) {
      this.root = null;
      return;
    }
    try {
      const realRoot = fs.realpathSync(uiRoot);
      this.root = fs.statSync(realRoot).isDirectory() ? realRoot : null;
    } catch {
      this.root = null;
    }
  }

  resolve(pathname: string): StaticAssetResult {
    if (this.root === null) return pathname === '/' ? { kind: 'UNAVAILABLE' } : { kind: 'MISSING' };
    if (/%(?:2f|5c|00)/i.test(pathname) || pathname.includes('\\') || pathname.includes('\u0000') || pathname.includes('..')) {
      return { kind: 'REJECTED' };
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return { kind: 'REJECTED' };
    }
    if (decoded.includes('..') || decoded.includes('\\') || decoded.includes('\u0000')) return { kind: 'REJECTED' };
    const relative = decoded === '/' ? 'index.html' : decoded.startsWith('/assets/') || decoded === '/favicon.ico' ? decoded.slice(1) : null;
    if (relative === null) return { kind: 'MISSING' };
    const candidate = path.resolve(this.root, relative);
    if (!inside(this.root, candidate)) return { kind: 'REJECTED' };
    let realCandidate: string;
    try {
      realCandidate = fs.realpathSync(candidate);
      const stat = fs.statSync(realCandidate);
      if (!stat.isFile() || stat.size > MAX_STATIC_BYTES || !inside(this.root, realCandidate)) return { kind: 'REJECTED' };
      return readConfinedFile(this.root, candidate);
    } catch {
      return { kind: 'MISSING' };
    }
  }
}
