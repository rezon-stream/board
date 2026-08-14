import { useEffect, useRef } from 'react';
import { loadPlayerApi } from '../lib/youtube';

type Props = {
  title: string;
  videoId: string;
  active: boolean;
  unmuted: boolean;
  onSelect: () => void;
  onRemove: () => void;
};

export const Tile = ({ title, videoId, active, unmuted, onSelect, onRemove }: Props) => {
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
    if (unmuted) player.current?.unMute();
    else player.current?.mute();
  }, [unmuted]);

  return (
    <div className="tile">
      <div ref={host} className="tile-player" />
      {/* The cross-origin iframe swallows clicks, so selection needs its own overlay. */}
      <button className="tile-overlay" onClick={onSelect} aria-pressed={active}>
        <span className="tile-title">{title}</span>
        <span className="tile-sound">{unmuted ? 'звук включён' : 'без звука'}</span>
      </button>
      <button className="remove" aria-label={`Убрать ${title}`} onClick={onRemove}>
        ×
      </button>
    </div>
  );
};
