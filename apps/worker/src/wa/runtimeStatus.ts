// Read-only access without importing sockets, media handling, or the AI engine.
let reader: (channelId: string) => string | null = () => null;

export function registerChannelStatusReader(read: typeof reader) { reader = read; }
export function readChannelRuntimeStatus(channelId: string): string | null { return reader(channelId); }
