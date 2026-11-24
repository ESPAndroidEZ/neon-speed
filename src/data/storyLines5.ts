import type { Line } from './story';

/** Chapter 5 "The Bay Bridge": dialogue. Spanish for every line is in i18n/esContentL.ts (keyed by the English text). */

export const KEY_BEFORE: Line[] = [
  { who: "pixel", text: "One night, Rookie. Dante signs for the Wall at dawn. I read every old post on the Loop forum and one of them says the archive key is taped under the drift ring's lamp.", mood: "worried" },
  { who: "pixel", text: "The lamp only drops when the whole ring is slid clean. I cannot do that. You can." },
  { who: "mara", text: "The archive in the lighthouse holds the truth about the crash. Get that key, then come home alive.", phone: true, mood: "worried" },
];
export const KEY_WIN: Line[] = [
  { who: "pixel", text: "A brass key and a note in Cain's handwriting: LIGHTHOUSE, TOP SHELF. Somebody wanted this found." },
  { who: "mara", text: "Then somebody is on our side. Keep moving. The night is short.", phone: true },
];
export const KEY_LOSE: Line[] = [{ who: "pixel", text: "The lamp did not drop. Wider angle, longer slide, again." }];
export const KEY_LOSE_2: Line[] = [{ who: "nova", text: "Do not fight the ring. Let the tail swing and feed the throttle." }];
export const KEY_LOSE_3: Line[] = [{ who: "switch", text: "A drift is a conversation with the road. Try listening this time." }];

export const WREN_BEFORE: Line[] = [
  { who: "wren", text: "You drive like him. The same line into the first hairpin, the same hands. I rode with Cain twelve years ago. Tonight I ride with you.", mood: "worried" },
  { who: "mara", text: "Wren? Cain's Wren? He never said a word to me in twelve years. Why now?", phone: true, mood: "worried" },
  { who: "wren", text: "Because tonight the road runs out. I will call your corners the way I called his. Eyes up. Trust the voice." },
];
export const WREN_WIN: Line[] = [
  { who: "wren", text: "You did not lift where he would have lifted. He would have liked that." },
  { who: "wren", text: "The archive is in the lighthouse and Dante knows it. Race the coast road before he gets there." },
];
export const WREN_LOSE: Line[] = [{ who: "wren", text: "Late on the brakes. The mountain does not forgive. Again." }];
export const WREN_LOSE_2: Line[] = [{ who: "wren", text: "Hairpin left, then right. Count it out loud, Rookie." }];
export const WREN_LOSE_3: Line[] = [{ who: "rook", text: "Wren never talks. Do not waste it. Go again." }];

export const COAST_BEFORE: Line[] = [
  { who: "calloway", text: "I own the coast road and I hold the lighthouse keys. My father's name is on that brake line and I want it off.", mood: "worried" },
  { who: "calloway", text: "I am not your ally because I like you. We want the same truth.", if: "public" },
  { who: "calloway", text: "You traded the evidence away. I still have the keys, and I do not sell. Win the coast and we talk.", unless: "public", mood: "angry" },
  { who: "wren", text: "He is the last driver between us and the lighthouse. Beat him cleanly." },
];
export const COAST_WIN: Line[] = [
  { who: "calloway", text: "Fair. The gate is open, Rookie. Take the old road up. I will keep Dante's men busy.", if: "public" },
  { who: "calloway", text: "You earned the keys. Do not make me regret handing them to a seller.", unless: "public" },
  { who: "wren", text: "The bridge is next. Redline closes it at midnight." },
];
export const COAST_LOSE: Line[] = [{ who: "calloway", text: "The coast is mine until you prove otherwise. Again." }];
export const COAST_LOSE_2: Line[] = [{ who: "wren", text: "He brakes late and runs wide at the lighthouse. Wait for that." }];
export const COAST_LOSE_3: Line[] = [{ who: "switch", text: "Salt, wind and a rival who grew up here. Make it a fair fight." }];

export const BRIDGE_BEFORE: Line[] = [
  { who: "pixel", text: "Redline is closing the Bay Bridge at midnight. Cross it first, and the lighthouse is yours. I will keep the chat on the cameras.", mood: "worried" },
  { who: "rook", text: "I know their trucks. Three on the approach, two at the span. And rain is coming, then snow." },
  { who: "wren", text: "One bridge, one chance. Do not look at the water." },
];
export const BRIDGE_WIN: Line[] = [
  { who: "pixel", text: "You crossed it! Redline's trucks are stuck behind you. The lighthouse is two minutes up the road." },
  { who: "wren", text: "Dawn is close. Dante will meet us on the Loop, not on the cliff. He wants a crowd." },
];
export const BRIDGE_LOSE: Line[] = [{ who: "rook", text: "The span ices first. Ease into it." }];
export const BRIDGE_LOSE_2: Line[] = [{ who: "pixel", text: "I rewound the cameras. You lost it at the second joint. Go again." }];
export const BRIDGE_LOSE_3: Line[] = [{ who: "mara", text: "Breathe. It is only a bridge. Come back to me in one piece.", phone: true }];

export const DAWN_BEFORE: Line[] = [
  { who: "dante", text: "I never wanted the Wall, Rookie. I wanted the Loop safe. Twelve years ago I found the cut line and I swore nobody would die for this street again.", mood: "worried" },
  { who: "wren", text: "Enough, Dante. The line was mine. I staged the crash. The plan was an empty car through the rail, so Redline's buyout would die with Cain.", mood: "worried" },
  { who: "cain", text: "I took the Civic out early, Wren. I always did. You carried my crash for twelve years and never said a word.", mood: "worried" },
  { who: "wren", text: "I have said it now. Let the street decide what it forgives." },
  { who: "dante", text: "Then race for it. The Harbor Loop at dawn, the whole city watching. Win, and the Wall is the street's.", mood: "smirk" },
];
export const DAWN_WIN: Line[] = [
  { who: "dante", text: "Clean. Cain taught you well, and so did Wren. The Wall is yours to keep." },
  { who: "cain", text: "One more lap, Rookie. Dawn is a good time to drive." },
  { who: "mara", text: "You did it. Come home, and bring them all.", phone: true },
];
export const DAWN_LOSE: Line[] = [{ who: "dante", text: "Not yet. The Loop has waited twelve years. It can wait one more lap." }];
export const DAWN_LOSE_2: Line[] = [{ who: "cain", text: "Use the whole road. I call your corners, you drive them." }];
export const DAWN_LOSE_3: Line[] = [{ who: "wren", text: "Breathe in on the straight. Everything else is already in your hands." }];
