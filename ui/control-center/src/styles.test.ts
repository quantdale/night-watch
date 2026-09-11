import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every class the shell renders must have a rule.
 *
 * C-15b added a graph toolbar — search, an evidence filter, zoom, pan — and a
 * dimmed/selected node treatment, and shipped all of it without a single CSS
 * rule. The markup was correct, the state was computed correctly, and on
 * screen nothing happened: unstyled browser controls on a dark panel, and a
 * filter that changed no pixel. Typecheck and the component tests were green
 * throughout, because neither one looks at the stylesheet.
 *
 * This is that missing check. It is deliberately mechanical: it reads the
 * class names the component file actually renders and asserts each one is
 * selected somewhere in the stylesheet.
 */
// The suite runs under jsdom, where `import.meta.url` is an http URL rather
// than a file one. Vitest roots the process at the UI package, so the sources
// are addressed from there.
const APP = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const STYLES = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

/**
 * Class names built by interpolation (`graph-node-${tone}`) leave a prefix
 * fragment behind. A fragment is not a class, so it is excluded here and the
 * concrete values it can take are asserted explicitly below instead — an
 * interpolated family must never be waved through as "dynamic".
 */
const INTERPOLATION_FRAGMENTS = new Set(['graph-node-', 'stage-', 'status-', 'text-', 'code-chip-']);

function renderedClassNames(): ReadonlySet<string> {
  const found = new Set<string>();
  const pattern = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g;
  for (const match of APP.matchAll(pattern)) {
    const literal = (match[1] ?? match[2] ?? match[3] ?? '').replace(/\$\{[^}]*\}/g, ' ');
    for (const token of literal.split(/\s+/)) {
      if (token.length > 0 && !INTERPOLATION_FRAGMENTS.has(token)) found.add(token);
    }
  }
  return found;
}

function selectedClassNames(): ReadonlySet<string> {
  return new Set(
    [...STYLES.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((match) => match[1] as string),
  );
}

describe('control center stylesheet coverage', () => {
  it('finds the class names the shell renders', () => {
    // A parser that silently matched nothing would make every assertion below
    // vacuous, so the extraction itself is measured first.
    const rendered = renderedClassNames();
    expect(rendered.size).toBeGreaterThan(100);
    expect(rendered.has('graph-controls')).toBe(true);
    expect(selectedClassNames().size).toBeGreaterThan(100);
  });

  it('defines a rule for every class the shell renders', () => {
    const selected = selectedClassNames();
    const unstyled = [...renderedClassNames()].filter((name) => !selected.has(name)).sort();
    expect(unstyled).toEqual([]);
  });

  it('defines every concrete class an interpolated family can produce', () => {
    const selected = selectedClassNames();
    // `graph-node-${statusTone(...)}` and `text-${statusTone(...)}`.
    const tones = ['ready', 'warning', 'blocked', 'neutral'];
    const missing = [
      // `graph-node-neutral` is intentionally absent: neutral IS the base
      // `.graph-node` stroke; the other three carry tone colours.
      ...tones.filter((tone) => tone !== 'neutral').map((tone) => `graph-node-${tone}`),
      // `code-chip-${tone}` on the run-detail panel.
      ...tones.map((tone) => `code-chip-${tone}`),
      // `text-neutral` is intentionally absent: neutral IS the inherited
      // colour, so a rule would only restate it. The other three are not.
      ...tones.filter((tone) => tone !== 'neutral').map((tone) => `text-${tone}`),
      'graph-node-dimmed',
      'graph-node-selected',
      'graph-edge-dimmed',
      // `status-${statusTone(...)}` on every StatusPill. `status-neutral` is
      // intentionally absent: neutral IS the base `.status-pill` treatment,
      // and a rule would only restate it.
      ...tones.filter((tone) => tone !== 'neutral').map((tone) => `status-${tone}`),
      // `stage-${statusTone(stage.state)}` on coverage chips. `stage-neutral`
      // is intentionally absent for the same reason against `.stage-chip`.
      ...tones.filter((tone) => tone !== 'neutral').map((tone) => `stage-${tone}`),
    ].filter((name) => !selected.has(name));
    expect(missing).toEqual([]);
  });
});
