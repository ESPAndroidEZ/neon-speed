/** DJ Switch's in-race radio lines. Placeholders: {name} rival, {pos} {n} position, {lap} {laps}, {score} drift points. */
export const RADIO = {
  start: ['Green light on the Loop! {n} cars, and the Rookie is on the back row.', 'Engines up, Kestrel Bay! {name} on pole tonight.'],
  overtake: ['{name} just got swallowed!', 'And {name} is looking at your tail lights now.', 'Clean pass on {name}. The wall approves.', 'Up to P{pos}! {name} will remember that.'],
  overtaken: ['{name} slides past. Bite back!', 'P{pos} now. {name} smells blood.', 'Keep it clean, Rookie. {name} is through.'],
  crash: ['That wall did not see it coming.', 'Somebody is going to be sweeping up glass.', 'Ouch. The Loop leaves a mark.', 'Wall hugger! The Red Hand Wall wants winners, not paint.'],
  drift: ['{score} points of sideways. Beautiful.', 'Is that a drift or an apology? {score} and rising!', 'That slide is worth {score}. Bank it!'],
  weather: { RAIN: ['Rain on the quays. Brake earlier than you think.', 'The sky just opened. Grip is leaving.'], SNOW: ['It is snowing on the Loop. Hold on to something.', 'Snow! Tyres are about to become decoration.'], CLEAR: ['The sky is clearing. Grip is coming back.'] },
  lap: ['Lap {lap} of {laps}. P{pos}.', 'Starting lap {lap}. {n} cars still fighting.'],
  finalLap: ['Final lap, Kestrel Bay!', 'Last lap! Bring everything.'],
  leading: ['You lead the Loop! {name} is chasing.', 'Out front. Do not look back. {name} is.'],
  last: ['Last place, Rookie. The only way is up.', 'Plenty of road left to catch {name}.'],
  idle: ['{name} is the one to watch tonight.', 'You are P{pos} of {n}. Plenty of street left.', 'The crane lights are on. Somebody is watching this one.', 'This is DJ Switch. I hear everything on this street.'],
  /** Specific lines by rival name. */
  rival: {
    Jinx: ['Jinx loves a wet road. Do not give her the inside.', 'Jinx is aggressive tonight. Mind your mirrors.'],
    Tank: ['Tank is a freight train. Late on the brakes, as ever.', 'Do not trade paint with Tank. He wins that.'],
    Vex: ['Vex is sideways again. Redline pays for the tyres.', 'Vex has never lifted in her life.'],
    'Dante Voss': ['Dante is calm. Dante is always calm. That is the scary part.', 'The black and gold RX-7 is not in a hurry. Yet.'],
    Pixel: ['Pixel is streaming this. Wave to the chat.'],
    Lola: ['Lola knows every puddle on the dock.'],
    Rook: ['Rook used to run with Redline. Bad terms.'],
  } as Record<string, string[]>,
};
