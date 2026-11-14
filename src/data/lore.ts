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
  { heading: 'Mara Vega', text: 'Cain’s sister runs Gearhead Garage. Three days from foreclosure. One beat-up Civic in the back, her brother’s first car.' },
];

export interface CrewEntry {
  id: string;
  name: string;
  role: string;
  bio: string;
  /** Shown instead of `bio` once the chapter ending has been seen (spoiler gate). */
  revealed?: string;
  color: number;
}

export const CREW: CrewEntry[] = [
  { id: 'rookie', name: 'The Rookie', role: 'You', color: 0xe8e8ee, bio: 'Arrived with nothing but a car and a feel for the road. Mara swears you drive just like someone she used to know.' },
  { id: 'mara', name: 'Mara Vega', role: 'Gearhead Garage', color: 0xffb347, bio: 'Cain’s sister. Rebuilt his old Civic from the frame up and gave you the keys. Her garage is three days from the bank.' },
  { id: 'cain', name: 'Cain Vega', role: 'The first legend', color: 0xffd27d, bio: 'Founded the Harbor Loop. Vanished after a crash at the docks twelve years ago. The Red Hand Wall started with his handprint.', revealed: 'Never left. Twelve years of listening to every engine on the street, from a crane cab above the docks.' },
  { id: 'dante', name: 'Dante Voss', role: 'Redline Holdings', color: 0xff2a9d, bio: 'Cain’s protege. Calm, polite, ruthless. Drives a black and gold RX-7. Owns the debt on the garage, and most of the docks.' },
  { id: 'switch', name: 'DJ Switch', role: 'Pirate radio', color: 0x18d8ff, bio: 'Broadcasts from a crane cab above the docks. Knows every driver, every shortcut and every secret in Kestrel Bay.', revealed: 'Cain Vega. He gave up the wheel and kept the street alive over the air.' },
  { id: 'jinx', name: 'Jinx', role: 'Evo, rain specialist', color: 0x39ff88, bio: 'Aggressive, loves a wet road, and will trade paint to win.' },
  { id: 'tank', name: 'Tank', role: 'Supra, heavy hitter', color: 0x8a8f99, bio: 'A freight train in a sports car. Late on the brakes, impossible to push around.' },
  { id: 'pixel', name: 'Pixel', role: 'Streamer, hatchback', color: 0x6cf2ff, bio: 'Streams every race to a chat that never sleeps. Drives like someone who is being watched, which is always.' },
  { id: 'lola', name: 'Lola', role: 'Dock runner', color: 0xff7aa8, bio: 'Grew up on the quays. She knows every puddle, every loose plate and which crane light is broken.' },
  { id: 'rook', name: 'Rook', role: 'Ex-Redline driver', color: 0x9aa4b2, bio: 'Left Redline Holdings on bad terms and keeps one eye on the black and gold RX-7 at all times.' },
  { id: 'vex', name: 'Vex', role: '350Z, drifter', color: 0x7a2fd6, bio: 'Lives sideways. Redline pays for the tyres.' },
];

export { TIPS } from './tips';
