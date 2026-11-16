import type { Line } from './story';

export const WARMUP_BEFORE: Line[] = [
  { who: 'mara', text: 'Same Civic, same street. Brake early, throw it in, swing the tail.', phone: true },
  { who: 'switch', text: 'Fresh rubber on the Loop. Somebody is driving a ghost tonight.' },
  { who: 'pixel', text: 'Chat, the Civic is back. Say hi to the Rookie.', if: 'replay' },
];

export const WARMUP_WIN: Line[] = [
  { who: 'mara', text: 'Not bad, Rookie. I\'m Mara. That\'s my brother\'s first car you just drove, so I hope you like it.', phone: true, mood: 'smirk' },
  { who: 'rookie', text: 'Your brother\'s?' },
  { who: 'mara', text: 'Cain Vega. He built the Loop. He vanished after a crash at the docks, twelve years ago. I rebuilt this Civic bolt by bolt.', phone: true },
  { who: 'mara', text: 'And on Sunday the bank takes my garage. Redline Holdings bought the debt. Dante Voss. Black and gold RX-7.', phone: true, mood: 'worried' },
  { who: 'rookie', text: 'What do you need?' },
  { who: 'mara', text: 'Wins. Prize money pays the bank, and every winner presses a red hand on the Wall. Yours goes up first.', phone: true },
  { who: 'switch', text: 'Kestrel Bay, a new hand on the Wall. Whoever you are, Rookie: the road writes its name on you.' },
  { who: 'mara', text: 'Funny. My brother used to say that.', phone: true, mood: 'worried' },
  { who: 'rookie', text: 'I learned to drive listening to that voice.' },
  { who: 'mara', text: 'Everyone did. Don\'t read into it. Go rest. Tomorrow the rain comes, and so does Jinx.', phone: true },
];

export const WARMUP_LOSE: Line[] = [
  { who: 'mara', text: 'Top two, Rookie. Brake early, throw it in, and use the nitro.', phone: true },
];

export const WARMUP_LOSE_2: Line[] = [
  { who: 'pixel', text: 'Chat, the Civic is last. Hashtag ghost. Do not let them be right.' },
  { who: 'mara', text: 'Let the tail swing, then catch it. It is a light car. Use that.', phone: true },
];

export const WARMUP_LOSE_3: Line[] = [
  { who: 'mara', text: 'Third time. Cain wrecked it twice before he won a race in it. Again.', phone: true, mood: 'smirk' },
  { who: 'switch', text: 'Every ghost starts somewhere, Rookie. Go again.' },
];

export const DOCK_BEFORE: Line[] = [
  { who: 'mara', text: 'Rain tonight. Drifts start easier and are harder to catch. Smooth hands. And watch Jinx: she was born in a puddle.', phone: true },
  { who: 'jinx', text: 'Cain\'s old Civic in the rain? Cute. Try not to float away.', mood: 'smirk', if: 'car-civic' },
  { who: 'jinx', text: 'Nice ride, Rookie. Still not as nice as a wet road. And the wet road is mine.', mood: 'smirk', unless: 'car-civic' },
  { who: 'jinx', text: 'Back for more? I like you.', mood: 'smirk', if: 'retry' },
  { who: 'tank', text: 'Rain slows everyone. Not me.' },
  { who: 'dante', text: 'A rookie in Cain\'s old Civic. How sentimental. Redline Holdings closes on the docks on Friday.', mood: 'smirk' },
];

export const DOCK_WIN: Line[] = [
  { who: 'jinx', text: 'Huh. You swim well. Next rain, I\'m coming for you. Be there.', mood: 'smirk' },
  { who: 'mara', text: 'That\'s the first payment. And the 350Z in the back is yours. Don\'t scratch it.', phone: true },
  { who: 'dante', text: 'Congratulations. The docks still close on Friday. But I did enjoy the race.', mood: 'smirk' },
  { who: 'switch', text: 'A 350Z in the rain. Oh, Dante, you should see the mirrors.', if: 'tier-1' },
];

export const DOCK_LOSE: Line[] = [
  { who: 'mara', text: 'Wet roads punish pride. Brake before the corner, not in it.', phone: true },
];

export const DOCK_LOSE_2: Line[] = [
  { who: 'jinx', text: 'The puddle is lovely, Rookie. Come on in.', mood: 'smirk' },
  { who: 'mara', text: 'Ignore her. Smooth hands, early brakes. Go again.', phone: true },
];

export const DOCK_LOSE_3: Line[] = [
  { who: 'tank', text: 'Lift. Then go.' },
  { who: 'switch', text: 'Rough night on the quays. Nobody remembers the lap you lost. Go again.' },
];

export const DRIFT_BEFORE: Line[] = [
  { who: 'switch', text: 'Snow on the docks, folks. Tonight nobody races. They put on a show. Vex is already warming up the tyres.' },
  { who: 'vex', text: 'Straight lines are for accountants. Make it pretty, Rookie.', mood: 'smirk' },
  { who: 'mara', text: 'Points for angle and speed. Hit a wall and you lose the chain. Bank it before you lift.', phone: true },
];

export const DRIFT_WIN: Line[] = [
  { who: 'mara', text: 'The crowd loved it. The garage is two days from the bank, not three hours.', phone: true },
  { who: 'vex', text: 'Okay. That was art. I won\'t say it twice.' },
  { who: 'dante', text: 'Pretty. Tomorrow night, the Loop. You and me. Bring the garage deeds, if you still have them.', mood: 'smirk' },
];

export const DRIFT_LOSE: Line[] = [
  { who: 'mara', text: 'Smaller angle, more speed. Keep the throttle in.', phone: true },
];

export const DRIFT_LOSE_2: Line[] = [
  { who: 'vex', text: 'Too stiff. Let the car breathe, Rookie. Again.' },
];

export const DRIFT_LOSE_3: Line[] = [
  { who: 'switch', text: 'Snow does not care about your score. It cares about your hands. Go again.' },
  { who: 'mara', text: 'Think of it as a dance. You lead.', phone: true },
];

export const FINALE_BEFORE: Line[] = [
  { who: 'dante', text: 'Do you know why I kept the Red Hand Wall, Rookie? Every name on it is a street I now own.' },
  { who: 'dante', text: 'Cain taught me everything. Then he crashed, and I learned what he never would: a street without rules eventually kills someone.', mood: 'worried' },
  { who: 'tank', text: 'I\'m here for the street. Not for him.' },
  { who: 'vex', text: 'Dante pays for my tyres. Nothing personal.' },
  { who: 'mara', text: 'Don\'t listen to him. The Loop eats anyone who drives angry. Drive clean. Win it for Cain.', phone: true },
];

export const FINALE_WIN: Line[] = [
  { who: 'dante', text: 'Remarkable. The garage is yours. Keep it.' },
  { who: 'dante', text: 'Here. A key to the East Yard. Do not lose it. Do not use it yet.', mood: 'worried' },
  { who: 'rookie', text: 'What is in the East Yard?' },
  { who: 'dante', text: 'A conversation I am not ready to have.' },
  { who: 'mara', text: 'We kept the garage. I don\'t know how to thank you.', phone: true },
  { who: 'switch', text: 'Kestrel Bay, this is DJ Switch, one last time from the crane cab. A hand just went up on the Wall.' },
  { who: 'switch', text: 'Mara. It\'s me. I never left. Twelve years of listening to every engine on this street. Tonight I heard mine again.', mood: 'worried' },
  { who: 'cain', text: 'It is Cain. Rookie, the Loop has a new legend. And Mara... I am sorry I stayed quiet so long.' },
  { who: 'mara', text: 'Twelve years, Cain. Twelve. Do not call me. Not tonight.', phone: true, mood: 'angry' },
];

export const FINALE_LOSE: Line[] = [
  { who: 'dante', text: 'Almost, Rookie. Almost is what I collect.' },
  { who: 'mara', text: 'We have until Sunday. Breathe. Again.', phone: true },
];

export const FINALE_LOSE_2: Line[] = [
  { who: 'dante', text: 'You hesitate in the snow. Cain never did.', mood: 'smirk' },
  { who: 'switch', text: 'Pace the tyres, not the clock. Again.' },
];

export const FINALE_LOSE_3: Line[] = [
  { who: 'mara', text: 'Third time. I am not asking you to be perfect. Just to be the one who gets back up.', phone: true, mood: 'worried' },
];
