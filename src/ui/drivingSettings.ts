import type { SaveStore } from '../core/save';
import { LOOK_IDS, LOOKS, setLook } from '../core/looks';
import { storyComplete } from '../core/career';
import { AI_SETTING, DIFFICULTIES } from '../physics/aiDifficulty';
import { DRIVING, HANDLING } from '../physics/assists';
import { unitsRow } from './unitsRow';
import { button, h } from './uiKit';
import { t, tx } from '../i18n';
import type { StringKey } from '../i18n';
import { applyCalm } from './calm';
import { applyColorSafe } from './colorSafe';
import { getTextSize, setTextSize } from './textScale';
import { textSizeRow } from './textSizeRow';

/** Copy the saved driving preferences into the physics singleton and the gamepad. */
export function applyDrivingSettings(store: SaveStore, pad?: { deadZone: number; rumbleOn: boolean }): void {
  const s = store.data.settings;
  DRIVING.level = s.assist;
  DRIVING.sens = s.steerSens;
  HANDLING.model = s.handlingModel;
  DRIVING.stability = s.stability;
  setLook(s.look);
  applyCalm(s.calmUi);
  applyColorSafe(s.colorSafe);
  setTextSize(getTextSize()); // paints the stored menu text size
  AI_SETTING.level = s.difficulty === 'LEGEND' && !storyComplete(store.data.career) ? 'STREET' : s.difficulty;
  if (pad) {
    pad.deadZone = s.padDeadzone;
    pad.rumbleOn = s.rumble;
  }
}

/** A labelled row of choice buttons with a hint line; `pick` stores the choice. */
function choiceRow<T extends string>(label: string, opts: readonly T[], get: () => T, pick: (v: T) => void, hintKey: string): HTMLElement[] {
  const row = h('div', 'rb-row', `<span class="rb-lbl">${label}</span>`);
  const hint = h('div', 'rb-sub', t(`${hintKey}.${get()}` as StringKey));
  const refresh = (): void => {
    row.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === get()));
    hint.textContent = t(`${hintKey}.${get()}` as StringKey);
  };
  for (const o of opts) {
    const b = button(t(`opt.${o}` as StringKey), () => { pick(o); refresh(); });
    b.dataset.lv = o;
    b.style.minWidth = '90px';
    row.append(b);
  }
  refresh();
  return [row, hint];
}

/** Driving options as settings rows: `basic` = assists and opponents, `advanced` = the rest (look, handling model, sensitivity, gamepad, units). */
export function drivingRows(store: SaveStore, onChange: () => void): { basic: HTMLElement[]; advanced: HTMLElement[] } {
  const s = store.data.settings;
  const save = (): void => {
    store.commit();
    onChange();
  };
  const assist = h('div', 'rb-row', `<span class="rb-lbl">${t('drv.assists')}</span>`);
  const hint = h('div', 'rb-sub', t(`hint.assist.${s.assist}`));
  const refresh = (): void => {
    assist.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === s.assist));
    hint.textContent = t(`hint.assist.${s.assist}`);
  };
  for (const lv of ['BEGINNER', 'STANDARD', 'PRO'] as const) {
    const b = button(t(`opt.${lv}`), () => {
      s.assist = lv;
      save();
      refresh();
    });
    b.dataset.lv = lv;
    b.style.minWidth = '100px';
    assist.append(b);
  }
  refresh();
  const lookRow = h('div', 'rb-row', `<span class="rb-lbl">${t('drv.look')}</span>`);
  const refreshLook = (): void => lookRow.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === s.look));
  for (const id of LOOK_IDS) {
    const b = button(tx(LOOKS[id].name), () => {
      s.look = id;
      save();
      refreshLook();
    });
    b.dataset.lv = id;
    b.style.minWidth = '130px';
    lookRow.append(b);
  }
  refreshLook();
  const diff = h('div', 'rb-row', `<span class="rb-lbl">${t('drv.opponents')}</span>`);
  const diffHint = h('div', 'rb-sub', '');
  const refreshDiff = (): void => {
    diff.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('hot', b.dataset.lv === s.difficulty);
      (b as HTMLButtonElement).disabled = b.dataset.lv === 'LEGEND' && !storyComplete(store.data.career);
    });
    diffHint.textContent = t(`hint.diff.${s.difficulty}`);
  };
  for (const lv of DIFFICULTIES) {
    const b = button(t(`opt.${lv}`), () => {
      s.difficulty = lv;
      save();
      refreshDiff();
    });
    b.dataset.lv = lv;
    b.style.minWidth = '90px';
    diff.append(b);
  }
  refreshDiff();
  const range = (label: string, key: 'steerSens' | 'padDeadzone', min: number, max: number, step: number): HTMLElement => {
    const row = h('div', 'rb-row', `<span class="rb-lbl">${label}</span>`);
    const input = h('input') as HTMLInputElement;
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(s[key]);
    input.addEventListener('input', () => {
      s[key] = parseFloat(input.value);
      onChange();
    });
    input.addEventListener('change', () => store.commit());
    row.append(input);
    return row;
  };
  const rumble = h('label', 'rb-row', `<span class="rb-lbl">${t('drv.rumble')}</span>`);
  const box = h('input') as HTMLInputElement;
  box.type = 'checkbox';
  box.checked = s.rumble;
  box.addEventListener('change', () => {
    s.rumble = box.checked;
    save();
  });
  rumble.append(box);
  const calm = h('label', 'rb-row', `<span class="rb-lbl">${t('drv.calm')}</span>`);
  const calmBox = h('input') as HTMLInputElement;
  calmBox.type = 'checkbox';
  calmBox.checked = s.calmUi;
  calmBox.addEventListener('change', () => {
    s.calmUi = calmBox.checked;
    applyCalm(s.calmUi);
    save();
  });
  calm.append(calmBox);
  const cb = h('label', 'rb-row', `<span class="rb-lbl">${t('drv.cb')}</span>`);
  const cbBox = h('input') as HTMLInputElement;
  cbBox.type = 'checkbox';
  cbBox.checked = s.colorSafe;
  cbBox.addEventListener('change', () => {
    s.colorSafe = cbBox.checked;
    applyColorSafe(s.colorSafe);
    save();
  });
  cb.append(cbBox);
  const model = choiceRow(t('drv.handling'), ['legacy', 'v2'] as const, () => s.handlingModel, (v) => { s.handlingModel = v; save(); }, 'hint.model');
  const stab = choiceRow(t('drv.stability'), ['OFF', 'LIGHT', 'FULL'] as const, () => s.stability, (v) => { s.stability = v; save(); }, 'hint.stab');
  return { basic: [assist, hint, diff, diffHint], advanced: [lookRow, ...model, ...stab, range(t('drv.steerSens'), 'steerSens', 0.6, 1.4, 0.05), range(t('drv.deadzone'), 'padDeadzone', 0.02, 0.4, 0.02), rumble, calm, cb, unitsRow(), textSizeRow()] };
}
