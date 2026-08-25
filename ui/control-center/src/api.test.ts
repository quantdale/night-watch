import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeToControlCenterEvents } from './api';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  private readonly listeners = new Map<string, EventListener[]>();
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener));
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener(new Event(type));
  }

  close(): void {
    this.closed = true;
  }
}

describe('Control Center advisory event client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeEventSource.instances = [];
  });

  it('only invalidates authoritative GET state and closes cleanly', () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const invalidate = vi.fn();
    const close = subscribeToControlCenterEvents(invalidate);
    const source = FakeEventSource.instances[0]!;
    expect(source.url).toBe('/api/v1/events');
    source.emit('run.updated');
    expect(invalidate).toHaveBeenCalledTimes(1);
    close();
    expect(source.closed).toBe(true);
    source.emit('run.completed');
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
