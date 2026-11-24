import type { TitleCard } from './lore';

/** "Previously..." cards shown once before the first event of a season chapter (skippable). Spanish in i18n/esContentL.ts. */
export const RECAP_4: TitleCard[] = [
  { heading: 'Blood on the Wall', text: 'Cain’s cut brake line reached the street. The Red Hand Wall remembers, and the Loop is open again.' },
  { heading: 'Redline', text: 'Dante still holds the debt on half the harbour. He no longer holds the Loop alone.' },
  { heading: 'Neon Harbor', text: 'A new season. The docks are for sale, and somebody is buying them quietly.' },
];

export const RECAP_5: TitleCard[] = [
  { heading: 'The Broker', text: 'Madame Adeyemi’s list of payments went public. The harbour is still lit, for now.' },
  { heading: 'Before the Wall', text: 'Twelve years ago Cain and a driver named Wren tested the Civic at dusk. A phone call ended the evening.' },
  { heading: 'One night', text: 'Dante signs for the Wall at dawn. The archive in the lighthouse holds the truth about the crash.' },
];

export const RECAPS: Readonly<Record<string, TitleCard[]>> = { 'c4-yard': RECAP_4, 'c5-key': RECAP_5 };
