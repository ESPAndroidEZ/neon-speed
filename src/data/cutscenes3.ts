import type { Cutscene } from '../core/cutsceneTimeline';

/** Cutscenes of the Season 2 arc (Chapters 4 and 5, docs/story.md). Spanish for every text is in i18n/esContentL.ts. */
export const CUTSCENES_C: Record<string, Cutscene> = {
  "prologue": {
    id: "prologue", title: "Before the Wall",
    card: { kicker: "PROLOGUE", title: "BEFORE THE WALL" },
    shots: [
      { dur: 5.5, orbit: { center: [0, 0], r: [9, 7.5], angle: [-0.4, 0.5], h: [1.6, 1.3] }, look: [0, 0.9, 0], fov: [48, 44], ease: "sine", shake: 0.01 },
      { dur: 5.5, from: [-1.2, 1.4, 3.6], to: [-1.8, 1.4, 2.6], look: [-3, 1.4, 1.5], lookTo: [-3, 1.4, 1.5], fov: [36, 32], shake: 0.015 },
      { dur: 5.5, from: [1.5, 1.4, -0.5], to: [2, 1.4, -1.4], look: [3, 1.4, -2], lookTo: [3, 1.4, -2], fov: [38, 34], shake: 0.015 },
      { dur: 5.5, from: [0, 1.5, 3.2], to: [0, 4.5, 11], look: [0, 1.0, 0], fov: [46, 56], ease: "sine" },
    ],
    actors: [
      { id: "cain", at: [-3, 1.5], face: [0, 0], clip: "lean", then: [[4, "talk"], [9, "lean"], [13, "talk"], [16, "idle"]] },
      { id: "wren", at: [3, -2], face: [0, 0], clip: "armsCrossed", then: [[8.5, "talk"], [12, "armsCrossed"]] },
    ],
    lines: [
      { at: 0.6, dur: 3.4, who: "narrator", text: "Twelve years ago. The docks, at dusk." },
      { at: 4.4, dur: 4, who: "cain", text: "She pulls left under load. Fix that and the Civic is perfect." },
      { at: 8.8, dur: 3.8, who: "wren", text: "Nothing is perfect. Drive it like the street is watching." },
      { at: 13, dur: 3.6, who: "cain", text: "The street remembers everything, Wren." },
      { at: 17.2, dur: 4.4, who: "switch", text: "Everyone remembers the crash. Nobody remembers the phone call." },
    ],
  },
  "ch5-open": {
    id: "ch5-open", title: "The Long Night",
    card: { kicker: "CHAPTER 5", title: "THE BAY BRIDGE" },
    shots: [
      { dur: 5, orbit: { center: [0, 0], r: [9, 7], angle: [2.4, 3.3], h: [2.2, 1.5] }, look: [0, 0.9, 0], fov: [50, 46], ease: "sine", shake: 0.01 },
      { dur: 5, from: [-1.5, 1.4, 6.5], to: [-0.8, 1.4, 4.4], look: [-3.5, 1.4, 2], lookTo: [-3.5, 1.45, 2], fov: [40, 35], shake: 0.015 },
      { dur: 5, from: [3.4, 1.3, -5], to: [2.6, 1.3, -3.6], look: [3.2, 1.4, -2.2], lookTo: [3.2, 1.4, -2.2], fov: [42, 38], shake: 0.012 },
      { dur: 5, from: [0, 1.4, 3.5], to: [0, 4, 11], look: [0, 1.0, 0], fov: [46, 56], ease: "sine" },
    ],
    actors: [
      { id: "pixel", at: [-3.5, 2], face: [0, 0], clip: "phone", then: [[4.5, "talk"], [9, "phone"]] },
      { id: "wren", at: [3.2, -2.2], face: [0, 0], clip: "armsCrossed", then: [[9.6, "talk"], [13.5, "armsCrossed"]] },
    ],
    lines: [
      { at: 0.6, dur: 3.6, who: "narrator", text: "One night. One bridge. Dante signs for the Wall at dawn." },
      { at: 5.2, dur: 4, who: "pixel", text: "I mapped every camera between here and the lighthouse. It is not a short list." },
      { at: 9.8, dur: 4, who: "wren", text: "The archive holds the truth. Get there before he does." },
      { at: 15.2, dur: 3.6, who: "narrator", text: "The long night starts now." },
    ],
  },
  "ch5-final": {
    id: "ch5-final", title: "The Staged Crash",
    shots: [
      { dur: 5, orbit: { center: [0, 0], r: [9, 7.5], angle: [0.3, 1.2], h: [1.4, 2.4] }, look: [0, 0.9, 0], fov: [48, 44], ease: "sine", shake: 0.01 },
      { dur: 5, from: [-1.8, 1.5, 2.4], to: [-1, 1.5, 3.4], look: [-3.4, 1.5, 1.5], lookTo: [-3.4, 1.5, 1.5], fov: [36, 32], shake: 0.02 },
      { dur: 5, from: [2.2, 1.4, -0.4], to: [1.4, 1.4, -1.4], look: [3.5, 1.4, -2], lookTo: [3.5, 1.4, -2], fov: [38, 34], shake: 0.015 },
      { dur: 5, from: [0, 1.4, 3], to: [0, 3.2, 9], look: [0, 1.2, 4.5], fov: [44, 52], ease: "sine" },
    ],
    actors: [
      { id: "wren", at: [-3.4, 1.5], face: [0, 0], clip: "talk", then: [[9, "idle"]] },
      { id: "dante", at: [3.5, -2], face: [0, 0], clip: "armsCrossed", then: [[9.8, "talk"], [14, "armsCrossed"]] },
      { id: "cain", at: [0, 6], face: [0, 0], clip: "idle", then: [[14.4, "talk"]] },
    ],
    lines: [
      { at: 0.6, dur: 3.6, who: "narrator", text: "The Harbor Loop. Dawn is an hour away." },
      { at: 5, dur: 4.6, who: "wren", text: "I cut the line, Dante. An empty car, a rail, a rumour. Cain was never meant to be in it." },
      { at: 10, dur: 3.8, who: "dante", text: "Twelve years. You let me carry that." },
      { at: 14.4, dur: 4.2, who: "cain", text: "We all carried something. Now we drive." },
    ],
  },
  "ch5-end-public": {
    id: "ch5-end-public", title: "Dawn on the Bridge",
    if: "public",
    shots: [
      { dur: 6, orbit: { center: [0, 0], r: [10, 8], angle: [0.2, 1.5], h: [1.3, 2.9] }, look: [0, 1.0, 0], fov: [50, 44], ease: "sine", shake: 0.008 },
      { dur: 5, from: [0.8, 1.3, 3.4], to: [1.2, 1.35, 2.4], look: [3, 1.3, 0.6], lookTo: [3, 1.3, 0.6], fov: [36, 32], shake: 0.02 },
      { dur: 6, from: [0, 1.2, 4], to: [0, 5.2, 12.5], look: [0, 1.0, 0], lookTo: [0, 1.5, 0], fov: [46, 58], ease: "sine" },
    ],
    actors: [
      { id: "wren", at: [3, 0.6], face: [0, 0], clip: "idle", then: [[5, "talk"], [9, "idle"]] },
      { id: "mara", at: [-3.2, 2], face: [0, 0], clip: "cheer" },
    ],
    lines: [
      { at: 0.5, dur: 3.4, who: "narrator", text: "Dawn over the Bay Bridge." },
      { at: 4.2, dur: 3.6, who: "mara", text: "Every hand on the Wall. Every single one." },
      { at: 8.2, dur: 3.8, who: "wren", text: "I told them everything. It felt like lifting a car off my chest." },
      { at: 12.4, dur: 4.6, who: "switch", text: "Kestrel Bay, this is Switch. Every street remembers who bled for it. Now it remembers you." },
    ],
  },
  "ch5-end-deal": {
    id: "ch5-end-deal", title: "The Black and Gold Dawn",
    if: "deal",
    shots: [
      { dur: 6, orbit: { center: [0, 0], r: [10, 8], angle: [2.6, 3.7], h: [2.4, 1.6] }, look: [0, 1.0, 0], fov: [50, 44], ease: "sine", shake: 0.01 },
      { dur: 5, from: [-2, 1.5, 2.6], to: [-0.8, 1.5, 3.4], look: [0, 1.5, 6], lookTo: [0, 1.5, 6], fov: [36, 32], shake: 0.015 },
      { dur: 5, from: [1.6, 1.4, 1.6], to: [0.7, 1.4, 0.7], look: [-3.4, 1.4, -1.5], lookTo: [-3.4, 1.4, -1.5], fov: [38, 36], shake: 0.015 },
    ],
    actors: [
      { id: "dante", at: [0, 6], face: [0, 0], clip: "armsCrossed", then: [[5, "talk"], [9, "armsCrossed"]] },
      { id: "wren", at: [-3.4, -1.5], face: [0, 0], clip: "idle", then: [[10, "talk"]] },
    ],
    lines: [
      { at: 0.6, dur: 3.4, who: "narrator", text: "Dawn, and the Wall in black and gold." },
      { at: 5.4, dur: 4, who: "dante", text: "The street still shows up. I did not expect that." },
      { at: 10.4, dur: 4, who: "wren", text: "Some doors you choose twice. This one stayed open." },
    ],
  },
};
