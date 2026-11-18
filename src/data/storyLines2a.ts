import type { Line } from './story';

export const REDLINE_BEFORE: Line[] = [
  { who: 'mara', text: 'Redline bought the impound lot, the tow trucks and half the street lamps. Tonight the Loop has a permit problem.', phone: true, mood: 'worried' },
  { who: 'dante', text: 'No hard feelings, Rookie. The garage is yours. The street is another matter. I simply buy what is for sale.', mood: 'smirk' },
  { who: 'rook', text: 'He pays everyone. That is how he wins. Do not trust the smile.', mood: 'worried' },
  { who: 'rook', text: 'The night Cain crashed, Dante walked in at dawn carrying something wrapped in a towel. He never said what.', mood: 'worried' },
];

export const REDLINE_WIN: Line[] = [
  { who: 'switch', text: 'Kestrel Bay, this is DJ Switch and I am done hiding. The Loop belongs to whoever shows up. Say it with me.', mood: 'smirk' },
  { who: 'mara', text: 'He wants us to win the four district votes. Neon Strip first. I am not speaking to him. You are.', phone: true, mood: 'angry' },
  { who: 'rookie', text: 'He said he was sorry.' },
  { who: 'mara', text: 'After twelve years, he is sorry. Drive, Rookie.', phone: true },
];

export const REDLINE_LOSE: Line[] = [
  { who: 'mara', text: 'They outnumbered us. Take the inside line, and do not trade paint with Vex.', phone: true },
];

export const REDLINE_LOSE_2: Line[] = [
  { who: 'rook', text: 'Redline wins by being ready. Be ready earlier than they are.', mood: 'angry' },
];

export const REDLINE_LOSE_3: Line[] = [
  { who: 'switch', text: 'Tow trucks and tiny lamps. Redline spares no expense. Neither do we. Again.' },
];

export const NEON_BEFORE: Line[] = [
  { who: 'nova', text: 'You are the Rookie who beat Dante? He is paying me double to make sure you do not do it twice.', mood: 'smirk' },
  { who: 'nova', text: 'A Civic on my boulevard. Adorable.', mood: 'smirk', if: 'car-civic' },
  { who: 'nova', text: 'Nice machine. It will not make you faster.', mood: 'smirk', unless: 'car-civic' },
  { who: 'mara', text: 'Nova is the best drifter downtown. On wet boulevards she makes the whole street her slide. Brake before the tram lines, never on them.', phone: true },
  { who: 'pixel', text: 'Chat, it is raining neon and four thousand of you are watching. Rookie, wave.' },
  { who: 'rookie', text: 'And the tunnel?' },
  { who: 'switch', text: 'Dark, fast and full of echoes. You will hear her before you see her.', mood: 'smirk' },
];

export const NEON_WIN: Line[] = [
  { who: 'nova', text: 'Fine. You drive clean. Dante pays me. He does not own me. The Strip votes with you.', mood: 'smirk' },
  { who: 'nova', text: 'One more thing. Every year Dante leaves flowers at Quay 9, alone, at night. Nobody asked him to. Work that out.', mood: 'worried' },
  { who: 'mara', text: 'The RX-7 is yours, from her sponsor garage. It handles like you think. Do not let it hear you doubt.', phone: true },
];

export const NEON_LOSE: Line[] = [
  { who: 'nova', text: 'Come back when you can hold a slide past the second tram crossing.', mood: 'smirk' },
];

export const NEON_LOSE_2: Line[] = [
  { who: 'nova', text: 'You brake on the rails. They notice. Again, Rookie.', mood: 'smirk' },
];

export const NEON_LOSE_3: Line[] = [
  { who: 'mara', text: 'Tell me you did not brake on the tram lines. Again. Gently.', phone: true },
  { who: 'nova', text: 'Dante flowers, Rookie. Think about the flowers.', mood: 'worried' },
];

export const MAZE_BEFORE: Line[] = [
  { who: 'brick', text: 'The yard has one rule: the lane is mine. Pass if you want. Paint is cheap.', mood: 'angry' },
  { who: 'tank', text: 'Brick is right. The lane is his. Race around it.' },
  { who: 'mara', text: 'Brick runs the dock union. Big engine, big shoulders, and he brakes later than anyone. Do not race his line. Race around it.', phone: true },
  { who: 'switch', text: 'Snow in the Maze. Nine-metre lanes and ninety-degree corners. Folks, pack your patience.', mood: 'worried' },
];

export const MAZE_WIN: Line[] = [
  { who: 'brick', text: 'You drive like you mean it. The union votes with the street, not with Redline.', mood: 'smirk' },
  { who: 'brick', text: 'The gate log for the night Cain crashed went missing from my office. Twelve years. Calloway\'s father signed for the lock.', mood: 'worried' },
  { who: 'mara', text: 'The Evo is yours. Brick says it is the only car that ever frightened him.', phone: true },
];

export const MAZE_LOSE: Line[] = [
  { who: 'brick', text: 'You hesitated. In my yard that counts as a lane change.', mood: 'smirk' },
];

export const MAZE_LOSE_2: Line[] = [
  { who: 'tank', text: 'Commit. Or stay home.' },
];

export const MAZE_LOSE_3: Line[] = [
  { who: 'brick', text: 'Ninety degrees is not a suggestion. Brake, turn, go. Again.' },
  { who: 'mara', text: 'Plan the pass two corners early, not in the corner. Again.', phone: true },
];
