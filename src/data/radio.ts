import { RIVAL_RADIO_2 } from './radio2';

/** DJ Switch's in-race radio lines. Placeholders: {name} rival, {pos} {n} position, {lap} {laps}, {score} drift points. */
export const RADIO = {
  start: ['Green light on the Loop! {n} cars, and the Rookie is on the back row.', 'Engines up, Kestrel Bay! {name} on pole tonight.', 'This is DJ Switch, and the street is open. Do not waste it.', 'Three, two, one. Make the neighbours regret this.', 'Twelve years on this frequency, and the Loop still surprises me.'],
  overtake: ['{name} just got swallowed!', 'And {name} is looking at your tail lights now.', 'Clean pass on {name}. The wall approves.', 'Up to P{pos}! {name} will remember that.', 'Through on the inside. {name} did not see that coming.', 'P{pos}! Somebody tell {name} to check the mirrors.', 'That is how you take a corner from {name}.', 'Smooth. {name} is already thinking about revenge.'],
  overtaken: ['{name} slides past. Bite back!', 'P{pos} now. {name} smells blood.', 'Keep it clean, Rookie. {name} is through.', '{name} took the line. Take it back.', 'Do not sulk. {name} is only P{pos} until you say otherwise.', 'You gave {name} a gap. Gaps get used.', '{name} says hello on the way past.', 'Heads up, {name} is ahead. Plenty of street left.'],
  crash: ['That wall did not see it coming.', 'Somebody is going to be sweeping up glass.', 'Ouch. The Loop leaves a mark.', 'Wall hugger! The Red Hand Wall wants winners, not paint.', 'That one made the whole dock flinch.', 'Easy, Rookie. Paint is cheap, momentum is not.', 'The barrier wins again. It always wins.', 'Shake it off. Eyes up, hands steady.'],
  drift: ['{score} points of sideways. Beautiful.', 'Is that a drift or an apology? {score} and rising!', 'That slide is worth {score}. Bank it!', '{score} and the tyres are singing.', 'Look at that angle. {score} points of pure nerve.', 'Sideways for {score}. Cain would have smiled.', '{score}! The crowd on the dock is on its feet.', 'Tyre smoke and {score} points. Lovely.'],
  weather: {
    RAIN: ['Rain on the quays. Brake earlier than you think.', 'The sky just opened. Grip is leaving.', 'Wet road, quiet nerves. Watch the puddles.', 'Rain! Jinx just grinned somewhere.'],
    SNOW: ['It is snowing on the Loop. Hold on to something.', 'Snow! Tyres are about to become decoration.', 'White road. Ice in the tunnel, Rookie.', 'Flakes on the windscreen. Gentle hands only.'],
    CLEAR: ['The sky is clearing. Grip is coming back.', 'Dry again. Now you have no excuses.'],
  },
  lap: ['Lap {lap} of {laps}. P{pos}.', 'Starting lap {lap}. {n} cars still fighting.', 'Lap {lap}. The tyres are warm, the nerves are not.', 'Lap {lap} of {laps}. {name} leads the pack.'],
  finalLap: ['Final lap, Kestrel Bay!', 'Last lap! Bring everything.', 'One lap left. Empty the tank.', 'Final lap! Whatever you have been saving, spend it.'],
  leading: ['You lead the Loop! {name} is chasing.', 'Out front. Do not look back. {name} is.', 'Clear road ahead. That is the loneliest place to be.', 'P1! {name} is a few car lengths back and hungry.'],
  last: ['Last place, Rookie. The only way is up.', 'Plenty of road left to catch {name}.', 'Back of the pack. Great view of everyone’s mistakes.', 'Tail-end Charlie. {name} is within reach.'],
  idle: ['{name} is the one to watch tonight.', 'You are P{pos} of {n}. Plenty of street left.', 'The crane lights are on. Somebody is watching this one.', 'This is DJ Switch. I hear everything on this street.', 'Quiet stretch. Use it to breathe.', 'Every engine on this street has a different voice. Yours is getting louder.', 'Quay 9 still bites after twelve years. Mind the dock corner.', 'Whoever taught you to drive taught you well. I would like to thank them.', 'Twelve years of engines on this street. Tonight yours sounds familiar.'],
  win: ['And that is the win! Press your hand on the Wall.', 'First across the line! The Loop has a new name to whisper.', 'Winner! Switch is smiling, and he does not smile for everyone.', 'P1! The red hand goes up tonight.', 'Beautiful finish. The Wall has room for you.', 'Rookie no more. Well, a bit less.', 'Another hand on the Wall. The road writes its name on you.'],
  lose: ['Not tonight, Rookie. The Loop will be here tomorrow.', 'You finished. That counts for something. Not much, but something.', 'Back to the garage. Mara will have opinions.', 'The Wall remembers winners. Go win.', 'Good fight, wrong result. Try the next one in the rain.', 'Learn the corners, then the corners will learn you.', 'Not tonight. The road writes its name on you either way.'],
  /** Specific lines by rival name. */
  rival: {
    Jinx: ['Jinx loves a wet road. Do not give her the inside.', 'Jinx is aggressive tonight. Mind your mirrors.', 'Jinx brakes later in the rain than anyone sane.', 'Jinx grew up under the pumps. Rain is her family reunion.'],
    Tank: ['Tank is a freight train. Late on the brakes, as ever.', 'Do not trade paint with Tank. He wins that.', 'Tank takes the whole street. Let him have the line.', 'Tank saved ten years for that Supra. He drives it like a promise.'],
    Vex: ['Vex is sideways again. Redline pays for the tyres.', 'Vex has never lifted in her life.', 'Vex turns every corner into a show.', 'Vex is sideways for the crowd. The tyres are Redline money.'],
    'Dante Voss': ['Dante is calm. Dante is always calm. That is the scary part.', 'The black and gold RX-7 is not in a hurry. Yet.', 'Dante Voss never wastes a lap. Not one.', 'Dante leaves flowers at Quay 9 every year. Ask yourself why.'],
    Pixel: ['Pixel is streaming this. Wave to the chat.', 'Pixel drives like the whole internet is watching. It is.', 'Pixel found a shortcut in the replay. There is no shortcut.', 'Pixel has four thousand watching. Wave.'],
    Lola: ['Lola knows every puddle on the dock.', 'Lola grew up here. The quays are her kitchen.', 'Lola is small, quick and not impressed by you.', 'Lola has been very quiet about something for a long time.'],
    Rook: ['Rook used to run with Redline. Bad terms.', 'Rook has a long memory and a short temper.', 'Rook drives angry and he is right to.', 'Rook left Redline owing nothing and keeping everything.'],
  } as Record<string, string[]>,
};

for (const [name, lines] of Object.entries(RIVAL_RADIO_2)) RADIO.rival[name] = lines;
