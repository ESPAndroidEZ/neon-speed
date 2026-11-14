import type { Weather } from '../types/game';

export type Speaker = 'switch' | 'mara' | 'dante' | 'rookie' | 'vex' | 'jinx' | 'tank' | 'cain' | 'narrator';

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
  vex: { name: 'Vex', color: 0x7a2fd6 },
  jinx: { name: 'Jinx', color: 0x39ff88 },
  tank: { name: 'Tank', color: 0x8a8f99 },
  cain: { name: 'Cain Vega', color: 0xffd27d },
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
  { who: 'narrator', text: 'Kestrel Bay. The docks are quiet by day. At night, the Harbor Loop wakes up.' },
  { who: 'mara', text: "Kid. Gearhead Garage, back of the docks. That Civic in the corner was my brother's first car. Cain's. I rebuilt it from the frame up.", phone: true },
  { who: 'mara', text: "I watched you drive on the way in. You've got his feel. Here. The keys are yours. The bank takes the garage in three days.", phone: true },
];

export const EVENTS: StoryEvent[] = [
  {
    id: 'warmup', title: 'Warm-up Circuit', blurb: 'Dry streets, street rookies, and Cain\u2019s old Civic. Finish top two and earn your first red hand.',
    kind: 'race', weather: 'CLEAR', laps: 2, carId: 'civic', rivals: ['pixel', 'lola', 'rook'], skillScale: 0.85, needPosition: 2, bonus: 1500, unlocks: [],
    card: "Warm-up lap. Don't embarrass yourself.",
    before: [
      { who: 'mara', text: "Cain taught me one thing about this car: it's light, so brake early, throw it in, and use the handbrake to swing the tail. Drifting charges your nitro.", phone: true },
      { who: 'rookie', text: 'Got it.' },
      { who: 'switch', text: "Fresh rubber on the Loop tonight, folks. Somebody's driving a ghost. Keep your eyes open." },
    ],
    afterWin: [{ who: 'mara', text: "Not bad. That's the first cash, and your first red hand on the wall. But the bank called again. Redline's lawyers are behind it.", phone: true }],
    afterLose: [{ who: 'mara', text: "Top two, kid. Again. And use the nitro.", phone: true }],
  },
  {
    id: 'dock', title: 'Dock Sprint', blurb: 'Rain. Jinx lives for this. Brake earlier than you think. Finish top two.',
    kind: 'race', weather: 'RAIN', laps: 2, rivals: ['jinx', 'tank', 'rook', 'pixel'], skillScale: 0.95, needPosition: 2, bonus: 3000, unlocks: ['350z'],
    card: 'Wet road, short fuse. Brake earlier than you think.',
    before: [
      { who: 'mara', text: "Rain tonight. Grip drops, drifts start easier and are harder to catch. Smooth hands. And watch Jinx: she was born in a puddle.", phone: true },
      { who: 'dante', text: "A rookie in Cain's old Civic. How sentimental. Enjoy the docks. Redline Holdings closes on them Friday." },
    ],
    afterWin: [{ who: 'mara', text: "That's the money for the first payment. And take the 350Z out of the back: it's yours. Don't scratch it.", phone: true }],
    afterLose: [{ who: 'mara', text: 'Wet roads punish pride. Go again.', phone: true }],
  },
  {
    id: 'drift', title: 'Drift Night', blurb: 'First snow. Sideways is the only way. Score 6,000 drift points in 3 laps.',
    kind: 'drift', weather: 'SNOW', laps: 3, rivals: [], skillScale: 1, needPosition: 99, driftTarget: 6000, bonus: 4000, unlocks: [],
    card: 'First snow. Sideways is the only way.',
    before: [
      { who: 'switch', text: 'Snow on the docks, folks. Tonight nobody races. They put on a show. Vex is already warming up the tyres.' },
      { who: 'mara', text: "Points for angle and speed. Hit a wall and you lose the chain. Bank it before you lift. Cain used to say the road writes its name on you.", phone: true },
    ],
    afterWin: [
      { who: 'mara', text: 'The crowd loved it. The garage is two days from the bank, not three hours.', phone: true },
      { who: 'dante', text: 'Pretty. Tomorrow night, the Loop. You and me. Bring the garage deeds, if you still have them.' },
    ],
    afterLose: [{ who: 'mara', text: 'Smaller angle, more speed, keep the throttle in. Again.', phone: true }],
  },
  {
    id: 'finale', title: 'Harbor Loop vs Dante', blurb: 'Last race. Rain turning to snow. Beat Dante and the garage is saved. You must win.',
    kind: 'race', weather: 'RAIN', weatherChange: { at: 75, to: 'SNOW' }, laps: 3, rivals: ['vex', 'jinx', 'tank', 'dante'], skillScale: 1, needPosition: 1, bonus: 8000, unlocks: ['supra'],
    card: 'Last race. Last chance. Bring everything.',
    before: [
      { who: 'dante', text: "Do you know why I kept the Red Hand Wall, rookie? Because every name on it is a street I now own." },
      { who: 'dante', text: "Cain taught me everything. Then he crashed, and I learned what he never would: a street is only worth what it pays." },
      { who: 'mara', text: "Don't listen to him. The Loop eats anyone who drives angry. Drive clean. Win it for Cain.", phone: true },
    ],
    afterWin: [
      { who: 'dante', text: 'Remarkable. The garage is yours. Keep it.' },
      { who: 'dante', text: 'Here. A key to the East Yard. Tomorrow the whole city will be watching.' },
      { who: 'mara', text: "We kept the garage. I don't know how to thank you.", phone: true },
      { who: 'switch', text: 'Kestrel Bay, this is DJ Switch, one last time from the crane cab. A hand just went up on the wall.' },
      { who: 'switch', text: "Mara. You can stop looking. I never left. Twelve years of listening to every engine on this street, and tonight I finally heard his driving again." },
      { who: 'cain', text: "It's me. Cain. Tell the Rookie the Loop has a new legend. And Mara: I'm sorry I stayed quiet so long." },
    ],
    afterLose: [{ who: 'dante', text: 'Almost, rookie. Almost is what I collect.' }, { who: 'mara', text: 'We have until Sunday. Breathe. Again.', phone: true }],
  },
];

export const ENDING = { title: 'Chapter 2: Short Tracks', text: 'Coming soon. Tell us what you thought of Chapter 1.', link: 'feedback link goes here' };

export const findEvent = (id: string): StoryEvent => EVENTS.find((e) => e.id === id) ?? EVENTS[0];
