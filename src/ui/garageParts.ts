import { REV_TEST } from '../audio/revTest';
import { measureCar, type CarStats } from '../physics/carStats';
import type { CarSpec } from '../data/cars';
import { button } from './uiKit';
import { t } from '../i18n';

/** Small helpers of the garage screen: cached stats, colour hex, bar clamp and the hold-to-rev button. */
const statCache = new Map<string, CarStats>();
export const statsOf = (c: CarSpec): CarStats => {
  let s = statCache.get(c.id);
  if (!s) statCache.set(c.id, (s = measureCar(c.tuning)));
  return s;
};
export const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
export const clamp01 = (v: number): number => Math.max(0.04, Math.min(1, v));

/** "Sound test": hold to rev any car (owned or not) from idle to the limiter with shifts; release for the lift-off pops. */
export function soundTest(carId: string): HTMLElement {
  const b = button(t('garage.sound'), () => undefined);
  b.style.cssText += ';width:100%;margin-top:6px;touch-action:none';
  const down = (e: Event): void => { e.preventDefault(); if (REV_TEST.carId !== carId) REV_TEST.start(carId); REV_TEST.holding = true; b.classList.add('on'); };
  const up = (): void => { REV_TEST.holding = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', down);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, up);
  return b;
}
