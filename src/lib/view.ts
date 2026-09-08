import { CHANNELS } from './channels';

/** Everything the window remembers, kept in the query string so a view can be shared. */
export type View = {
  /** Channels explicitly started by the viewer. */
  readonly started: readonly string[];
  readonly chat: boolean;
  readonly zoom: 'xl' | 'x4' | undefined;
  readonly sound: boolean;
  /** Full channel sequence, expressed as stable internal ids. */
  readonly order: readonly string[];
  /** Channel id of the active camera: the one zoomed, chatted and heard. */
  readonly solo: string | undefined;
};

export const keyOf = (id: string): string => CHANNELS.find((channel) => channel.id === id)?.key ?? '';

export const codeOf = (id: string): string => CHANNELS.find((channel) => channel.id === id)?.code ?? '';

const idsForCodes = (codes: string | null): string[] => {
  const ids: string[] = [];
  for (const code of (codes ?? '').split(',')) {
    const channel = CHANNELS.find((candidate) => candidate.code === code);
    if (channel !== undefined && !ids.includes(channel.id)) ids.push(channel.id);
  }
  return ids;
};

export const readView = (): View => {
  const params = new URLSearchParams(location.search);
  const started = idsForCodes(params.get('cams'));
  const ordered = idsForCodes(params.get('order'));
  const order = [...ordered, ...CHANNELS.map((channel) => channel.id).filter((id) => !ordered.includes(id))];
  const solo = CHANNELS.find((channel) => channel.code === params.get('solo'))?.id;
  const zoom = params.get('zoom');
  return {
    started,
    chat: params.has('chat'),
    zoom: zoom === 'x4' ? 'x4' : params.has('zoom') ? 'xl' : undefined,
    sound: params.has('sound'),
    order,
    solo: solo !== undefined && started.includes(solo) ? solo : undefined,
  };
};

export const writeView = ({ started, chat, zoom, sound, order, solo }: View): void => {
  const cams = started.map(codeOf).join(',');
  const defaultOrder = CHANNELS.map((channel) => channel.id);
  const orderChanged = order.length !== defaultOrder.length || order.some((id, index) => id !== defaultOrder[index]);
  // Built by hand rather than with URLSearchParams: it would escape the separating
  // commas into %2C, and channel codes need no escaping anyway.
  const parts = [
    cams === '' ? '' : `cams=${cams}`,
    chat ? 'chat' : '',
    zoom === undefined ? '' : zoom === 'xl' ? 'zoom' : 'zoom=x4',
    sound ? 'sound' : '',
    orderChanged ? `order=${order.map(codeOf).join(',')}` : '',
    solo === undefined ? '' : `solo=${codeOf(solo)}`,
  ].filter((part) => part !== '');
  history.replaceState(null, '', parts.length === 0 ? location.pathname : `?${parts.join('&')}`);
};
