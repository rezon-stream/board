import { type ReactElement, useEffect, useRef, useState } from 'react';
import { loadPlayerApi } from '../lib/youtube';

type Props = {
  title: string;
  channelKey: string;
  videoId: string;
  active: boolean;
  unmuted: boolean;
  onSelect: () => void;
  onStop: () => void;
  onEnded: () => void;
};

export const Tile = ({ title, channelKey, videoId, active, unmuted, onSelect, onStop, onEnded }: Props): ReactElement => {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YT.Player>(undefined);
  const [playback, setPlayback] = useState<'loading' | 'playing' | 'idle'>('loading');
  const ended = useRef(onEnded);
  ended.current = onEnded;
  const audible = useRef(unmuted);
  audible.current = unmuted;
  // Broadcasts differ in loudness, so every channel keeps its own level.
  const [volume, setVolume] = useState(() => Number(localStorage.getItem(`volume:${channelKey}`) ?? 100));
  const level = useRef(volume);
  level.current = volume;

  useEffect(() => {
    let cancelled = false;
    let instance: YT.Player | undefined;
    setPlayback('loading');

    const updatePlayback = (state: YT.PlayerState) => {
      if (cancelled || player.current === undefined) return;
      if (state === YT.PlayerState.ENDED) {
        ended.current();
        return;
      }
      setPlayback(
        state === YT.PlayerState.PLAYING
          ? 'playing'
          : state === YT.PlayerState.BUFFERING
            ? 'loading'
            : 'idle',
      );
    };

    void loadPlayerApi().then(() => {
      if (cancelled || host.current === null) return;
      // The API replaces the element it is given with an iframe, so hand it a child
      // React does not own instead of the ref node itself.
      const mount = host.current.appendChild(document.createElement('div'));
      instance = new YT.Player(mount, {
        videoId,
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0, origin: location.origin },
        // The player learns that the broadcast is over long before the next poll would.
        events: {
          onReady: ({ target }) => {
            if (cancelled) return;
            player.current = target;
            target.setVolume(level.current);
            if (audible.current) target.unMute();
            else target.mute();
            updatePlayback(target.getPlayerState());
          },
          onStateChange: ({ data }) => updatePlayback(data),
          onAutoplayBlocked: ({ target }) => {
            if (cancelled || player.current === undefined) return;
            setPlayback(target.getPlayerState() === YT.PlayerState.PLAYING ? 'playing' : 'idle');
          },
          onError: () => ended.current(),
        },
      });
    });

    return () => {
      cancelled = true;
      instance?.destroy();
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
      <button className="tile-overlay" onClick={onSelect} aria-label={`Выбрать ${title}`} aria-pressed={active}>
        <span className="tile-title">{title}</span>
        {!unmuted && <span className="tile-sound">без звука</span>}
      </button>
      <span className="playback-status" role="status">
        {playback === 'playing' ? 'Воспроизводится' : playback === 'loading' ? 'Загружается…' : 'Не запущен'}
      </span>
      {playback === 'idle' && (
        <button
          className="start playback-start"
          aria-label={`Воспроизвести ${title}`}
          onClick={() => player.current?.playVideo()}
        >
          Воспроизвести
        </button>
      )}
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
      <button className="stop" aria-label={`Остановить ${title}`} onClick={onStop}>
        ×
      </button>
    </div>
  );
};
