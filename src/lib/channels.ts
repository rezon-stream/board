export type Channel = {
  /** YouTube @handle or UC… channel id, exactly as it appears in the channel URL. */
  readonly id: string;
  /** Human name of the camera, shown on the tile. */
  readonly title: string;
};

/** Curated camera list; the order is the order of the picker. */
export const CHANNELS: readonly Channel[] = [
  // Percent-encoded on purpose: the handle is Cyrillic (@СтасКирбитов-к7е).
  { id: '@%D0%A1%D1%82%D0%B0%D1%81%D0%9A%D0%B8%D1%80%D0%B1%D0%B8%D1%82%D0%BE%D0%B2-%D0%BA7%D0%B5', title: 'Stas Pattaya' },
  { id: '@PattayaParadize', title: 'Pattaya near Paradize' },
  { id: '@Milanko_Pattaya_lifestyle', title: 'Milan Podzimek' },
  { id: '@Rezon.online', title: '👑 Rezon IRL 👑' },
  { id: '@handovskaya', title: 'Та самая Эрика' },
  { id: '@saint_aratu', title: 'Похождения Артурия' },
  { id: '@NZTima', title: 'HappyTimeTtimma' },
];
