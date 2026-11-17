/** Shared effect sends of the house music: a reverb (decaying stereo noise impulse) and a dotted-8th delay with a darkening feedback loop. */
export interface HouseSends {
  /** Connect a voice here for reverb. */
  verb: GainNode;
  /** Connect a voice here for the echo. */
  echo: GainNode;
  /** The delay line (its time follows the song tempo). */
  delay: DelayNode;
}

export function createHouseSends(ctx: BaseAudioContext, out: AudioNode, delayS: number): HouseSends {
  const verb = ctx.createGain();
  const conv = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 2.4);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  conv.buffer = ir;
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.32;
  verb.connect(conv).connect(verbOut).connect(out);
  const echo = ctx.createGain();
  const delay = ctx.createDelay(1);
  delay.delayTime.value = delayS;
  const fb = ctx.createGain();
  fb.gain.value = 0.34;
  const dark = ctx.createBiquadFilter();
  dark.type = 'lowpass';
  dark.frequency.value = 2200;
  echo.connect(delay).connect(dark).connect(fb).connect(delay);
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.5;
  dark.connect(echoOut).connect(out);
  return { verb, echo, delay };
}
