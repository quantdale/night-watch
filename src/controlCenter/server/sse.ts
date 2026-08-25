import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ControlCenterEventDto } from '../contracts/events';

const SSE_RETRY_MS = 2_000;

interface SseClient {
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
}

/** Bounded notification channel. GET snapshots remain the only state authority. */
export class ControlCenterSseHub {
  private readonly clients = new Set<SseClient>();
  private readonly maxClients: number;

  constructor(maxClients = 8) {
    this.maxClients = maxClients;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  subscribe(request: IncomingMessage, response: ServerResponse): boolean {
    if (this.clients.size >= this.maxClients) return false;
    const client: SseClient = { request, response };
    this.clients.add(client);
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
    });
    response.write(`: nightwatch-control-center\nretry: ${SSE_RETRY_MS}\n\n`);
    const remove = () => {
      this.clients.delete(client);
    };
    request.once('close', remove);
    response.once('close', remove);
    return true;
  }

  publish(event: ControlCenterEventDto): void {
    const frame = `event: ${event.type}\nid: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of [...this.clients]) {
      try {
        client.response.write(frame);
      } catch {
        this.clients.delete(client);
        client.response.destroy();
      }
    }
  }

  heartbeat(): void {
    for (const client of [...this.clients]) {
      try {
        client.response.write(': heartbeat\n\n');
      } catch {
        this.clients.delete(client);
        client.response.destroy();
      }
    }
  }

  close(): void {
    for (const client of [...this.clients]) {
      this.clients.delete(client);
      client.response.end();
    }
  }
}
