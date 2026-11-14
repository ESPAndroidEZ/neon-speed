import type { StoryEvent } from './story';

/** Chapter 2, part two: the yard drift night, the Cliffside Run and the finale with its branching choice. */
export const EVENTS_2B: StoryEvent[] = [
  {
    id: 'c2-yard', chapter: 2, trackId: 'maze-drift', title: 'Yard Drift Night', blurb: 'After hours in the Maze. No rivals: 12,000 drift points to win the dock crews.',
    kind: 'drift', weather: 'RAIN', laps: 3, rivals: [], skillScale: 1, needPosition: 99, driftTarget: 12000, bonus: 6000, unlocks: [],
    card: 'Rain on steel. Draw lines between the stacks.',
    before: [
      { who: 'brick', text: 'The crews want a show. Anyone can win a race. Show them something that only you can do.', mood: 'smirk' },
      { who: 'mara', text: 'Smooth entries. Every wall you touch ends the chain. Cain used to say the cleanest slides sound like nothing at all.', phone: true },
    ],
    afterWin: [{ who: 'brick', text: 'The yard stands with you. Redline cannot buy a crowd that sings.', mood: 'smirk' }],
    afterLose: [{ who: 'mara', text: 'More speed in, less angle. Let the rain do the work.', phone: true }],
  },
  {
    id: 'c2-cliff', chapter: 2, trackId: 'cliff', title: 'Cliffside Run', blurb: 'The north coast. Calloway owns the road, the rail and the view. One run to the finish. Win it.',
    kind: 'race', weather: 'CLEAR', weatherChange: { at: 35, to: 'SNOW' }, laps: 1, rivals: ['calloway', 'nova', 'jinx'], skillScale: 1, needPosition: 1, bonus: 10000, unlocks: [],
    card: 'No laps. No second chances. Mind the edge.',
    before: [
      { who: 'calloway', text: 'My road. My rules. I paid for every metre of that guard rail, so please try not to break it.', mood: 'smirk' },
      { who: 'mara', text: 'Calloway is the last district vote. He buys his way into everything, and he drives like it. The coast has crests that launch you. Lift before them.', phone: true },
      { who: 'switch', text: 'One run from the lighthouse to the pier. Weather is coming off the sea. Be there before it is.', mood: 'worried' },
    ],
    afterWin: [
      { who: 'calloway', text: 'Hm. I expected to enjoy that more. The vote is yours. Do not make me regret it.', mood: 'angry' },
      { who: 'switch', text: 'Four districts, four votes. The Council meets tonight at the Wall. Come as you are.', mood: 'smirk' },
    ],
    afterLose: [{ who: 'calloway', text: 'The coast always wins. Come back when you have learned to lift.', mood: 'smirk' }],
  },
  {
    id: 'c2-final', chapter: 2, title: 'The Open Loop', blurb: 'The Council meets at the Wall. Two doors, one race. Win it for the street.',
    kind: 'race', weather: 'RAIN', weatherChange: { at: 90, to: 'SNOW' }, laps: 3, rivals: ['dante', 'calloway', 'nova', 'brick'], skillScale: 1.02, needPosition: 2, bonus: 12000, unlocks: [],
    card: 'Whatever you choose tonight, the street will remember.',
    before: [
      { who: 'mara', text: 'Everyone is at the Wall. Dante has an offer. Switch has another. They want your answer before the lights.', phone: true, mood: 'worried' },
      {
        who: 'dante', mood: 'smirk', text: 'A sponsorship, rookie. A garage that never worries about the bank, a pit crew, a season. The Loop gets rules, and rules keep people alive. All I ask is the livery.',
        choice: {
          prompt: 'The Council wants your answer.',
          options: [
            { label: 'Open the Loop to everyone', set: { open: true }, rel: { cain: 2, mara: 1, dante: -2, nova: 1 }, reply: [{ who: 'rookie', text: 'No livery. No door fees. Anyone with a car and a reason.' }, { who: 'switch', text: 'That is the answer I was waiting twelve years for.', mood: 'smirk' }, { who: 'dante', text: 'Then you will race me for it. Rain turning to snow. I will be gentle.', mood: 'angry' }] },
            { label: 'Accept Redline’s sponsorship', set: { sponsor: true }, rel: { dante: 2, mara: -1, cain: -2, brick: 1 }, reply: [{ who: 'rookie', text: 'I take the offer. The garage lives. The Loop gets a season.' }, { who: 'mara', text: 'I hope you know what you just signed, kid.', phone: true, mood: 'worried' }, { who: 'dante', text: 'Then race me, and we will make the first page of it.', mood: 'smirk' }] },
          ],
        },
      },
    ],
    afterWin: [
      { who: 'switch', if: 'open', text: 'The Loop is open, Kestrel Bay. Free for every driver, every car. Not a sponsor in sight.', mood: 'smirk' },
      { who: 'dante', if: 'open', text: 'Open streets are dangerous streets. I will be watching. Politely.', mood: 'angry' },
      { who: 'mara', if: 'open', text: 'They are queueing at the garage. The Loop will be messier than ever. I could not be prouder.', phone: true, mood: 'smirk' },
      { who: 'dante', if: 'sponsor', text: 'A signature and a win. Redline Racing begins tonight. The livery suits you.', mood: 'smirk' },
      { who: 'switch', if: 'sponsor', text: 'Kestrel Bay, a new team in black and gold. Good luck to them. I am still listening.', mood: 'worried' },
      { who: 'mara', if: 'sponsor', text: 'The garage is safe. I am proud of you. I also do not like it.', phone: true, mood: 'worried' },
      { who: 'cain', text: 'Rookie. Meet me at the lighthouse before dawn. The crash was never an accident, and I finally have the proof.', mood: 'angry' },
    ],
    afterLose: [{ who: 'dante', text: 'Close. The council will wait until tomorrow. Think about the offer.', mood: 'smirk' }, { who: 'mara', text: 'Breathe. Whichever door you chose, you still have the street.', phone: true }],
  },
];
