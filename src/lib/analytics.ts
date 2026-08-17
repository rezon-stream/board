declare global {
  interface Window {
    gtag?: (type: 'event', name: string, params: Record<string, string>) => void;
  }
}

/** Sends a GA4 event; the tag is missing while developing, hence the optional call. */
export const track = (name: string, channel: string): void => window.gtag?.('event', name, { channel });
