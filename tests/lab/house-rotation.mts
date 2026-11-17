// @ts-nocheck
// Drives HouseMusic with a mock AudioContext: skipping and automatic rotation reach every song, no runaway loops.
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
let n = 0;
const node = () => { n++; return { gain: param(), frequency: param(), detune: param(), Q: param(), delayTime: param(), playbackRate: param(), connect(x) { return x; }, start() {}, stop() {} }; };
const ctx = { currentTime: 0, state: 'running', sampleRate: 8000, createGain: node, createOscillator: node, createBiquadFilter: node, createConvolver: node, createDelay: node, createBufferSource: node,
  createBuffer: (c, l) => ({ getChannelData: () => new Float32Array(l) }) };
const { HouseMusic } = await import('../../src/audio/houseMusic.ts');
const { MUSIC_SOURCE } = await import('../../src/audio/audioParams.ts');
const m = new HouseMusic({ ctx, music: node(), noise: {} });
console.log('start', MUSIC_SOURCE.song);
for (let i = 0; i < 5; i++) { MUSIC_SOURCE.skip++; m.update(true, 0.3); console.log('skip ->', MUSIC_SOURCE.song); }
const seen = new Set();
for (let f = 0; f < 60 * 60 * 8; f++) { ctx.currentTime += 1 / 60; m.update(true, (f % 600) / 600); seen.add(MUSIC_SOURCE.song); }
console.log('8 min auto rotation:', [...seen].join(', '), '| nodes', n);
