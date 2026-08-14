import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { POLL_MS, fetchStatuses } from '../lib/api';
import { CHANNELS, type Channel } from '../lib/channels';
import { type View, readView, writeView } from '../lib/view';
import type { ChannelStatus } from '../lib/status';
import { Chat } from './Chat';
import { Tile } from './Tile';

type PickerProps = { channels: readonly Channel[]; onPick: (id: string) => void };

const Picker = ({ channels, onPick }: PickerProps) => (
  <div className="picker">
    <span className="picker-title">+ Добавить канал</span>
    <div className="picker-list">
      {channels.map((channel) => (
        <button key={channel.id} onClick={() => onPick(channel.id)}>
          {channel.title}
        </button>
      ))}
    </div>
  </div>
);

export const App = () => {
  const [statuses, setStatuses] = useState<ChannelStatus[]>();
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string>();
  const initial = useMemo(readView, []);
  const [slots, setSlots] = useState<View['slots']>(initial.slots);
  const [soloed, setSoloed] = useState(initial.solo);
  const [chatShown, setChatShown] = useState(initial.chat);
  const [zoomed, setZoomed] = useState(initial.zoom);
  const [sound, setSound] = useState(initial.sound);
  const [target, setTarget] = useState<number>();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(
    () => writeView({ slots, chat: chatShown, zoom: zoomed, sound, solo: soloed }),
    [slots, chatShown, zoomed, sound, soloed],
  );

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

  const cells = useMemo(
    () =>
      slots.map((id) => {
        const channel = CHANNELS.find((candidate) => candidate.id === id);
        return channel === undefined
          ? undefined
          : { channel, status: statuses?.find((candidate) => candidate.id === id) };
      }),
    [slots, statuses],
  );

  const openPicker = (index: number) => {
    setTarget(index);
    dialog.current?.showModal();
  };

  const add = (id: string) => {
    setSlots(slots.map((current, index) => (index === target ? id : current)));
    dialog.current?.close();
  };

  const soloedStatus = cells.find((cell) => cell?.channel.id === soloed)?.status;
  const available = CHANNELS.filter((channel) => !slots.includes(channel.id));

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
        <section className={zoomed && soloed !== undefined ? 'grid zoomed' : 'grid'}>
          {cells.map((cell, index) => {
            if (cell === undefined) {
              return (
                <div key={`slot-${index}`} className="cell">
                  {available.length > 0 && (
                    <button className="tile add" aria-label="Добавить канал" onClick={() => openPicker(index)}>
                      +
                    </button>
                  )}
                </div>
              );
            }

            const { channel, status } = cell;
            const active = soloed === channel.id;
            const remove = () => setSlots(slots.map((id, at) => (at === index ? null : id)));
            return (
              <div key={channel.id} className={active ? 'cell active' : 'cell'}>
                {status?.state === 'live' ? (
                  <Tile
                    title={channel.title}
                    videoId={status.videoId}
                    active={active}
                    unmuted={active && sound}
                    onSelect={() => setSoloed((current) => (current === channel.id ? undefined : channel.id))}
                    onRemove={remove}
                    onEnded={() => void poll(channel.key)}
                  />
                ) : (
                  <div className="tile idle">
                    <span>{channel.title}</span>
                    <span className="idle-state">
                      {status === undefined
                        ? 'опрашиваем…'
                        : status.state === 'offline'
                          ? 'не в эфире'
                          : 'не удалось опросить'}
                    </span>
                    <button className="remove" aria-label={`Убрать ${channel.title}`} onClick={remove}>
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {chatShown && soloedStatus?.state === 'live' && <Chat videoId={soloedStatus.videoId} />}
      </div>

      {available.length > 0 && (
        <dialog
          ref={dialog}
          onClick={({ target: clicked, currentTarget }) => {
            if (clicked === currentTarget) currentTarget.close();
          }}
        >
          <Picker channels={available} onPick={add} />
        </dialog>
      )}
    </main>
  );
};
