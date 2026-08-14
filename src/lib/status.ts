/**
 * Outcome of probing one channel. `degraded` means the page head carried no usable
 * canonical link, i.e. our assumption about YouTube's render broke — not that the
 * camera is switched off.
 */
export type Probe =
  | { state: 'live'; videoId: string }
  | { state: 'offline' }
  | { state: 'missing' }
  | { state: 'degraded' };

export type ChannelStatus = Probe & { id: string };
