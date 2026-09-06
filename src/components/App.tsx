import { type CSSProperties, type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import { POLL_MS, fetchStatuses } from '../lib/api';
import { CHANNELS } from '../lib/channels';
import { type View, keyOf, readView, writeView } from '../lib/view';
import type { ChannelStatus } from '../lib/status';
import { Chat } from './Chat';
import { Tile } from './Tile';

export const App = (): ReactElement => {
  const [statuses, setStatuses] = useState<ChannelStatus[]>();
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string>();
  const initial = useMemo(readView, []);
  const [started, setStarted] = useState<View['started']>(initial.started);
  const [soloed, setSoloed] = useState(initial.solo);
  const [chatShown, setChatShown] = useState(initial.chat);
  const [zoomed, setZoomed] = useState(initial.zoom);
  const [sound, setSound] = useState(initial.sound);

  useEffect(
    () => writeView({ started, chat: chatShown, zoom: zoomed, sound, solo: soloed }),
    [started, chatShown, zoomed, sound, soloed],
  );

  // A shared link can arrive with a channel already active, and that activation never
  // passes through a click.
  useEffect(() => {
    if (initial.solo !== undefined) track('solo_from_link', keyOf(initial.solo));
  }, [initial.solo]);

  const poll = useCallback(async (fresh?: string) => {
    setPolling(true);
    try {
      const next = await fetchStatuses(fresh);
      setStatuses(next);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPolling(false);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) void poll();
    };

    tick();
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [poll]);

  const start = (id: string) => {
    track('start_channel', keyOf(id));
    setStarted((current) => (current.includes(id) ? current : [...current, id]));
  };

  const stop = (id: string) => {
    setStarted((current) => current.filter((candidate) => candidate !== id));
    setSoloed((current) => (current === id ? undefined : current));
  };

  const soloedStatus = started.includes(soloed ?? '')
    ? statuses?.find((status) => status.id === soloed)
    : undefined;
  const focused = zoomed && soloedStatus?.state === 'live';

  return (
    <main>
      <header className="bar">
        <div className="brand">
          <h1>Pattaya Stream</h1>
          {polling && <span className="polling" role="status" aria-label="Опрашиваем каналы" />}
        </div>
        <div className="toggles">
          <button aria-pressed={sound} onClick={() => setSound((on) => !on)}>
            Звук
          </button>
          <button aria-pressed={chatShown} onClick={() => setChatShown((shown) => !shown)}>
            Чат
          </button>
          <button aria-pressed={zoomed} onClick={() => setZoomed((on) => !on)}>
            Увеличивать активный
          </button>
          <a
            className="github"
            href="https://github.com/rezon-stream/board"
            target="_blank"
            rel="noreferrer"
            aria-label="Исходники на GitHub"
          >
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        </div>
      </header>

      {error !== undefined && <p className="notice error">Не удалось опросить каналы: {error}</p>}

      <div className="stage">
        <section
          className={focused ? 'grid zoomed' : 'grid'}
          style={{ '--channel-count': Math.max(1, CHANNELS.length - 1) } as CSSProperties}
          aria-label="Каналы"
        >
          {CHANNELS.map((channel) => {
            const status = statuses?.find((candidate) => candidate.id === channel.id);
            const isStarted = started.includes(channel.id);
            const hasPlayer = isStarted && status?.state === 'live';
            const active = hasPlayer && soloed === channel.id;
            return (
              <div key={channel.id} className={`cell${hasPlayer ? ' started' : ''}${active ? ' active' : ''}`}>
                {hasPlayer ? (
                  <Tile
                    title={channel.title}
                    channelKey={channel.key}
                    videoId={status.videoId}
                    active={active}
                    unmuted={active && sound}
                    onSelect={() => {
                      if (!active) track('select_channel', channel.key);
                      setSoloed((current) => (current === channel.id ? undefined : channel.id));
                    }}
                    onStop={() => stop(channel.id)}
                    onEnded={() => {
                      stop(channel.id);
                      void poll(channel.key);
                    }}
                  />
                ) : (
                  <div className="tile idle">
                    <span>{channel.title}</span>
                    <span className="idle-state">
                      {status === undefined
                        ? 'опрашиваем…'
                        : status.state === 'offline'
                          ? 'не в эфире'
                          : status.state === 'live'
                            ? 'в эфире'
                            : 'не удалось опросить'}
                    </span>
                    {status?.state === 'live' && (
                      <button className="start" aria-label={`Запустить ${channel.title}`} onClick={() => start(channel.id)}>
                        Запустить
                      </button>
                    )}
                    {isStarted && (
                      <button className="stop" aria-label={`Остановить ${channel.title}`} onClick={() => stop(channel.id)}>
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {chatShown && soloedStatus?.state === 'live' && <Chat videoId={soloedStatus.videoId} />}
      </div>
    </main>
  );
};
