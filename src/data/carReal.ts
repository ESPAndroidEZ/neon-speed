/**
 * Real-world reference specs per car (typical published figures for the version named) and typical power-stage
 * results seen in the tuning scene. Approximate averages for a sense of scale, not guarantees for any one car.
 * The physics is calibrated to these (tests/lab/real-calibrate.mts: real kg, peak Nm, redline, 0-100 km/h).
 */
export type Drive = 'FWD' | 'AWD' | 'RWD';

export interface StageSpec {
  ps: number;
  nm: number;
  /** What a typical build at this stage includes. */
  parts: string;
}

export interface RealSpec {
  version: string;
  drive: Drive;
  kg: number;
  ps: number;
  psRpm: number;
  nm: number;
  nmRpm: number;
  redline: number;
  zeroTo100: number;
  top: number;
  engine: string;
  /** Stage 1-4 (stage 0 = stock, the fields above). */
  stages: readonly [StageSpec, StageSpec, StageSpec, StageSpec];
}

const s = (ps: number, nm: number, parts: string): StageSpec => ({ ps, nm, parts });

export const REAL: Record<string, RealSpec> = {
  civic: { version: 'Civic Type R (EK9, 1997)', drive: 'FWD', kg: 1070, ps: 185, psRpm: 8200, nm: 160, nmRpm: 7500, redline: 8400, zeroTo100: 6.8, top: 225, engine: '1.6 VTEC I4 (B16B), naturally aspirated',
    stages: [s(195, 165, 'intake, exhaust, ECU tune'), s(210, 172, 'header, cams, ECU'), s(280, 250, 'bolt-on supercharger kit'), s(380, 340, 'turbo kit on built internals')] },
  golf: { version: 'Golf IV GTI 1.8T (180 PS)', drive: 'FWD', kg: 1260, ps: 180, psRpm: 5500, nm: 235, nmRpm: 3300, redline: 6500, zeroTo100: 7.9, top: 222, engine: '1.8 20V turbo I4',
    stages: [s(215, 300, 'ECU remap'), s(240, 330, 'remap, intake, intercooler, downpipe'), s(285, 370, 'hybrid turbo, injectors'), s(360, 420, 'big turbo on built internals')] },
  '350z': { version: '350Z (Z33, 2003)', drive: 'RWD', kg: 1440, ps: 287, psRpm: 6200, nm: 363, nmRpm: 4800, redline: 6600, zeroTo100: 5.9, top: 250, engine: '3.5 V6 (VQ35DE), naturally aspirated',
    stages: [s(305, 375, 'intake, exhaust, ECU tune'), s(325, 385, 'plenum, headers, cams'), s(420, 440, 'supercharger kit'), s(520, 560, 'twin-turbo kit, built engine')] },
  rx7: { version: 'RX-7 Type R (FD3S)', drive: 'RWD', kg: 1260, ps: 280, psRpm: 6500, nm: 314, nmRpm: 5000, redline: 8000, zeroTo100: 5.3, top: 255, engine: '1.3 twin-rotor, sequential twin turbo (13B-REW)',
    stages: [s(320, 350, 'ECU, intake, exhaust'), s(360, 390, 'downpipe, intercooler, boost'), s(450, 460, 'single-turbo conversion'), s(550, 540, 'big single turbo, ported built engine')] },
  e61: { version: '535d Touring (E61)', drive: 'RWD', kg: 1780, ps: 272, psRpm: 4400, nm: 560, nmRpm: 2000, redline: 5000, zeroTo100: 6.6, top: 250, engine: '3.0 twin-turbo diesel I6 (M57)',
    stages: [s(320, 650, 'ECU remap'), s(340, 700, 'remap, intake, intercooler'), s(380, 780, 'hybrid turbos'), s(420, 850, 'bigger hybrids, injectors, gearbox tune')] },
  m3: { version: 'M3 (E46)', drive: 'RWD', kg: 1495, ps: 343, psRpm: 7900, nm: 365, nmRpm: 4900, redline: 8000, zeroTo100: 5.2, top: 250, engine: '3.2 straight six (S54), naturally aspirated',
    stages: [s(355, 370, 'intake, exhaust, ECU tune'), s(375, 380, 'headers, cams'), s(470, 450, 'supercharger kit'), s(560, 520, 'turbo kit, built engine')] },
  evo: { version: 'Lancer Evolution VIII GSR', drive: 'AWD', kg: 1410, ps: 280, psRpm: 6500, nm: 392, nmRpm: 3500, redline: 7000, zeroTo100: 5.1, top: 250, engine: '2.0 turbo I4 (4G63)',
    stages: [s(320, 430, 'ECU remap'), s(360, 470, 'downpipe, intercooler, fuel pump'), s(420, 520, 'hybrid turbo'), s(520, 600, 'big turbo, built engine')] },
  supra: { version: 'Supra RZ (A80, twin turbo)', drive: 'RWD', kg: 1510, ps: 326, psRpm: 5600, nm: 441, nmRpm: 4000, redline: 6800, zeroTo100: 4.9, top: 250, engine: '3.0 twin-turbo straight six (2JZ-GTE)',
    stages: [s(380, 480, 'boost, ECU, exhaust'), s(420, 520, 'downpipe, intercooler, injectors'), s(550, 620, 'single-turbo conversion'), s(700, 780, 'big single turbo, built engine')] },
};

/** Spec at a power stage (0 = stock). */
export function stageSpec(id: string, stage: number): { ps: number; nm: number; parts: string } {
  const r = REAL[id];
  return stage <= 0 ? { ps: r.ps, nm: r.nm, parts: 'stock' } : r.stages[Math.min(4, stage) - 1];
}
