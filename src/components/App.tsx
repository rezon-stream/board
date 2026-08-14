import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { POLL_MS, fetchStatuses } from '../lib/api';
import { CHANNELS, type Channel } from '../lib/channels';
import { MAX_CHANNELS, readChannels, writeChannels } from '../lib/storage';
import type { ChannelStatus } from '../lib/status';
import { Chat } from './Chat';
import { Tile } from './Tile';

// A cell holding both a player and a chat needs the full width to stay readable.
const columnsFor = (count: number, inlineChats: boolean): number =>
  count <= 1 || inlineChats ? 1 : 2;

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
  const [chosen, setChosen] = useState<string[]>(readChannels);
  const [soloed, setSoloed] = useState<string>();
  const [chatShown, setChatShown] = useState(false);
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
      chosen.flatMap((id) => {
        const channel = CHANNELS.find((candidate) => candidate.id === id);
        return channel === undefined
          ? []
          : [{ channel, status: statuses?.find((candidate) => candidate.id === id) }];
      }),
    [chosen, statuses],
  );

  const change = (next: string[]) => {
    setChosen(next);
    writeChannels(next);
  };

  const add = (id: string) => {
    change([...chosen, id]);
    dialog.current?.close();
  };

  const soloedStatus = cells.find(({ channel }) => channel.id === soloed)?.status;
  // Beyond two cameras a chat next to every tile leaves neither readable.
  const inlineChats = chatShown && cells.length <= 2;
  const available = CHANNELS.filter((channel) => !chosen.includes(channel.id));
  const slotFree = chosen.length < MAX_CHANNELS && available.length > 0;

  return (
    <main>
      <header className="bar">
        <h1>Pattaya Stream</h1>
        <button aria-pressed={chatShown} onClick={() => setChatShown((shown) => !shown)}>
          Чат
        </button>
      </header>

      {error !== undefined && <p className="notice error">Не удалось опросить каналы: {error}</p>}

      <div className="stage">
        <section
          className="grid"
          style={
            {
              '--columns': columnsFor(cells.length + (slotFree ? 1 : 0), inlineChats),
            } as CSSProperties
          }
        >
          {cells.map(({ channel, status }) => (
            <div key={channel.id} className="cell">
              {status?.state === 'live' ? (
                <Tile
                  title={channel.title}
                  videoId={status.videoId}
                  soloed={soloed === channel.id}
                  onSolo={() => setSoloed((current) => (current === channel.id ? undefined : channel.id))}
                  onRemove={() => change(chosen.filter((id) => id !== channel.id))}
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
                  <button
                    className="remove"
                    aria-label={`Убрать ${channel.title}`}
                    onClick={() => change(chosen.filter((id) => id !== channel.id))}
                  >
                    ×
                  </button>
                </div>
              )}
              {inlineChats && status?.state === 'live' && <Chat videoId={status.videoId} />}
            </div>
          ))}

          {slotFree && (
            <div className="cell">
              {/* The empty grid is one full-width cell, so the list fits in it; once tiles
                  take the space, the same list moves into a dialog. */}
              {cells.length === 0 ? (
                <div className="tile">
                  <Picker channels={available} onPick={add} />
                </div>
              ) : (
                <button
                  className="tile add"
                  aria-label="Добавить канал"
                  onClick={() => dialog.current?.showModal()}
                >
                  +
                </button>
              )}
            </div>
          )}
        </section>

        {chatShown && !inlineChats && soloedStatus?.state === 'live' && (
          <Chat videoId={soloedStatus.videoId} />
        )}
      </div>

      {slotFree && cells.length > 0 && (
        <dialog
          ref={dialog}
          onClick={({ target, currentTarget }) => {
            if (target === currentTarget) currentTarget.close();
          }}
        >
          <Picker channels={available} onPick={add} />
        </dialog>
      )}
    </main>
  );
};
