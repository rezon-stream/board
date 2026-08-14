import { useEffect, useRef } from 'react';
import { loadPlayerApi } from '../lib/youtube';

type Props = {
  title: string;
  videoId: string;
  soloed: boolean;
  onSolo: () => void;
  onRemove: () => void;
};

export const Tile = ({ title, videoId, soloed, onSolo, onRemove }: Props) => {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YT.Player>(undefined);

  useEffect(() => {
    let cancelled = false;

    void loadPlayerApi().then(() => {
      if (cancelled || host.current === null) return;
      // The API replaces the element it is given with an iframe, so hand it a child
      // React does not own instead of the ref node itself.
      const mount = host.current.appendChild(document.createElement('div'));
      player.current = new YT.Player(mount, {
        videoId,
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0, origin: location.origin },
      });
    });

    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = undefined;
    };
  }, [videoId]);

  useEffect(() => {
    if (soloed) player.current?.unMute();
    else player.current?.mute();
  }, [soloed]);

  return (
    <div className="tile">
      <div ref={host} className="tile-player" />
      {/* The cross-origin iframe swallows clicks, so solo needs its own overlay. */}
      <button className="tile-overlay" onClick={onSolo} aria-pressed={soloed}>
        <span className="tile-title">{title}</span>
        <span className="tile-sound">{soloed ? 'звук включён' : 'без звука'}</span>
      </button>
      <button className="remove" aria-label={`Убрать ${title}`} onClick={onRemove}>
        ×
      </button>
    </div>
  );
};
