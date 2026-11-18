import type { Line } from './story';

export const YARD_BEFORE: Line[] = [
  { who: 'brick', text: 'The crews want a show. Anyone can win a race. Show them something only you can do.', mood: 'smirk' },
  { who: 'mara', text: 'Smooth entries. Every wall you touch ends the chain. Cain used to say the cleanest slides sound like nothing at all.', phone: true },
  { who: 'lola', text: 'Rookie. A minute, after. I have something I never told anyone.', mood: 'worried' },
];

export const YARD_WIN: Line[] = [
  { who: 'brick', text: 'The yard stands with you. Redline cannot buy a crowd that sings.', mood: 'smirk' },
  { who: 'lola', text: 'I was ten. Quay 9, the night Cain crashed. A man in a grey coat, a cutter, under the car. I never said.', mood: 'worried' },
  { who: 'lola', text: 'The coat had a gold cufflink shaped like a gull. I see that gull on Calloway\'s yacht every summer.', mood: 'worried' },
  { who: 'rookie', text: 'Not Dante.' },
  { who: 'lola', text: 'Dante was holding the car when I looked back. Crying. Nobody ever believes that.' },
];

export const YARD_LOSE: Line[] = [
  { who: 'mara', text: 'More speed in, less angle. Let the rain do the work.', phone: true },
];

export const YARD_LOSE_2: Line[] = [
  { who: 'brick', text: 'Steel does not forgive. Give the stacks room. Again.' },
];

export const YARD_LOSE_3: Line[] = [
  { who: 'lola', text: 'I was ten and I watched in silence. You can try again out loud.' },
];

export const CLIFF_BEFORE: Line[] = [
  { who: 'calloway', text: 'My road. My rules. I paid for every metre of that guard rail, so try not to break it.', mood: 'smirk' },
  { who: 'calloway', text: 'And turn off that radio. My father cannot stand that voice. Funny, he never says why.', mood: 'angry' },
  { who: 'mara', text: 'Calloway is the last district vote. He buys his way into everything, and he drives like it. The coast has crests that launch you. Lift before them.', phone: true },
  { who: 'nova', text: 'The sea does not care about votes, Rookie. Mind the crests.', mood: 'smirk', if: 'replay' },
];

export const CLIFF_WIN: Line[] = [
  { who: 'calloway', text: 'Hm. I expected to enjoy that more. The vote is yours. Do not make me regret it.', mood: 'angry' },
  { who: 'calloway', text: 'My father wanted this vote to go to Dante. When you passed me, he sounded afraid. I have never heard that.', mood: 'worried' },
  { who: 'switch', text: 'Four districts, four votes. The Council meets tonight at the Wall. Come as you are.', mood: 'smirk' },
];

export const CLIFF_LOSE: Line[] = [
  { who: 'calloway', text: 'The coast always wins. Come back when you have learned to lift.', mood: 'smirk' },
];

export const CLIFF_LOSE_2: Line[] = [
  { who: 'nova', text: 'One run, no laps, no second chance on the road. Be calmer than the sea. Again.', mood: 'worried' },
];

export const CLIFF_LOSE_3: Line[] = [
  { who: 'calloway', text: 'Fine. Again. Honestly, I like having someone to race.', mood: 'worried' },
];
