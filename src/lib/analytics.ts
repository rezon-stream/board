declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/** Sends a GA4 event; the tag is missing while developing, hence the optional call. */
export const track = (name: string, channel: string): void => window.gtag?.('event', name, { channel });
