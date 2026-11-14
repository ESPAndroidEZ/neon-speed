import type { Weather } from '../types/game';

export type Speaker = 'switch' | 'mara' | 'dante' | 'rookie' | 'vex' | 'kilo' | 'narrator';

export interface Line {
  who: Speaker;
  text: string;
  /** Shown as a phone call (Mara). */
  phone?: boolean;
}

export const SPEAKERS: Record<Speaker, { name: string; color: number }> = {
  switch: { name: 'DJ Switch', color: 0x18d8ff },
  mara: { name: 'Mara', color: 0xffb347 },
  dante: { name: 'Dante Voss', color: 0xff2a9d },
  rookie: { name: 'You', color: 0xe8e8ee },
  vex: { name: 'Vex', color: 0xc41a2b },
  kilo: { name: 'Kilo', color: 0xc41a2b },
  narrator: { name: '', color: 0xffffff },
};

export interface StoryEvent {
  id: string;
  title: string;
  blurb: string;
  kind: 'race' | 'drift';
  weather: Weather;
  /** Mid-race weather switch: after `at` seconds of racing. */
  weatherChange?: { at: number; to: Weather };
  laps: number;
  /** Force this car (id) for the event; otherwise the player's selected car. */
  carId?: string;
  rivals: string[];
  skillScale: number;
  /** Races: best allowed finishing position. Drift: unused. */
  needPosition: number;
  /** Drift events: points to bank to pass. */
  driftTarget?: number;
  /** One-off cash bonus for passing the first time. */
  bonus: number;
  /** Cars given when the event is passed. */
  unlocks: string[];
  /** Switch's one-line intro card shown at the countdown. */
  card: string;
  before: Line[];
  afterWin: Line[];
  afterLose: Line[];
}

export const OPENING_CAPTIONS: { at: number; dur: number; text: string; kind: 'switch' | 'lower' | 'title' }[] = [
  { at: 0.3, dur: 1.9, text: 'Kestrel Bay. Two a.m.', kind: 'switch' },
  { at: 2.4, dur: 1.8, text: "The rain doesn't wash anything clean here.", kind: 'switch' },
  { at: 4.2, dur: 4.2, text: "Honda Civic, “The Beater”", kind: 'lower' },
  { at: 4.4, dur: 2.0, text: 'Redline runs the Loop. Dante runs Redline.', kind: 'switch' },
  { at: 6.6, dur: 1.9, text: "And Mara's garage is three days from the bank.", kind: 'switch' },
  { at: 8.7, dur: 1.9, text: 'So tonight... you drive.', kind: 'switch' },
  { at: 9.4, dur: 2.1, text: "RACER'S BLOOD", kind: 'title' },
];

export const CHAPTER = { id: 1, title: 'Wet Asphalt', tagline: 'Every street remembers who bled for it.' };

export const INTRO_LINES: Line[] = [
  { who: 'narrator', text: 'Kestrel Bay: a port city that never fully dries out. Redline runs the streets. The first snow is coming.' },
  { who: 'mara', text: "Kid. Gearhead Garage, back of the docks. Bring the Civic. We've got three days before the bank takes it all.", phone: true },
];

export const EVENTS: StoryEvent[] = [
  {
    id: 'warmup', title: 'Warm-up Circuit', blurb: 'Dry streets, street rookies, and your beaten-up Civic. Finish top two.',
    kind: 'race', weather: 'CLEAR', laps: 2, carId: 'civic', rivals: ['tank', 'pixel', 'lola'], skillScale: 0.85, needPosition: 2, bonus: 1500, unlocks: [],
    card: "Warm-up lap. Don't embarrass yourself.",
    before: [
      { who: 'mara', text: "First lesson: the Civic is light. Brake early, throw it in, and use the handbrake to swing the tail. Drifting charges your nitro.", phone: true },
      { who: 'rookie', text: "Got it." },
    ],
    afterWin: [{ who: 'mara', text: "Not bad. That's the first cash. But the bank called again. Redline's lawyers are behind it.", phone: true }],
    afterLose: [{ who: 'mara', text: "Top two, kid. Again. And use the nitro.", phone: true }],
  },
  {
    id: 'dock', title: 'Dock Sprint', blurb: 'Rain. Short fuse. Brake earlier than you think. Finish top two.',
    kind: 'race', weather: 'RAIN', laps: 2, rivals: ['lola', 'rook', 'pixel', 'tank'], skillScale: 0.95, needPosition: 2, bonus: 3000, unlocks: ['350z'],
    card: 'Wet road, short fuse. Brake earlier than you think.',
    before: [
      { who: 'mara', text: "Rain tonight. Grip drops, drifts start easier and are harder to catch. Smooth hands.", phone: true },
      { who: 'dante', text: "A rookie in a Civic. How charming. Enjoy the dock, it will not be yours for long." },
    ],
    afterWin: [{ who: 'mara', text: "That's the money for the first payment. And take the 350Z out of the back: it's yours. Don't scratch it.", phone: true }],
    afterLose: [{ who: 'mara', text: "Wet roads punish pride. Go again.", phone: true }],
  },
  {
    id: 'drift', title: 'Drift Night', blurb: 'First snow. Sideways is the only way. Score 6,000 drift points in 3 laps.',
    kind: 'drift', weather: 'SNOW', laps: 3, rivals: [], skillScale: 1, needPosition: 99, driftTarget: 6000, bonus: 4000, unlocks: [],
    card: 'First snow. Sideways is the only way.',
    before: [
      { who: 'switch', text: "Snow on the docks, folks. Tonight nobody races. They put on a show." },
      { who: 'mara', text: "Points for angle and speed. Hit a wall and you lose the chain. Bank it before you lift.", phone: true },
    ],
    afterWin: [
      { who: 'mara', text: "The crowd loved it. The garage is two days from the bank, not three hours.", phone: true },
      { who: 'dante', text: "Pretty. Tomorrow night, the Loop. You and me. Bring the garage deeds, if you still have them." },
    ],
    afterLose: [{ who: 'mara', text: "Smaller angle, more speed, keep the throttle in. Again.", phone: true }],
  },
  {
    id: 'finale', title: 'Harbor Loop vs Dante', blurb: 'Last race. Rain turning to snow. Beat Dante and the garage is saved. You must win.',
    kind: 'race', weather: 'RAIN', weatherChange: { at: 75, to: 'SNOW' }, laps: 3, rivals: ['kilo', 'vex', 'dante'], skillScale: 1, needPosition: 1, bonus: 8000, unlocks: ['supra'],
    card: 'Last race. Last chance. Bring everything.',
    before: [
      { who: 'dante', text: "Eleven minutes to the green light. Do you know why they call me the Voss, rookie?" },
      { who: 'dante', text: "Because nobody ever sees the end of the street before I do." },
      { who: 'mara', text: "Don't listen to him. The Loop eats anyone who drives angry. Drive clean. Win.", phone: true },
    ],
    afterWin: [
      { who: 'dante', text: "Remarkable. The garage is yours. Keep it." },
      { who: 'dante', text: "Here. A key to the East Yard. Tomorrow the whole city will be watching." },
      { who: 'mara', text: "We kept the garage. I don't know how to thank you. Go be famous.", phone: true },
    ],
    afterLose: [{ who: 'dante', text: "Almost, rookie. Almost is what I collect.", }, { who: 'mara', text: "We have until Sunday. Breathe. Again.", phone: true }],
  },
];

export const ENDING = { title: 'Chapter 2: Short Tracks', text: 'Coming soon. Tell us what you thought of Chapter 1.', link: 'feedback link goes here' };

export const findEvent = (id: string): StoryEvent => EVENTS.find((e) => e.id === id) ?? EVENTS[0];
