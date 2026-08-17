import { CHANNELS } from './channels';

export const MAX_CHANNELS = 4;

/** Everything the window remembers, kept in the query string so a view can be shared. */
export type View = {
  /** One channel id per grid cell, `null` for an empty one. */
  readonly slots: readonly (string | null)[];
  readonly chat: boolean;
  readonly zoom: boolean;
  readonly sound: boolean;
  /** Channel id of the active camera: the one zoomed, chatted and heard. */
  readonly solo: string | undefined;
};

const byKey = (key: string) => CHANNELS.find((channel) => channel.key === key);
export const keyOf = (id: string): string => CHANNELS.find((channel) => channel.id === id)?.key ?? '';

export const readView = (): View => {
  const params = new URLSearchParams(location.search);
  const keys = (params.get('cams') ?? '').split(',');
  const taken = new Set<string>();
  const slots = Array.from({ length: MAX_CHANNELS }, (_, index) => {
    const channel = byKey(keys[index] ?? '');
    if (channel === undefined || taken.has(channel.id)) return null;
    taken.add(channel.id);
    return channel.id;
  });
  const solo = byKey(params.get('solo') ?? '')?.id;
  return {
    slots,
    chat: params.has('chat'),
    zoom: params.has('zoom'),
    sound: params.has('sound'),
    solo: solo !== undefined && slots.includes(solo) ? solo : undefined,
  };
};

export const writeView = ({ slots, chat, zoom, sound, solo }: View): void => {
  const cams = slots
    .map((id) => (id === null ? '' : keyOf(id)))
    .join(',')
    .replace(/,+$/, '');
  // Built by hand rather than with URLSearchParams: it would escape the separating
  // commas into %2C, and channel keys need no escaping anyway.
  const parts = [
    cams === '' ? '' : `cams=${cams}`,
    chat ? 'chat' : '',
    zoom ? 'zoom' : '',
    sound ? 'sound' : '',
    solo === undefined ? '' : `solo=${keyOf(solo)}`,
  ].filter((part) => part !== '');
  history.replaceState(null, '', parts.length === 0 ? location.pathname : `?${parts.join('&')}`);
};
