declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ready: Promise<void> | undefined;

/** Loads the IFrame Player API once per page; every tile awaits the same promise. */
export const loadPlayerApi = (): Promise<void> => {
  ready ??= new Promise((resolve) => {
    if (window.YT?.Player !== undefined) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return ready;
};
