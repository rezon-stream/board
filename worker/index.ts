import { CHANNELS } from '../src/lib/channels';
import type { ChannelStatus, Probe } from '../src/lib/status';

/** With this User-Agent the canonical link sits in the first ~250 bytes instead of byte ~685000. */
const USER_AGENT = 'Twitterbot/1.0';
const HEAD_BYTES = 8192;
const TTL_SECONDS = 60;

const parseHead = (head: string): Probe => {
  const canonical = head.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (canonical === undefined) return { state: 'degraded' };
  // YouTube renders the literal string "undefined" when the channel is not streaming.
  if (canonical === 'undefined') return { state: 'offline' };
  // A consent redirect or bot-check page moves canonical off youtube.com. That is a block,
  // and reporting it as offline would hide the outage behind an empty grid.
  if (!canonical.startsWith('https://www.youtube.com/')) return { state: 'degraded' };
  const videoId = canonical.match(/[?&]v=([\w-]{11})/)?.[1];
  return videoId === undefined ? { state: 'offline' } : { state: 'live', videoId };
};

/** Reads the beginning of the response and aborts: the full page weighs ~1.2 MB. */
const readHead = async (body: ReadableStream<Uint8Array>): Promise<string> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let head = '';
  while (head.length < HEAD_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    head += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  return head;
};

const probe = async (id: string): Promise<Probe> => {

  const response = await fetch(`https://www.youtube.com/${id}/live`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
  });
  if (response.status === 404) return { state: 'missing' };
  if (!response.ok || response.body === null) return { state: 'degraded' };
  return parseHead(await readHead(response.body));
};

/** The cache is per data center, so every colo goes through a cold fetch, not just the first one. */
const probeCached = async (id: string): Promise<Probe> => {
  const key = new Request(`https://pattaya-stream.internal/live/${encodeURIComponent(id)}`);
  const hit = await caches.default.match(key);
  if (hit !== undefined) return hit.json<Probe>();

  const result = await probe(id);
  await caches.default.put(
    key,
    new Response(JSON.stringify(result), {
      headers: { 'content-type': 'application/json', 'cache-control': `max-age=${TTL_SECONDS}` },
    }),
  );
  return result;
};

export default {
  fetch: async (request) => {
    if (new URL(request.url).pathname !== '/api/live') {
      return new Response('Not found', { status: 404 });
    }
    const statuses: ChannelStatus[] = await Promise.all(
      CHANNELS.map(async ({ id }) => ({ id, ...(await probeCached(id)) })),
    );
    return Response.json(statuses, { headers: { 'cache-control': 'no-store' } });
  },
} satisfies ExportedHandler;
