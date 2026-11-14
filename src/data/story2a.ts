import type { StoryEvent } from './story';

/** Chapter 2, part one: Dante's retaliation, then the Neon Strip and the Container Maze. */
export const EVENTS_2A: StoryEvent[] = [
  {
    id: 'c2-redline', chapter: 2, title: 'Redline Rising', blurb: 'Dante answers with lawyers, trucks and a roadblock on the Loop. Break through. Top two.',
    kind: 'race', weather: 'CLEAR', laps: 2, rivals: ['rook', 'vex', 'jinx'], skillScale: 0.95, needPosition: 2, bonus: 4000, unlocks: [],
    card: 'Redline wants the street back. Take it first.',
    before: [
      { who: 'mara', text: 'Redline Holdings bought the impound lot, the tow trucks and half the street lamps. Tonight the Loop has a permit problem.', phone: true, mood: 'worried' },
      { who: 'dante', text: 'No hard feelings, rookie. The garage is yours. The street is a different matter. I am simply buying what is for sale.', mood: 'smirk' },
      { who: 'rook', text: 'He pays well. He pays everyone. That is how he wins. Do not trust the smile.', mood: 'worried' },
    ],
    afterWin: [
      { who: 'switch', text: 'Kestrel Bay, this is DJ Switch, and I am done hiding. The Loop belongs to whoever shows up. Say it with me.', mood: 'smirk' },
      { who: 'mara', text: 'You know who that voice is now. He is asking us to go to the districts and win the votes. Neon Strip first.', phone: true },
    ],
    afterLose: [{ who: 'mara', text: 'They out-numbered us. Try the inside line, and do not trade paint with Vex.', phone: true }],
  },
  {
    id: 'c2-neon', chapter: 2, trackId: 'neon', title: 'Neon Night', blurb: 'Downtown. Nova rules the Neon Strip and the council vote that comes with it. Wet boulevards. Top two.',
    kind: 'race', weather: 'RAIN', laps: 3, rivals: ['nova', 'pixel', 'lola', 'vex'], skillScale: 1, needPosition: 2, bonus: 6000, unlocks: ['rx7'],
    card: 'Neon, rain and tram lines. Cross the rails straight.',
    before: [
      { who: 'nova', text: 'You are the rookie who beat Dante? He is paying me double to make sure you do not do it twice.', mood: 'smirk' },
      { who: 'mara', text: 'Nova is the best drifter downtown. On wet boulevards she makes the whole street her slide. Brake before the tram lines, never on them.', phone: true },
      { who: 'rookie', text: 'And the tunnel?' },
      { who: 'switch', text: 'Dark, fast and echoes. You will hear her before you see her.', mood: 'smirk' },
    ],
    afterWin: [
      { who: 'nova', text: 'Fine. You drive clean for a rookie. Dante pays me. He does not own me. The Strip votes with you.', mood: 'smirk' },
      { who: 'mara', text: 'That is the RX-7 from her sponsor garage. She says it handles like you think. Do not let it hear you doubt it.', phone: true },
    ],
    afterLose: [{ who: 'nova', text: 'Come back when you can hold a slide past the second tram crossing.', mood: 'smirk' }],
  },
  {
    id: 'c2-maze', chapter: 2, trackId: 'maze', title: 'Container Maze', blurb: 'The port yard. Brick owns the lanes, and he never lifts. First snow of the winter. Top two.',
    kind: 'race', weather: 'SNOW', laps: 4, rivals: ['brick', 'tank', 'rook', 'jinx'], skillScale: 1, needPosition: 2, bonus: 7000, unlocks: ['evo'],
    card: 'Nine metres of lane and a man who will not move.',
    before: [
      { who: 'brick', text: 'The yard has one rule: the lane is mine. Pass if you want. Paint is cheap.', mood: 'angry' },
      { who: 'mara', text: 'Brick runs the dock union. Big engine, big shoulders, and he brakes later than anyone. Do not race his line. Race around it.', phone: true },
      { who: 'switch', text: 'Snow in the Maze. Nine-metre lanes and ninety-degree corners. Folks, pack your patience.', mood: 'worried' },
    ],
    afterWin: [
      { who: 'brick', text: 'Huh. You drive like you mean it. The union votes with the street. Not with Redline.', mood: 'smirk' },
      { who: 'mara', text: 'The Evo is yours. Brick says it is the only car that ever frightened him.', phone: true },
    ],
    afterLose: [{ who: 'brick', text: 'You hesitated. In my yard that is a lane change.', mood: 'smirk' }],
  },
];
