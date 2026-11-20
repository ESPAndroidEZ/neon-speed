import type { Cutscene } from '../core/cutsceneTimeline';

/** Cutscenes of the story (docs/skills.md). Played by game/cutscene.ts in the showroom around the player's car. Spanish for every text is in i18n/esContentH.ts. */
export const CUTSCENES_A: Record<string, Cutscene> = {
  "ch2-open": {
    id: "ch2-open", title: "Redline Rising",
    card: { kicker: "CHAPTER 2", title: "REDLINE RISING" },
    shots: [
      { dur: 5, orbit: { center: [0, 0], r: [9, 7], angle: [-0.7, 0.3], h: [2.4, 1.5] }, look: [0, 0.9, 0], fov: [50, 46], ease: "sine", shake: 0.01 },
      { dur: 5, from: [-1.5, 1.5, 7], to: [-0.6, 1.5, 4.2], look: [-4, 1.5, 2], lookTo: [-4, 1.55, 2], fov: [40, 35], shake: 0.015 },
      { dur: 5, from: [3.2, 1.3, -5.2], to: [2.2, 1.3, -3.6], look: [0, 1.0, 0], lookTo: [-1, 1.2, 1], fov: [44, 40], shake: 0.012 },
      { dur: 5, from: [0, 1.4, 3.5], to: [0, 3.8, 11], look: [0, 1.0, 0], fov: [46, 56], ease: "sine" },
    ],
    actors: [
      { id: "dante", at: [-4, 2], face: [0, 0], clip: "armsCrossed", then: [[4.2, "talk"], [18, "armsCrossed"]] },
      { id: "rook", at: [3.6, -2.2], face: [0, 0], clip: "lean" },
    ],
    lines: [
      { at: 0.6, dur: 3.2, who: "narrator", text: "Kestrel Bay. One week after the Loop fell silent." },
      { at: 5.2, dur: 4.2, who: "dante", text: "No hard feelings, Rookie. You saved a garage. I am buying a city." },
      { at: 10.2, dur: 4, who: "rook", text: "He owns the tow trucks, the lamps and half the Council. Watch your back." },
      { at: 15, dur: 4, who: "narrator", text: "Tonight, the Loop gets its first permit problem." },
    ],
  },
  "ch2-council": {
    id: "ch2-council", title: "The Council",
    card: { kicker: "THE COUNCIL", title: "FOUR VOTES" },
    shots: [
      { dur: 6, orbit: { center: [0, 0], r: [11, 9], angle: [0, 1.5], h: [2.8, 1.8] }, look: [0, 1.0, 0], fov: [50, 44], ease: "sine", shake: 0.01 },
      { dur: 5, from: [0.5, 1.4, 4.5], to: [-1.4, 1.5, 2.2], look: [-4.2, 1.5, -1], lookTo: [-4.2, 1.55, -1], fov: [38, 34], shake: 0.012 },
      { dur: 5, from: [-1, 1.4, 3.8], to: [1.5, 1.5, 1.4], look: [4.6, 1.5, -1.6], lookTo: [4.6, 1.55, -1.6], fov: [38, 34], shake: 0.012 },
      { dur: 6, from: [0, 1.8, 8], to: [0, 4, 14], look: [0, 1.2, 2], lookTo: [0, 1.4, 3], fov: [48, 56], ease: "sine" },
    ],
    actors: [
      { id: "nova", at: [-4.2, -1], face: [0, 0], clip: "armsCrossed", then: [[7.5, "talk"], [11, "armsCrossed"]] },
      { id: "brick", at: [4.6, -1.6], face: [0, 0], clip: "armsCrossed", then: [[12, "talk"], [16, "armsCrossed"]] },
      { id: "calloway", at: [-2, 5.4], face: [0, 0], clip: "lean" },
      { id: "dante", at: [3, 5.6], face: [0, 0], clip: "armsCrossed", then: [[18, "talk"]] },
    ],
    lines: [
      { at: 0.5, dur: 4.5, who: "switch", text: "Four districts, four votes, one Wall. Kestrel Bay, listen close." },
      { at: 6.5, dur: 3.8, who: "nova", text: "The Neon Strip votes with the Rookie." },
      { at: 11.5, dur: 3.8, who: "brick", text: "The docks stay with whoever drives clean." },
      { at: 16.2, dur: 2.4, who: "calloway", text: "The north coast has not decided." },
      { at: 18.6, dur: 3.3, who: "dante", text: "Gentlemen, the Wall is not a toy. Let us see who deserves it." },
    ],
  },
  "ch3-open": {
    id: "ch3-open", title: "The Lighthouse",
    card: { kicker: "CHAPTER 3", title: "BLOOD ON THE WALL" },
    shots: [
      { dur: 6, orbit: { center: [0, 0], r: [8, 6.5], angle: [2.6, 3.5], h: [1.9, 1.4] }, look: [0, 1.0, 0], fov: [50, 44], ease: "sine", shake: 0.01 },
      { dur: 5, from: [-1.2, 1.35, 3.4], to: [-1.6, 1.3, 2.4], look: [-3, 1.3, 1], lookTo: [-3, 1.25, 1], fov: [34, 30], shake: 0.02 },
      { dur: 5, from: [1, 1.4, -0.5], to: [1.6, 1.4, -1.4], look: [3, 1.4, -2.5], lookTo: [3, 1.4, -2.5], fov: [40, 36], shake: 0.015 },
      { dur: 5, from: [0, 1.5, 3], to: [0, 4, 10], look: [0, 1.0, 0], fov: [46, 54], ease: "sine" },
    ],
    actors: [
      { id: "cain", at: [-3, 1], face: [0, 0], clip: "idle", then: [[4.5, "talk"], [11, "idle"]] },
      { id: "mara", at: [3, -2.5], face: [0, 0], clip: "phone" },
    ],
    lines: [
      { at: 0.6, dur: 3.6, who: "narrator", text: "The lighthouse, twelve years after the crash." },
      { at: 5.5, dur: 4.2, who: "cain", text: "I watched my own brake lights go dark from this window." },
      { at: 10, dur: 4, who: "cain", text: "This line did not wear through. It was cut." },
      { at: 15, dur: 4.5, who: "mara", text: "He showed me this morning. Tonight, drive it for him." },
    ],
  },
};
