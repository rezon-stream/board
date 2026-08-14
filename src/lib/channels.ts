export type Channel = {
  /** YouTube @handle or UC… channel id, exactly as it appears in the channel URL. */
  readonly id: string;
  /** Human name of the camera, shown on the tile. */
  readonly title: string;
};

/**
 * Curated camera list. Order is priority: when more channels are live than the grid
 * holds, the first ones win.
 *
 * PLACEHOLDER: these are round-the-clock channels convenient for checking the layout.
 * Replace with the Pattaya cameras.
 */
export const CHANNELS: readonly Channel[] = [
  { id: '@RandomlyEntertained21', title: 'Pattaya Beach Road' },
  { id: '@LofiGirl', title: 'Lofi Girl' },
  { id: '@SkyNews', title: 'Sky News' },
  { id: '@NASA', title: 'NASA' },
  { id: '@aljazeeraenglish', title: 'Al Jazeera' },
  { id: '@ABCNews', title: 'ABC News' },
  { id: '@bangkokandmore', title: 'Bangkok and More' },
  { id: '@JohnnyStrides', title: 'Johnny Strides' },
];
