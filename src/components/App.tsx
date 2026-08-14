import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { POLL_MS, fetchStatuses } from '../lib/api';
import { CHANNELS } from '../lib/channels';
import { MAX_CHANNELS, readChannels, writeChannels } from '../lib/storage';
import type { ChannelStatus } from '../lib/status';
import { Chat } from './Chat';
import { Tile } from './Tile';

const columnsFor = (count: number): number => (count <= 1 ? 1 : 2);

export const App = () => {
  const [statuses, setStatuses] = useState<ChannelStatus[]>();
  const [error, setError] = useState<string>();
  const [chosen, setChosen] = useState<string[]>(readChannels);
  const [soloed, setSoloed] = useState<string>();
  const [adding, setAdding] = useState(false);

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

  const soloedStatus = cells.find(({ channel }) => channel.id === soloed)?.status;
  // Beyond two cameras a chat next to every tile leaves neither readable.
  const chatsFit = cells.length <= 2;
  const available = CHANNELS.filter((channel) => !chosen.includes(channel.id));
  const slotFree = chosen.length < MAX_CHANNELS && available.length > 0;

  return (
    <main>
      <header className="bar">
        <h1>Pattaya Stream</h1>
      </header>

      {error !== undefined && <p className="notice error">Не удалось опросить каналы: {error}</p>}

      <div className="stage">
        <section
          className="grid"
          style={{ '--columns': columnsFor(cells.length + (slotFree ? 1 : 0)) } as CSSProperties}
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
              {chatsFit && status?.state === 'live' && <Chat videoId={status.videoId} />}
            </div>
          ))}

          {slotFree && (
            <div className="cell">
              {adding ? (
                <select
                  className="tile picker"
                  autoFocus
                  defaultValue=""
                  onChange={({ target }) => {
                    change([...chosen, target.value]);
                    setAdding(false);
                  }}
                  onBlur={() => setAdding(false)}
                >
                  <option value="" disabled>
                    Какой канал?
                  </option>
                  {available.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.title}
                    </option>
                  ))}
                </select>
              ) : (
                <button className="tile add" aria-label="Добавить канал" onClick={() => setAdding(true)}>
                  +
                </button>
              )}
            </div>
          )}
        </section>

        {!chatsFit && soloedStatus?.state === 'live' && <Chat videoId={soloedStatus.videoId} />}
      </div>
    </main>
  );
};
