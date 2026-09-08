import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import splashImage from '../assets/Splash.webp';
import { track } from '../lib/analytics';
import { POLL_MS, fetchStatuses } from '../lib/api';
import { CHANNELS } from '../lib/channels';
import { type View, keyOf, readView, writeView } from '../lib/view';
import type { ChannelStatus } from '../lib/status';
import { Chat } from './Chat';
import { Tile } from './Tile';

const SPLASH_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const SPLASH_STORAGE_KEY = 'splash:last-shown';
const ONLINE_INTERVAL_MS = 30_000;
const ONLINE_STORAGE_KEY = 'online:id';

const isSplashDue = (): boolean => {
  const lastShown = Number(localStorage.getItem(SPLASH_STORAGE_KEY));
  return !Number.isFinite(lastShown) || Date.now() - lastShown >= SPLASH_INTERVAL_MS;
};

export const App = (): ReactElement => {
  const [statuses, setStatuses] = useState<ChannelStatus[]>();
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string>();
  const [online, setOnline] = useState<number>();
  const initial = useMemo(readView, []);
  const [started, setStarted] = useState<View['started']>(initial.started);
  const [soloed, setSoloed] = useState(initial.solo);
  const [chatShown, setChatShown] = useState(initial.chat);
  const [zoomed, setZoomed] = useState(initial.zoom);
  const [sound, setSound] = useState(initial.sound);
  const [controls, setControls] = useState(false);
  const [splashShown, setSplashShown] = useState(isSplashDue);
  const [splashLoaded, setSplashLoaded] = useState(false);
  const [order, setOrder] = useState<View['order']>(initial.order);
  const [dragging, setDragging] = useState<string>();
  const [dragTarget, setDragTarget] = useState<string>();
  const [orderMessage, setOrderMessage] = useState('');
  const drag = useRef<{ readonly id: string; readonly pointerId: number } | undefined>(undefined);

  useEffect(() => {
    if (!splashLoaded) return;
    const timer = window.setTimeout(() => setSplashShown(false), 1_200);
    return () => window.clearTimeout(timer);
  }, [splashLoaded]);

  useEffect(
    () => writeView({ started, chat: chatShown, zoom: zoomed, sound, order, solo: soloed }),
    [started, chatShown, zoomed, sound, order, soloed],
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

  useEffect(() => {
    let cancelled = false;
    const heartbeat = async () => {
      try {
        let id = localStorage.getItem(ONLINE_STORAGE_KEY);
        if (id === null) {
          id = crypto.randomUUID();
          localStorage.setItem(ONLINE_STORAGE_KEY, id);
        }
        id = localStorage.getItem(ONLINE_STORAGE_KEY) ?? id;

        const response = await fetch('/api/online', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (!response.ok) throw new Error(`/api/online ответил ${response.status}`);
        const result: unknown = await response.json();
        const count =
          typeof result === 'object' &&
          result !== null &&
          'count' in result &&
          typeof result.count === 'number'
            ? result.count
            : undefined;
        if (count === undefined || !Number.isInteger(count) || count < 1) {
          throw new Error('/api/online вернул неверный count');
        }
        if (!cancelled) setOnline(count);
      } catch {
        if (!cancelled) setOnline(undefined);
      }
    };

    void heartbeat();
    const timer = window.setInterval(() => void heartbeat(), ONLINE_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const start = (id: string) => {
    track('start_channel', keyOf(id));
    setStarted((current) => (current.includes(id) ? current : [...current, id]));
  };

  const stop = (id: string) => {
    setStarted((current) => current.filter((candidate) => candidate !== id));
    setSoloed((current) => (current === id ? undefined : current));
  };

  const reorder = (source: string, target: string) => {
    if (source === target) return;
    setOrder((current) => {
      const sourceIndex = current.indexOf(source);
      const targetIndex = current.indexOf(target);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = current.filter((id) => id !== source);
      next.splice(targetIndex, 0, source);
      return next;
    });
  };

  const channelAt = (event: PointerEvent<HTMLButtonElement>): string | undefined =>
    document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-channel-id]')?.dataset.channelId;

  const cancelDrag = () => {
    drag.current = undefined;
    setDragging(undefined);
    setDragTarget(undefined);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, pointerId: event.pointerId };
    setDragging(id);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (drag.current?.id === id && drag.current.pointerId === event.pointerId) setDragTarget(channelAt(event));
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (drag.current?.id !== id || drag.current.pointerId !== event.pointerId) return;
    const target = channelAt(event);
    cancelDrag();
    reorder(id, target ?? id);
  };

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const delta = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const source = order.indexOf(id);
    const target = source + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[source], next[target]] = [next[target], next[source]];
    setOrder(next);
    setOrderMessage(`${CHANNELS.find((channel) => channel.id === id)?.title ?? 'Канал'}: позиция ${target + 1} из ${order.length}.`);
  };

  const soloedStatus = started.includes(soloed ?? '')
    ? statuses?.find((status) => status.id === soloed)
    : undefined;
  const focused = zoomed && soloedStatus?.state === 'live';

  return (
    <>
      {splashShown && (
        <div className={`splash${splashLoaded ? ' fading' : ''}`} aria-hidden="true">
          <img
            src={splashImage.src}
            alt=""
            onLoad={() => {
              localStorage.setItem(SPLASH_STORAGE_KEY, String(Date.now()));
              setSplashLoaded(true);
            }}
            onError={() => setSplashShown(false)}
          />
        </div>
      )}
      <main inert={splashShown}>
      <header className="bar">
        <div className="brand">
          <h1>Pattaya Stream</h1>
          {polling && <span className="polling" role="status" aria-label="Опрашиваем каналы" />}
          {online !== undefined && <span className="online">{online} онлайн</span>}
        </div>
        <div className="toggles">
          <button aria-pressed={sound} onClick={() => setSound((on) => !on)}>
            Звук
          </button>
          <button aria-pressed={controls} onClick={() => setControls((shown) => !shown)}>
            Контролы
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
          <p id="order-instructions" className="sr-only">
            Перемещайте канал клавишами со стрелками.
          </p>
          <p className="sr-only" aria-live="polite">
            {orderMessage}
          </p>
          {order.map((id) => {
            const channel = CHANNELS.find((candidate) => candidate.id === id);
            if (channel === undefined) return null;
            const status = statuses?.find((candidate) => candidate.id === channel.id);
            const isStarted = started.includes(channel.id);
            const hasPlayer = isStarted && status?.state === 'live';
            const active = hasPlayer && soloed === channel.id;
            return (
              <div
                key={channel.id}
                data-channel-id={channel.id}
                className={`cell${hasPlayer ? ' started' : ''}${active ? ' active' : ''}${dragging === channel.id ? ' dragging' : ''}${dragTarget === channel.id && dragging !== channel.id ? ' drag-over' : ''}`}
              >
                <button
                  type="button"
                  className="drag-handle"
                  aria-label={`Переместить ${channel.title}`}
                  aria-describedby="order-instructions"
                  onPointerDown={(event) => onPointerDown(event, channel.id)}
                  onPointerMove={(event) => onPointerMove(event, channel.id)}
                  onPointerUp={(event) => onPointerUp(event, channel.id)}
                  onPointerCancel={cancelDrag}
                  onLostPointerCapture={() => {
                    if (drag.current?.id === channel.id) cancelDrag();
                  }}
                  onKeyDown={(event) => onHandleKeyDown(event, channel.id)}
                >
                  <svg className="drag-handle-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M10 9h4V6h3l-5-5-5 5h3v3zM9 10H6V7l-5 5 5 5v-3h3zm14 2-5-5v3h-3v4h3v3zm-9 3h-4v3H7l5 5 5-5h-3z"
                    />
                  </svg>
                </button>
                {hasPlayer ? (
                  <Tile
                    title={channel.title}
                    channelKey={channel.key}
                    videoId={status.videoId}
                    active={active}
                    unmuted={active && sound}
                    controls={controls}
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
    </>
  );
};
