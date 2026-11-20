// @ts-nocheck
// A tiny mock AudioContext for music tests: counts oscillators started per destination chain and records every
// AudioParam event, so tests can check that songs start, fades never jump and nothing runs away.
export function mockAudio() {
  const stats = { nodes: 0, osc: 0, jumps: 0 };
  const param = (v = 0) => {
    const p = { value: v, events: [],
      setValueAtTime(x, t) { p.events.push(['set', x, t]); p.value = x; return p; },
      linearRampToValueAtTime(x, t) { p.events.push(['lin', x, t]); return p; },
      exponentialRampToValueAtTime(x, t) { p.events.push(['exp', x, t]); return p; },
      setTargetAtTime(x, t, tau) { p.events.push(['tgt', x, t, tau]); return p; },
      cancelScheduledValues(t) { p.events.push(['cancel', 0, t]); return p; } };
    return p;
  };
  const node = (kind) => () => {
    stats.nodes++;
    const n = { kind, gain: param(1), frequency: param(440), detune: param(), Q: param(), delayTime: param(), playbackRate: param(1),
      outs: [], connect(x) { n.outs.push(x); return x; }, start() { if (kind === 'osc') stats.osc++; }, stop() {}, type: '', buffer: null };
    return n;
  };
  const ctx = { currentTime: 0, state: 'running', sampleRate: 8000,
    createGain: node('gain'), createOscillator: node('osc'), createBiquadFilter: node('filter'), createConvolver: node('conv'),
    createDelay: node('delay'), createBufferSource: node('src'), createBuffer: (c, l) => ({ getChannelData: () => new Float32Array(l) }) };
  const bus = { ctx, music: node('gain')(), noise: {} };
  return { ctx, bus, stats };
}
