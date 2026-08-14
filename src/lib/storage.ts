import { CHANNELS } from './channels';

export const MAX_CHANNELS = 4;

/** One entry per grid cell; `null` is an empty cell, so positions survive reloads. */
export type Slots = readonly (string | null)[];

const KEY = 'pattaya-stream:channels';

const isKnown = (id: string): boolean => CHANNELS.some((channel) => channel.id === id);

export const readSlots = (): Slots => {
  const empty = Array.from({ length: MAX_CHANNELS }, () => null);
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!Array.isArray(stored)) return empty;
    const taken = new Set<string>();
    return empty.map((_, index) => {
      const id: unknown = stored[index];
      if (typeof id !== 'string' || !isKnown(id) || taken.has(id)) return null;
      taken.add(id);
      return id;
    });
  } catch {
    return empty;
  }
};

export const writeSlots = (slots: Slots): void => localStorage.setItem(KEY, JSON.stringify(slots));
