/** World lore: title cards, crew bios and loading tips. Text only; no brand names. */

export interface TitleCard {
  heading: string;
  text: string;
}

/** "Previously in Kestrel Bay": skippable cards before the first intro cinematic. */
export const PREVIOUSLY: TitleCard[] = [
  { heading: 'Kestrel Bay', text: 'A port city. When the container trade left, the docks emptied. Then the engines came.' },
  { heading: 'The Harbor Loop', text: 'Kids spray-painted a circuit through the streets and the empty quays. Winners press a red-painted hand on the wall at the finish line. The Red Hand Wall.' },
  { heading: 'Cain Vega', text: 'The Loop’s first legend vanished after a crash at the docks twelve years ago. Everyone thinks he is gone.' },
  { heading: 'Dante Voss', text: 'Cain’s protege and rival turned the Redline crew into Redline Holdings. He is buying the docks, the debt, and the Loop itself, to turn it into a private sponsored circuit and erase the street scene.' },
];

export interface CrewEntry {
  id: string;
  name: string;
  role: string;
  bio: string;
  /** Shown instead of `bio` once the chapter ending has been seen (spoiler gate). */
  revealed?: string;
  /** Shown once the whole story is complete (second spoiler gate). */
  truth?: string;
  color: number;
  /** Career flag that shows this entry (spoiler gate for people who arrive later in the story). */
  gate?: string;
}

export const CREW: CrewEntry[] = [
  { id: 'rookie', name: 'The Rookie', role: 'You', color: 0xe8e8ee, bio: 'Arrived with nothing but a car and a feel for the road. Mara swears you drive just like someone she used to know.', truth: 'Learned to drive from a voice on the radio. The voice was Cain’s, and every lesson was meant for someone else.' },
  { id: 'mara', name: 'Mara Vega', role: 'Gearhead Garage', color: 0xffb347, bio: 'Cain’s sister. Rebuilt his old Civic from the frame up and gave you the keys. Her garage is three days from the bank.', truth: 'Forgave her brother slowly, one lap at a time. The garage still smells of his first car.' },
  { id: 'cain', name: 'Cain Vega', role: 'The first legend', color: 0xffd27d, bio: 'Founded the Harbor Loop. Vanished after a crash at the docks twelve years ago. The Red Hand Wall started with his handprint.', revealed: 'Never left. Twelve years of listening to every engine on the street, from a crane cab above the docks.' },
  { id: 'dante', name: 'Dante Voss', role: 'Redline Holdings', color: 0xff2a9d, bio: 'Cain’s protege. Calm, polite, ruthless. Drives a black and gold RX-7. Owns the debt on the garage, and most of the docks.', truth: 'Prepared Cain’s car the night of the crash and found the cut line. He kept silent to protect everyone, and built a cage of rules around the Loop out of guilt.' },
  { id: 'switch', name: 'DJ Switch', role: 'Pirate radio', color: 0x18d8ff, bio: 'Broadcasts from a crane cab above the docks. Knows every driver, every shortcut and every secret in Kestrel Bay.', revealed: 'Cain Vega. He gave up the wheel and kept the street alive over the air.' },
  { id: 'jinx', name: 'Jinx', role: 'Evo, rain specialist', color: 0x39ff88, bio: 'Grew up in the flood district, where the pumps were sold off. She races the rain because it can no longer drown her.' },
  { id: 'tank', name: 'Tank', role: 'Supra, heavy hitter', color: 0x8a8f99, bio: 'Ten years of dock wages went into that Supra. He never pushes anyone. He just does not move.' },
  { id: 'nova', name: 'Nova', role: 'Neon Strip drift queen', color: 0xff4fa3, bio: 'Turns every wet boulevard into her slide. Redline pays her, but she does not like being owned.' },
  { id: 'brick', name: 'Brick', role: 'Dock union, Evo', color: 0xc77b1a, bio: 'Runs the port yard. Never lifts, never moves over, and always keeps his word.' },
  { id: 'calloway', name: 'Calloway', role: 'Owns the Cliffside', color: 0xdfe6f2, bio: 'Heir to the north coast. He paid for every metre of guard rail and drives like he owns the sea.', truth: 'Heir to the man who cut the line. He did not know. He is the one who walked to the lawyers.' },
  { id: 'pixel', name: 'Pixel', role: 'Streamer, hatchback', color: 0x6cf2ff, bio: 'Streams every race to a chat that never sleeps. Drives like someone who is being watched, which is always.' },
  { id: 'lola', name: 'Lola', role: 'Dock runner', color: 0xff7aa8, bio: 'Grew up on the quays. She knows every puddle, every loose plate and which crane light is broken.', truth: 'Saw a man in a grey coat under Cain’s car at Quay 9 when she was ten. She kept it secret for twelve years.' },
  { id: 'rook', name: 'Rook', role: 'Ex-Redline driver', color: 0x9aa4b2, bio: 'Left Redline Holdings on bad terms and keeps one eye on the black and gold RX-7 at all times.' },
  { id: 'adeyemi', name: 'Madame Adeyemi', role: 'The Broker', color: 0xe6b84a, gate: 'c3Seen', bio: 'Buys what people love and keeps it quiet. Polite, patient, and the newest owner of the harbour.' },
  { id: 'wren', name: 'Wren', role: 'Veteran driver', color: 0xb8c4d6, gate: 'c4Seen', bio: 'Drove beside Cain twelve years ago and has spoken to almost nobody since. Short sentences, long memory, and a coat that has seen every night of the Loop.' },
  { id: 'vex', name: 'Vex', role: '350Z, drifter', color: 0x7a2fd6, bio: 'Lives sideways. Redline pays for the tyres, and Vex pretends not to notice the leash.' },
];

import { TIPS as BASE_TIPS } from './tips';
import { TIPS_2 } from './tips2';

/** Loading-screen tips: the base set plus the new maps. */
export const TIPS: string[] = [...BASE_TIPS, ...TIPS_2];
