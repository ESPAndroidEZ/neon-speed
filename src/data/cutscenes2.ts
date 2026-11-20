import type { Cutscene } from '../core/cutsceneTimeline';

/** Chapter 3 cutscenes: the final confrontation and the two epilogues (data/cutscenes.ts has the format). */
export const CUTSCENES_B: Record<string, Cutscene> = {
  "ch3-final": {
    id: "ch3-final", title: "One Wall, One Truth",
    card: { kicker: "FINAL LOOP", title: "ONE WALL, ONE TRUTH" },
    shots: [
      { dur: 5, orbit: { center: [0, 0], r: [10, 8], angle: [-1.0, 0.0], h: [2.6, 1.6] }, look: [0, 1.0, 0], fov: [50, 44], ease: "sine", shake: 0.01 },
      { dur: 5, from: [-0.5, 1.5, 6], to: [-1.6, 1.5, 4.2], look: [-4, 1.5, 3], lookTo: [-4, 1.55, 3], fov: [36, 32], shake: 0.015 },
      { dur: 5, from: [1.8, 1.4, -1.5], to: [0.6, 1.4, -2.6], look: [-1.5, 1.4, -4.5], lookTo: [-1.5, 1.45, -4.5], fov: [38, 34], shake: 0.015 },
      { dur: 5, from: [0.5, 1.4, 5], to: [1.4, 1.4, 3.2], look: [4, 1.4, 2], lookTo: [4, 1.45, 2], fov: [38, 36], shake: 0.015 },
    ],
    actors: [
      { id: "dante", at: [-4, 3], face: [0, 0], clip: "armsCrossed", then: [[5.2, "talk"], [9, "armsCrossed"]] },
      { id: "cain", at: [-1.5, -4.5], face: [0, 0], clip: "armsCrossed" },
      { id: "calloway", at: [4, 2], face: [0, 0], clip: "lean", then: [[15.5, "talk"]] },
    ],
    lines: [
      { at: 0.6, dur: 4, who: "dante", text: "Everyone has a price. The Council voted for the street, so I will buy the Wall." },
      { at: 10.2, dur: 4, who: "cain", text: "He did not cut the line. He knew, and he said nothing for twelve years." },
      { at: 15.4, dur: 3.2, who: "calloway", text: "I hated the wrong man for a decade. Not tonight." },
      { at: 18.6, dur: 1.4, who: "switch", text: "Rain to snow. One loop." },
    ],
  },
  "ch3-end-public": {
    id: "ch3-end-public", title: "Dawn Lap",
    if: "public",
    shots: [
      { dur: 6, orbit: { center: [0, 0], r: [9, 7], angle: [0.2, 1.4], h: [1.3, 2.8] }, look: [0, 1.0, 0], fov: [50, 44], ease: "sine", shake: 0.008 },
      { dur: 5, from: [0.6, 1.3, 3.2], to: [1.0, 1.35, 2.2], look: [2.2, 1.3, 0.4], lookTo: [2.2, 1.3, 0.4], fov: [36, 32], shake: 0.02 },
      { dur: 6, from: [0, 1.2, 4], to: [0, 5, 12], look: [0, 1.0, 0], lookTo: [0, 1.5, 0], fov: [46, 58], ease: "sine" },
    ],
    actors: [
      { id: "cain", at: [2.2, 0.4], face: [0, 0], clip: "talk", then: [[8, "cheer"]] },
      { id: "mara", at: [-3, 2], face: [0, 0], clip: "cheer" },
    ],
    lines: [
      { at: 0.5, dur: 3.4, who: "narrator", text: "Dawn over Kestrel Bay." },
      { at: 4.2, dur: 3.8, who: "cain", text: "One lap. That is all I ever asked for." },
      { at: 8.4, dur: 3.4, who: "mara", text: "Go on. Drive." },
      { at: 11.8, dur: 5, who: "switch", text: "Kestrel Bay, this is DJ Switch. And this is Cain Vega. The Wall remembers who bled for it." },
    ],
  },
  "ch3-end-deal": {
    id: "ch3-end-deal", title: "The Quiet Wall",
    if: "deal",
    shots: [
      { dur: 6, orbit: { center: [0, 0], r: [10, 8], angle: [2.4, 3.6], h: [2.4, 1.6] }, look: [0, 1.0, 0], fov: [50, 44], ease: "sine", shake: 0.01 },
      { dur: 5, from: [-2, 1.5, 2.5], to: [-0.8, 1.5, 3.4], look: [0, 1.5, 6], lookTo: [0, 1.5, 6], fov: [36, 32], shake: 0.015 },
      { dur: 5, from: [1.5, 1.4, 1.5], to: [0.6, 1.4, 0.6], look: [-3, 1.4, -2], lookTo: [-3, 1.4, -2], fov: [38, 36], shake: 0.015 },
    ],
    actors: [
      { id: "dante", at: [0, 6], face: [0, 0], clip: "armsCrossed", then: [[5, "talk"]] },
      { id: "cain", at: [-3, -2], face: [0, 0], clip: "idle" },
    ],
    lines: [
      { at: 0.6, dur: 3.4, who: "narrator", text: "The Wall, repainted overnight in black and gold." },
      { at: 6, dur: 4, who: "dante", text: "The Wall is mine, Rookie. Black and gold suits it." },
      { at: 11, dur: 4.5, who: "cain", text: "Some roads you only drive once." },
    ],
  },
};
