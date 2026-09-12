import type { ReactNode } from 'react';
import type { VIEW_DEFINITIONS } from '../types';
import { Icon, StatusPill } from '../shared';

/** Placeholder for a declared view whose snapshot is not connected. */

export function PlaceholderView({ view }: { readonly view: (typeof VIEW_DEFINITIONS)[number] }): ReactNode {
  return (
    <div className="empty-view">
      <div className="empty-mark"><Icon name={view.id} /></div>
      <p className="eyebrow">{view.eyebrow}</p>
      <h1>{view.label}</h1>
      <p>{view.description}</p>
      <div className="empty-status"><StatusPill value="NOT_REPORTED" label="Snapshot not connected" /><span>This read-only surface will show only bounded, sanitized local data.</span></div>
    </div>
  );
}

