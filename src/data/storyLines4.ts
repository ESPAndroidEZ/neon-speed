import type { Line } from './story';

/** Chapter 4 "Neon Harbor": dialogue. Spanish for every line is in i18n/esContentJ.ts (keyed by the English text). */

export const YARD_BEFORE: Line[] = [
  { who: "pixel", text: "Welcome to the harbour, Rookie. I run the yard crew now. Two years ago I was the kid with a laptop. Look at me.", mood: "smirk" },
  { who: "pixel", text: "Somebody is buying the docks, one container yard at a time. The buyer hides behind a company with no face. The Loop is next." },
  { who: "mara", text: "The garage is two streets from the quay. If the docks go, we go. Race the yard for us.", phone: true, mood: "worried" },
];
export const YARD_WIN: Line[] = [
  { who: "pixel", text: "Clean lap, wet stacks, no mirrors left behind. The crew is yours tonight." },
  { who: "pixel", text: "The buyer is called Madame Adeyemi. People call her the Broker. She wants to meet you." },
];
export const YARD_LOSE: Line[] = [{ who: "pixel", text: "Containers do not move, Rookie. You do. Try the inside line." }];
export const YARD_LOSE_2: Line[] = [{ who: "jinx", text: "You braked in the corner. Never brake in the corner. Again." }];
export const YARD_LOSE_3: Line[] = [{ who: "switch", text: "Wet steel and a crowd. Breathe, then go again." }];

export const CRANE_BEFORE: Line[] = [
  { who: "adeyemi", text: "You are the one who saved the Wall. I admire that. I buy things people love, and I keep them safe. Safe means quiet.", mood: "smirk" },
  { who: "adeyemi", text: "Tonight is a courtesy. Slide the cranes for me. If you are as good as they say, I will let the Loop live a little longer." },
  { who: "pixel", text: "She is nice, and that is the problem. Do not sign anything. Just drift.", mood: "worried" },
];
export const CRANE_WIN: Line[] = [
  { who: "adeyemi", text: "Beautiful. The cranes have not looked this alive in years. Remember this feeling when my offer arrives." },
  { who: "cain", text: "I heard it on the radio, every drift. Do not sell the sound of that." },
];
export const CRANE_LOSE: Line[] = [{ who: "adeyemi", text: "Not quite. The lights were waiting for you. Again, please." }];
export const CRANE_LOSE_2: Line[] = [{ who: "nova", text: "Hold the angle and feed the throttle. The harbour forgives a long slide." }];
export const CRANE_LOSE_3: Line[] = [{ who: "switch", text: "The cranes are patient. So are you. One more." }];

export const CLIFF_BEFORE: Line[] = [
  { who: "pixel", text: "I found her books. Adeyemi pays the harbour guards, the inspectors, even the Council. Cain's old tape is on a drive in the cliff lodge.", mood: "worried" },
  { who: "rook", text: "The cliff road is the only way up in the rain. Her people will be on it too. Be there first." },
  { who: "mara", text: "Whatever is on that drive, bring it back. Do not play the hero.", phone: true },
];
export const CLIFF_WIN: Line[] = [
  { who: "pixel", text: "I have the drive. It lists every payment, every name. Some of them are friends of yours." },
  { who: "rook", text: "Then the Broker made a mistake. She wrote it all down." },
];
export const CLIFF_LOSE: Line[] = [{ who: "rook", text: "The cliff does not wait. Tighter through the first bend." }];
export const CLIFF_LOSE_2: Line[] = [{ who: "mara", text: "Slow in, fast out. The edge is not a shortcut.", phone: true }];
export const CLIFF_LOSE_3: Line[] = [{ who: "switch", text: "Rain on the cliff. This is why they call it the road for the brave." }];

export const BROKER_BEFORE: Line[] = [
  { who: "adeyemi", text: "I read your drive, Rookie. Everything on it is true. So let us settle it the way this city settles things: on the Neon Strip, in front of everyone.", mood: "smirk" },
  { who: "dante", text: "Win, and the Loop stays open and her list goes public. Lose, and Redline sells the Strip. I am sorry it has come to this.", mood: "worried" },
  { who: "pixel", text: "Every crew in the harbour is on the grid behind you. Do not look back. Drive." },
];
export const BROKER_WIN: Line[] = [
  { who: "adeyemi", text: "Well. I have lost races before. I have never lost a city. Enjoy the harbour, Rookie, while it is yours." },
  { who: "mara", text: "You did it. The whole bay saw you do it.", phone: true },
];
export const BROKER_LOSE: Line[] = [{ who: "dante", text: "Not enough. One more lap of nerve, Rookie." }];
export const BROKER_LOSE_2: Line[] = [{ who: "cain", text: "Use the lights. They are on your side. I call your corners." }];
export const BROKER_LOSE_3: Line[] = [{ who: "pixel", text: "I counted every position. You are closer than you think." }];
