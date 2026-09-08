export type Channel = {
  /** YouTube @handle or UC… channel id, exactly as it appears in the channel URL. */
  readonly id: string;
  /** Internal name used for polling, analytics and local volume preferences. */
  readonly key: string;
  /** One-letter code used only in shareable URLs. */
  readonly code: string;
  /** Human name of the camera, shown on the tile. */
  readonly title: string;
};

/** Curated camera list; the order is the order of the board. */
export const CHANNELS: readonly Channel[] = [
  // Percent-encoded on purpose: the handle is Cyrillic (@СтасКирбитов-к7е).
  {
    id: '@%D0%A1%D1%82%D0%B0%D1%81%D0%9A%D0%B8%D1%80%D0%B1%D0%B8%D1%82%D0%BE%D0%B2-%D0%BA7%D0%B5',
    key: 'stas',
    code: 's',
    title: 'Stas Pattaya',
  },
  { id: '@PattayaParadize', key: 'paradize', code: 'p', title: 'Pattaya near Paradize' },
  { id: '@Milanko_Pattaya_lifestyle', key: 'milan', code: 'm', title: 'Milan Podzimek' },
  { id: '@handovskaya', key: 'erika', code: 'e', title: 'Та самая Эрика' },
  { id: '@Rezon.online', key: 'rezon', code: 'r', title: '👑 Rezon IRL 👑' },
  { id: '@saint_aratu', key: 'artur', code: 'a', title: 'Похождения Артурия' },
  { id: '@NZTima', key: 'tima', code: 't', title: 'HappyTimeTtimma' },
  { id: '@NZTima1', key: 'tima1', code: 'n', title: 'HappyTimeTtimma (@NZTima1)' },
  { id: '@Ms.Yanawitch', key: 'yana', code: 'y', title: 'Яна Паттайя' },
  // Cyrillic handle again: @ТайскаяЖенщина.
  {
    id: '@%D0%A2%D0%B0%D0%B9%D1%81%D0%BA%D0%B0%D1%8F%D0%96%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0',
    key: 'thai',
    code: 'h',
    title: 'Тайская Женщина',
  },
];
