import type { Line } from './story';

export const FINAL_BEFORE: Line[] = [
  { who: 'mara', text: 'Everyone is at the Wall. Dante has an offer. Switch has another. They want your answer before the lights.', phone: true, mood: 'worried' },
  { who: 'calloway', text: 'My father called me twice today to say take the sponsorship. He never calls.', mood: 'worried' },
];

export const FINAL_OPEN_REPLY: Line[] = [
  { who: 'rookie', text: 'No livery. No door fees. Anyone with a car and a reason.' },
  { who: 'nova', text: 'An open Loop? I am in. Dante can keep his cheque.', mood: 'smirk' },
  { who: 'brick', text: 'The union is in. Lanes open.' },
  { who: 'switch', text: 'That is the answer I waited twelve years for.', mood: 'smirk' },
  { who: 'dante', text: 'Then you will race me for it. Rain turning to snow. I will be gentle.', mood: 'angry' },
];

export const FINAL_SPONSOR_REPLY: Line[] = [
  { who: 'rookie', text: 'I take the offer. The garage lives. The Loop gets a season.' },
  { who: 'nova', text: 'Black and gold? I will watch from the stands.', mood: 'angry' },
  { who: 'brick', text: 'The union does not race for livery. Good luck.', mood: 'angry' },
  { who: 'mara', text: 'I hope you know what you just signed, Rookie.', phone: true, mood: 'worried' },
  { who: 'dante', text: 'Then race me, and we write the first page. Vex and Tank have been told to give you a proper fight.', mood: 'smirk' },
];

export const FINAL_WIN: Line[] = [
  { who: 'switch', text: 'The Loop is open, Kestrel Bay. Free for every driver, every car. Not a sponsor in sight.', mood: 'smirk', if: 'open' },
  { who: 'dante', text: 'Open streets are dangerous streets. You are about to learn why.', mood: 'angry', if: 'open' },
  { who: 'dante', text: 'A signature and a win. Redline Racing begins tonight. The livery suits you.', mood: 'smirk', if: 'sponsor' },
  { who: 'switch', text: 'Kestrel Bay, a new team in black and gold. Good luck to them. I am still listening.', mood: 'worried', if: 'sponsor' },
  { who: 'cain', text: 'Rookie. The lighthouse, before dawn. Bring Dante\'s key. I have waited twelve years to see what it opens.', mood: 'angry' },
  { who: 'narrator', text: 'East Yard lighthouse. Five a.m. The rain stops. The key turns.' },
  { who: 'cain', text: 'A brake line, cut clean. A gate log with one page torn out. And a note in Dante\'s hand.' },
  { who: 'cain', text: '"I should have checked twice." He kept the proof of my crash for twelve years.', mood: 'angry' },
  { who: 'dante', text: 'I prepped that car, Cain. I checked every line at ten. After the crash I found one cut. Someone got to it at the quay.', mood: 'worried' },
  { who: 'dante', text: 'Aldous Calloway held my family\'s debt. And yours. He said: say nothing, and nobody else burns.', mood: 'worried' },
  { who: 'cain', text: 'You were twenty-one. You could have told me.' },
  { who: 'dante', text: 'I was twenty-one and afraid. I still am. That is why I built the rules. So nobody cuts a line and walks away.', mood: 'worried' },
  { who: 'calloway', text: 'My father. Twelve years. I will bring the lawyers myself. Not Redline\'s. Mine.', mood: 'worried', if: 'open' },
  { who: 'pixel', text: 'Chat. Chat. Are you seeing this? It is all live. Every word.', if: 'open' },
  { who: 'switch', text: 'Kestrel Bay, DJ Switch. Twelve years ago a man cut a brake line. Tonight he has a name. Everyone is invited to listen.', mood: 'smirk', if: 'open' },
  { who: 'dante', text: 'I will sell the docks back to the street. All of it. For one thing only: a hand on the Wall.', if: 'open' },
  { who: 'cain', text: 'Come up, Dante. Mind the paint. It is still wet.', if: 'open' },
  { who: 'mara', text: 'Cain. Come home. I am still angry. But come home.', phone: true, if: 'open' },
  { who: 'cain', text: 'Rookie, one lap in the Civic? My hands cannot hold the wheel. Yours can. I will call the corners.', mood: 'smirk', if: 'open' },
  { who: 'dante', text: 'Redline keeps the Loop. Calloway\'s empire goes quiet, quietly. No courts, no fires. Nobody else hurt.', if: 'sponsor' },
  { who: 'cain', text: 'You bought the Wall with my brake line, Dante.', mood: 'angry', if: 'sponsor' },
  { who: 'dante', text: 'I bought a Loop where nobody dies. It is all I know how to give.', if: 'sponsor' },
  { who: 'mara', text: 'You are both right. I hate that. Rookie, I am proud of you. And I am not okay.', phone: true, mood: 'worried', if: 'sponsor' },
  { who: 'switch', text: 'Kestrel Bay, DJ Switch. The Loop has a sponsor. Some nights that is safe. I will keep listening.', mood: 'worried', if: 'sponsor' },
  { who: 'cain', text: 'Come see me when the livery gets heavy, Rookie. The crane cab is open.', if: 'sponsor' },
];

export const FINAL_LOSE: Line[] = [
  { who: 'dante', text: 'Close. The council will wait until tomorrow. Think about the offer.', mood: 'smirk' },
  { who: 'mara', text: 'Breathe. Whichever door you chose, you still have the street.', phone: true },
];

export const FINAL_LOSE_2: Line[] = [
  { who: 'calloway', text: 'If you quit, my father wins. I do not know why I just said that. Again.', mood: 'worried' },
];

export const FINAL_LOSE_3: Line[] = [
  { who: 'switch', text: 'Everyone on the Wall is still listening. Take your time. Then go.' },
];
