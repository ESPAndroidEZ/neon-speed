/** DJ Switch's lines for the three new maps (task 012). Data only, no imports. */
/** Placeholders: {name} rival, {pos}/{n} position and field size, {lap}/{laps}. */
export const TRACK_RADIO: Record<string, { start: string[]; idle: string[] }> = {
  neon: {
    start: [
      'Neon Strip. {n} cars, and the city is already awake.',
      'Boulevards, neon and rain on the glass. {name} is on pole.',
      'Green light on the Strip. {n} cars, one long tunnel to survive.',
    ],
    idle: [
      'The tunnel eats the rain. It gives back the grip, eventually.',
      'Neon signs double the night. Eyes on the road, not the glass.',
      'Tram lines underfoot. They shine first, then they slip.',
      'Rain on the windscreen, Rookie. Wipers are a suggestion.',
      '{pos} of {n}. The Strip has a long memory for mistakes.',
    ],
  },
  maze: {
    start: [
      'Container Maze. {n} cars in nine-metre lanes. Good luck.',
      'The cranes are watching. {name} will not move over.',
      'Green light in the yard. {n} cars, ninety-degree corners ahead.',
    ],
    idle: [
      'Nine metres wide, Rookie. The containers are the wall now.',
      'Brick never lifts. Plan the pass, not the apology.',
      'The cranes move slow. So should you, at ninety degrees.',
      'Stacked steel on both sides. Pick your line and commit.',
      '{pos} of {n}. The yard keeps score in dents.',
    ],
  },
  cliff: {
    start: [
      'Cliffside Run. Point to point, {n} cars, one long sprint.',
      'The ocean is on your left. {name} is in your mirror.',
      'Green light on the coast. {n} cars, the sea does the noise.',
    ],
    idle: [
      'Crest ahead. It will launch you. Trust the rail, not the view.',
      'Weather is rolling in off the water. Grip will argue.',
      'The guard rail is the only wall that forgives. Use it gently.',
      '{pos} of {n}. The coast is short, and it is watching.',
      'Lift before the crest, Rookie. The sea is not a corner.',
    ],
  },
  'maze-drift': {
    start: [
      'Drift night in the yard. No rivals, just you and the angle.',
      'The crowd is on the containers. Points for angle and nerve.',
      'Green light, drift mode. The yard is yours, Rookie.',
    ],
    idle: [
      'Angle is the score here, not the position. Bank the slide.',
      'The crowd on the containers keeps count. Keep it interesting.',
      'No rivals tonight. The yard is the only opponent.',
      'Hold the angle through the lanes. The boxes are the wall.',
      'That slide had points in it. The cranes are jealous.',
    ],
  },
};

/** Radio lines for the three new rivals. Each line names the rival. */
export const RIVAL_RADIO_2: Record<string, string[]> = {
  Nova: [
    'Nova turns the Strip into a slide. Watch the rear end.',
    'Nova is warmed up on the boulevards. She does not brake.',
    'Nova and the neon, Rookie. The rain only helps her.',
    'Nova does not like being paid to lose.',
  ],
  Brick: [
    'Brick is a dock-union wall. He does not lift, and he does not yield.',
    'Brick holds the lane like he owns the dock. Tonight he is wrong.',
    'Brick will not move over. Plan the pass early, Rookie.',
    'Brick gave his word to the union. He has never broken it.',
  ],
  Calloway: [
    'Calloway owns the Cliffside. He brakes later than the rail.',
    'Calloway is at home on the coast. The sea is his home stretch.',
    'Calloway lifts late and brakes later. The rail is his mirror.',
    'Calloway built the rail. He is starting to wonder who paid for it.',
  ],
};
