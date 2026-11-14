/** Web Audio plumbing: context, master volume/mute, buses for sfx and music, shared noise. */
export class AudioBus {
  readonly ctx: AudioContext;
  readonly sfx: GainNode;
  readonly music: GainNode;
  readonly noise: AudioBuffer;
  private readonly master: GainNode;
  private readonly chase: BiquadFilterNode;
  private sfxVol = 1;
  private musicVol = 0.55;
  private vol = 0.7;
  private mutedFlag = false;

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.music.gain.value = this.musicVol;
    // chase mix: a slight low-pass takes the edge off everything the camera hears from outside the cabin
    this.chase = this.ctx.createBiquadFilter();
    this.chase.type = 'lowpass';
    this.chase.frequency.value = 9500;
    this.chase.Q.value = 0.5;
    this.sfx.connect(this.chase).connect(this.master);
    this.music.connect(this.master);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b = b * 0.6 + w * 0.4; // lightly coloured noise: less hissy than pure white
      d[i] = b * 1.6;
    }
    this.apply();
    // Browsers keep audio suspended until a user gesture.
    const unlock = (): void => {
      void this.ctx.resume();
    };
    for (const ev of ['keydown', 'pointerdown', 'touchstart']) window.addEventListener(ev, unlock);
  }

  get volume(): number {
    return this.vol;
  }

  get muted(): boolean {
    return this.mutedFlag;
  }

  setVolume(v: number): void {
    this.vol = Math.min(1, Math.max(0, v));
    this.apply();
  }

  setSfxVolume(v: number): void {
    this.sfxVol = Math.min(1, Math.max(0, v));
    this.sfx.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.03);
  }

  setMusicVolume(v: number): void {
    this.musicVol = Math.min(1, Math.max(0, v));
    this.music.gain.setTargetAtTime(this.musicVol, this.ctx.currentTime, 0.03);
  }

  setChaseCutoff(hz: number): void {
    this.chase.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.2);
  }

  setMuted(m: boolean): void {
    this.mutedFlag = m;
    this.apply();
  }

  toggleMute(): boolean {
    this.setMuted(!this.mutedFlag);
    return this.mutedFlag;
  }

  /** Looping noise source routed to `dest` through nothing else; caller adds filters by chaining. */
  loopNoise(): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random();
    s.start(0, Math.random() * 1.5);
    return s;
  }

  private apply(): void {
    this.master.gain.setTargetAtTime(this.mutedFlag ? 0 : this.vol * this.vol, this.ctx.currentTime, 0.03);
  }
}
