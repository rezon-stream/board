import { CHANNELS } from './channels';

/** Everything the window remembers, kept in the query string so a view can be shared. */
export type View = {
  /** Channels explicitly started by the viewer. */
  readonly started: readonly string[];
  readonly chat: boolean;
  readonly zoom: boolean;
  readonly sound: boolean;
  /** Channel id of the active camera: the one zoomed, chatted and heard. */
  readonly solo: string | undefined;
};

export const keyOf = (id: string): string => CHANNELS.find((channel) => channel.id === id)?.key ?? '';

export const readView = (): View => {
  const params = new URLSearchParams(location.search);
  const keys = (params.get('cams') ?? '').split(',');
  const started: string[] = [];
  for (const key of keys) {
    const channel = CHANNELS.find((candidate) => candidate.key === key);
    if (channel !== undefined && !started.includes(channel.id)) started.push(channel.id);
  }
  const solo = CHANNELS.find((channel) => channel.key === params.get('solo'))?.id;
  return {
    started,
    chat: params.has('chat'),
    zoom: params.has('zoom'),
    sound: params.has('sound'),
    solo: solo !== undefined && started.includes(solo) ? solo : undefined,
  };
};

export const writeView = ({ started, chat, zoom, sound, solo }: View): void => {
  const cams = started.map(keyOf).join(',');
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
