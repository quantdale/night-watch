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
      const extension = path.extname(realCandidate).toLowerCase();
      const contentType = CONTENT_TYPES[extension];
      if (contentType === undefined) return { kind: 'REJECTED' };
      return { kind: 'FOUND', body: fs.readFileSync(realCandidate), contentType };
    } catch {
      return { kind: 'MISSING' };
    }
  }
}
