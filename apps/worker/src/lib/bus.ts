import { EventEmitter } from "node:events";

export type BusEvent =
  | { type: "channel"; workspaceId: string; channelId: string; status: string; qr?: string | null; phoneNumber?: string | null; error?: string | null }
  | { type: "message"; workspaceId: string; conversationId: string }
  | { type: "conversation"; workspaceId: string; conversationId: string };

class Bus extends EventEmitter {
  publish(event: BusEvent) {
    this.emit("event", event);
    this.emit(`ws:${event.workspaceId}`, event);
  }

  subscribe(workspaceId: string, handler: (e: BusEvent) => void): () => void {
    this.on(`ws:${workspaceId}`, handler);
    return () => this.off(`ws:${workspaceId}`, handler);
  }
}

export const bus = new Bus();
bus.setMaxListeners(0);
