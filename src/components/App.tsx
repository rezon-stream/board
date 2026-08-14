import { useEffect, useMemo, useRef, useState } from 'react';
import { POLL_MS, fetchStatuses } from '../lib/api';
import { CHANNELS, type Channel } from '../lib/channels';
import { type Slots, readSlots, writeSlots } from '../lib/storage';
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
  const [error, setError] = useState<string>();
  const [slots, setSlots] = useState<Slots>(readSlots);
  const [soloed, setSoloed] = useState<string>();
  const [chatShown, setChatShown] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [target, setTarget] = useState<number>();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const next = await fetchStatuses();
        if (stopped) return;
        setStatuses(next);
        setError(undefined);
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : String(cause));
      }
    };

    const onVisible = () => void poll();
    void poll();
    const timer = window.setInterval(onVisible, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

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

  const change = (next: Slots) => {
    setSlots(next);
    writeSlots(next);
  };

  const openPicker = (index: number) => {
    setTarget(index);
    dialog.current?.showModal();
  };

  const add = (id: string) => {
    change(slots.map((current, index) => (index === target ? id : current)));
    dialog.current?.close();
  };

  const soloedStatus = cells.find((cell) => cell?.channel.id === soloed)?.status;
  const available = CHANNELS.filter((channel) => !slots.includes(channel.id));

  return (
    <main>
      <header className="bar">
        <h1>Pattaya Stream</h1>
        <div className="toggles">
          <button aria-pressed={chatShown} onClick={() => setChatShown((shown) => !shown)}>
            Чат
          </button>
          <button aria-pressed={zoomed} onClick={() => setZoomed((on) => !on)}>
            Увеличивать активный
          </button>
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
            const remove = () => change(slots.map((id, at) => (at === index ? null : id)));
            return (
              <div key={channel.id} className={active ? 'cell active' : 'cell'}>
                {status?.state === 'live' ? (
                  <Tile
                    title={channel.title}
                    videoId={status.videoId}
                    soloed={active}
                    onSolo={() => setSoloed((current) => (current === channel.id ? undefined : channel.id))}
                    onRemove={remove}
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
