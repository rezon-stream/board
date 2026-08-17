import { useEffect, useRef, useState } from 'react';
import { loadPlayerApi } from '../lib/youtube';

type Props = {
  title: string;
  channelKey: string;
  videoId: string;
  active: boolean;
  unmuted: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onEnded: () => void;
};

export const Tile = ({ title, channelKey, videoId, active, unmuted, onSelect, onRemove, onEnded }: Props) => {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YT.Player>(undefined);
  const ended = useRef(onEnded);
  ended.current = onEnded;
  // Broadcasts differ in loudness, so every channel keeps its own level.
  const [volume, setVolume] = useState(() => Number(localStorage.getItem(`volume:${channelKey}`) ?? 100));
  const level = useRef(volume);
  level.current = volume;

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
        // The player learns that the broadcast is over long before the next poll would.
        events: {
          onReady: ({ target }) => target.setVolume(level.current),
          onStateChange: ({ data }) => {
            if (data === YT.PlayerState.ENDED) ended.current();
          },
          onError: () => ended.current(),
        },
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

  const change = (next: number) => {
    setVolume(next);
    localStorage.setItem(`volume:${channelKey}`, String(next));
    player.current?.setVolume(next);
  };

  return (
    <div className="tile">
      <div ref={host} className="tile-player" />
      {/* The cross-origin iframe swallows clicks, so selection needs its own overlay. */}
      <button className="tile-overlay" onClick={onSelect} aria-pressed={active}>
        <span className="tile-title">{title}</span>
        {!unmuted && <span className="tile-sound">без звука</span>}
      </button>
      {/* Sits outside the overlay button so dragging it does not toggle the selection. */}
      {unmuted && (
        <input
          className="tile-volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          aria-label={`Громкость: ${title}`}
          onChange={({ target }) => change(Number(target.value))}
        />
      )}
      <button className="remove" aria-label={`Убрать ${title}`} onClick={onRemove}>
        ×
      </button>
    </div>
  );
};
