import { CHANNELS } from './channels';

export const MAX_CHANNELS = 4;

const KEY = 'pattaya-stream:channels';

const isKnown = (id: string): boolean => CHANNELS.some((channel) => channel.id === id);

export const readChannels = (): string[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    const ids = stored.filter((id): id is string => typeof id === 'string' && isKnown(id));
    return [...new Set(ids)].slice(0, MAX_CHANNELS);
  } catch {
    return [];
  }
};

export const writeChannels = (ids: readonly string[]): void =>
  localStorage.setItem(KEY, JSON.stringify(ids));
