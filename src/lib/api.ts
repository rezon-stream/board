import type { ChannelStatus } from './status';

/** Matches the Worker cache TTL: polling faster cannot change the answer. */
export const POLL_MS = 120_000;

/** `fresh` is a channel key whose cached status the Worker must drop before answering. */
export const fetchStatuses = async (fresh?: string): Promise<ChannelStatus[]> => {
  const response = await fetch(fresh === undefined ? '/api/live' : `/api/live?fresh=${fresh}`);
  if (!response.ok) throw new Error(`/api/live ответил ${response.status}`);
  return response.json() as Promise<ChannelStatus[]>;
};
