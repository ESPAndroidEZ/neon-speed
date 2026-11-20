import type { Line } from './story';

/** Chapter 3 "Blood on the Wall": dialogue. Spanish for every line is in i18n/esContentE.ts (keyed by the English text). */

export const LIGHTHOUSE_BEFORE: Line[] = [
  { who: "cain", text: "The lighthouse. Twelve years ago I stood here and watched my own brake lights go dark. Come in, Rookie. Mind the stairs.", mood: "worried" },
  { who: "cain", text: "This is the brake line from my car. Cut clean, not worn through. Somebody wanted me off the road, and they knew exactly where to cut.", mood: "worried" },
  { who: "mara", text: "Cain showed me the line this morning. I have not stopped shaking since. Tonight, drive it for him.", phone: true, mood: "worried" },
  { who: "cain", text: "My hands never came back, so I cannot drive. But I can talk. From now on I call your corners over the radio. Trust the voice." },
  { who: "rook", text: "The Council wants a short-circuit season to settle this. First stop is the coast road. Redline will not make it easy.", mood: "worried" },
];

export const LIGHTHOUSE_WIN: Line[] = [
  { who: "cain", text: "You drove it the way I used to. Same lines, same nerve. That is proof enough for me." },
  { who: "cain", text: "The dock gate keeps a night log. It will place whoever stood at the quay that night. Mara knows where the old gate house is." },
  { who: "mara", text: "First thing in the morning. Rest, Rookie. You earned it.", phone: true },
];

export const LIGHTHOUSE_LOSE: Line[] = [
  { who: "cain", text: "Brake later, turn earlier. I will call it sooner this time." },
];

export const LIGHTHOUSE_LOSE_2: Line[] = [
  { who: "mara", text: "The coast road is wet at the edges. Stay on the crown of the road.", phone: true },
];

export const LIGHTHOUSE_LOSE_3: Line[] = [
  { who: "switch", text: "A lighthouse only helps if you look at it. Again, Rookie." },
];

export const GEAR_BEFORE: Line[] = [
  { who: "cain", text: "Redline paid for the timing sensors on every lap. Tonight the computer does not shift for you. You do." },
  { who: "cain", text: "E and Q, the d-pad, or the plus and minus buttons. Shift up near the redline for a PERFECT SHIFT: free nitro." },
  { who: "nova", text: "Heard about the gear talk. My crew keeps the line clear. Do not stall on my account.", mood: "smirk", if: "open" },
  { who: "dante", text: "Team Redline provides the car, I provide the schedule. Win properly tonight and we will discuss the rest.", mood: "smirk", if: "sponsor" },
];

export const GEAR_WIN: Line[] = [
  { who: "cain", text: "Clean. You listened to the engine, not the clock. That is the whole secret." },
  { who: "nova", text: "The gate-house guard sold his logbook years ago. My cousin knows the buyer. Meet me at the Serpent.", mood: "smirk", if: "open" },
  { who: "dante", text: "A tidy win. The buyer of that logbook is a man I know. Be at the Serpent at midnight and do not be late.", mood: "smirk", if: "sponsor" },
];

export const GEAR_LOSE: Line[] = [
  { who: "cain", text: "Do not fight the lever. Feel the engine climb, then shift just before it screams." },
];

export const GEAR_LOSE_2: Line[] = [
  { who: "mara", text: "Wrong gear on the exit again. Early shifts are slow, late shifts hit the limiter.", phone: true },
];

export const GEAR_LOSE_3: Line[] = [
  { who: "switch", text: "Stir the box, Rookie. Rain, a lever and your nerve. Again." },
];

export const SERPENT_BEFORE: Line[] = [
  { who: "mara", text: "The guard moved away, but his night shift route is on a delivery map. Drive it the way he did: sideways, under the cameras.", phone: true },
  { who: "cain", text: "Bank 7,000 drift points and the city stream cuts out long enough for us to slip into the office." },
  { who: "switch", text: "Serpent Drift, no rivals, no brakes worth mentioning. Slide it, Rookie.", mood: "smirk" },
];

export const SERPENT_WIN: Line[] = [
  { who: "mara", text: "We are in. The logbook has one name signed twice: Calloway. Dante was only the courier.", phone: true, mood: "worried" },
  { who: "cain", text: "Calloway's father owned that gate. The line was cut on his order. Dante knew and kept quiet. That is his crime.", mood: "angry" },
  { who: "cain", text: "We need the son to say it out loud. He drives the north pass. Snow is coming." },
];

export const SERPENT_LOSE: Line[] = [
  { who: "cain", text: "Chain the slides. Every straight you take loses the chain. Stay sideways." },
];

export const SERPENT_LOSE_2: Line[] = [
  { who: "mara", text: "Flick the car across at every change of bend. That is where the points are.", phone: true },
];

export const SERPENT_LOSE_3: Line[] = [
  { who: "switch", text: "Left, right, left. A snake does not stop to think. Again." },
];

export const PASS_BEFORE: Line[] = [
  { who: "calloway", text: "You have been digging in my father's old files. The north road is mine, and tonight so is your hand on the Wall.", mood: "angry" },
  { who: "calloway", text: "Win and take what you like. Lose and the files go into the sea.", mood: "angry" },
  { who: "brick", text: "I brought trucks to close the pass behind you. Nobody follows you tonight but the snow.", mood: "smirk", if: "open" },
  { who: "dante", text: "Calloway is not my enemy, he is an inconvenience. Do try not to rescue him.", mood: "smirk", if: "sponsor" },
];

export const PASS_WIN: Line[] = [
  { who: "calloway", text: "My father cut that line to protect the road. I was nine. I never knew. I am sorry, Cain.", mood: "worried" },
  { who: "cain", text: "Thank you. Now we have the name and a witness. One race left, Rookie." },
];

export const PASS_LOSE: Line[] = [
  { who: "calloway", text: "The pass belongs to the ones who know it. Learn it.", mood: "smirk" },
];

export const PASS_LOSE_2: Line[] = [
  { who: "cain", text: "Snow hides the apex. Brake before the white, not in it." },
];

export const PASS_LOSE_3: Line[] = [
  { who: "mara", text: "Calloway never lifts on the long left. You can, and still win.", phone: true },
];

export const FINAL_BEFORE: Line[] = [
  { who: "dante", text: "Everyone has a price, Rookie. The Council voted for the street, so I will buy the Wall instead.", mood: "smirk" },
  { who: "cain", text: "He did not cut the line. He knew, and he kept the secret for twelve years. Then he used it to buy the street.", mood: "angry" },
  { who: "mara", text: "The evidence is ready. What happens to it is your call, not ours.", phone: true, mood: "worried", choice: {
    prompt: "What do you do with the evidence?",
    options: [
      { label: "Take it public", set: { public: true }, rel: { cain: 1, mara: 1, dante: -1 }, reply: [
        { who: 'cain', text: "Then the whole city hears it tonight. Drive for the truth." },
      ] },
      { label: "Trade it to Dante", set: { deal: true }, rel: { dante: 1, cain: -2 }, reply: [
        { who: 'dante', text: "A sensible Rookie. Win tonight and the Wall stays exactly where it is. In my name.", mood: 'smirk' },
      ] },
    ],
  } },
];

export const FINAL_WIN: Line[] = [
  { who: "switch", text: "Kestrel Bay, this is DJ Switch. And this is Cain Vega. The Wall remembers who bled for it. Tonight it remembers the truth.", mood: "smirk", if: "public" },
  { who: "mara", text: "Calloway is giving his statement. Cain wants to drive one lap at dawn. Just one.", phone: true, if: "public" },
  { who: "dante", text: "The Wall is mine, Rookie, and the Loop stays a secret. Some roads you only drive once.", mood: "smirk", if: "deal" },
  { who: "cain", text: "I understand. I do not forgive it. But I understand.", mood: "worried", if: "deal" },
];

export const FINAL_LOSE: Line[] = [
  { who: "dante", text: "The Wall is for sale and you are out of cash. Try again.", mood: "smirk" },
];

export const FINAL_LOSE_2: Line[] = [
  { who: "cain", text: "Rain turns to snow at the lighthouse bend. Be gentle there." },
];

export const FINAL_LOSE_3: Line[] = [
  { who: "switch", text: "Every street remembers who bled for it. Show it your best lap." },
];
