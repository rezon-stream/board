import type { ChannelStatus } from './status';

/** Matches the Worker cache TTL: polling faster cannot change the answer. */
export const POLL_MS = 120_000;

export const fetchStatuses = async (): Promise<ChannelStatus[]> => {
  const response = await fetch('/api/live');
  if (!response.ok) throw new Error(`/api/live ответил ${response.status}`);
  return response.json() as Promise<ChannelStatus[]>;
};
