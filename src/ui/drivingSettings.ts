import type { SaveStore } from '../core/save';
import { LOOK_IDS, LOOKS, setLook } from '../core/looks';
import { storyComplete } from '../core/career';
import { AI_SETTING, DIFFICULTIES, type Difficulty } from '../physics/aiDifficulty';
import { DRIVING, type AssistLevel } from '../physics/assists';
import { button, h } from './uiKit';

const HINT: Record<AssistLevel, string> = {
  BEGINNER: 'Steering and brake assist, strong auto counter-steer. Hard to spin.',
  STANDARD: 'The balanced default.',
  PRO: 'No ABS, sharper steering, little counter-steer. You catch your own slides.',
};

/** Copy the saved driving preferences into the physics singleton and the gamepad. */
export function applyDrivingSettings(store: SaveStore, pad?: { deadZone: number; rumbleOn: boolean }): void {
  const s = store.data.settings;
  DRIVING.level = s.assist;
  DRIVING.sens = s.steerSens;
  setLook(s.look);
  AI_SETTING.level = s.difficulty === 'LEGEND' && !storyComplete(store.data.career) ? 'STREET' : s.difficulty;
  if (pad) {
    pad.deadZone = s.padDeadzone;
    pad.rumbleOn = s.rumble;
  }
}

/** Driving assists, steering sensitivity and gamepad options as settings rows. */
export function drivingRows(store: SaveStore, onChange: () => void): HTMLElement[] {
  const s = store.data.settings;
  const save = (): void => {
    store.commit();
    onChange();
  };
  const assist = h('div', 'rb-row', '<span style="width:90px">Driving assists</span>');
  const hint = h('div', 'rb-sub', HINT[s.assist]);
  const refresh = (): void => {
    assist.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === s.assist));
    hint.textContent = HINT[s.assist];
  };
  for (const lv of ['BEGINNER', 'STANDARD', 'PRO'] as const) {
    const b = button(lv.toLowerCase(), () => {
      s.assist = lv;
      save();
      refresh();
    });
    b.dataset.lv = lv;
    b.style.minWidth = '100px';
    assist.append(b);
  }
  refresh();
  const lookRow = h('div', 'rb-row', '<span style="width:90px">Look</span>');
  const refreshLook = (): void => lookRow.querySelectorAll('button').forEach((b) => b.classList.toggle('hot', b.dataset.lv === s.look));
  for (const id of LOOK_IDS) {
    const b = button(LOOKS[id].name.toLowerCase(), () => {
      s.look = id;
      save();
      refreshLook();
    });
    b.dataset.lv = id;
    b.style.minWidth = '130px';
    lookRow.append(b);
  }
  refreshLook();
  const diff = h('div', 'rb-row', '<span style="width:90px">Opponents</span>');
  const diffHint = h('div', 'rb-sub', '');
  const DIFF_HINT: Record<Difficulty, string> = { ROOKIE: 'Gentler rivals who make mistakes and help you catch up.', STREET: 'The default field.', PRO: 'Cleaner, braver, defend their line.', LEGEND: 'No mistakes, no rubber band. Unlocked after the story.' };
  const refreshDiff = (): void => {
    diff.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('hot', b.dataset.lv === s.difficulty);
      (b as HTMLButtonElement).disabled = b.dataset.lv === 'LEGEND' && !storyComplete(store.data.career);
    });
    diffHint.textContent = DIFF_HINT[s.difficulty];
  };
  for (const lv of DIFFICULTIES) {
    const b = button(lv.toLowerCase(), () => {
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
    const row = h('div', 'rb-row', `<span style="width:90px">${label}</span>`);
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
  const rumble = h('label', 'rb-row', '<span style="width:90px">Gamepad rumble</span>');
  const box = h('input') as HTMLInputElement;
  box.type = 'checkbox';
  box.checked = s.rumble;
  box.addEventListener('change', () => {
    s.rumble = box.checked;
    save();
  });
  rumble.append(box);
  return [lookRow, assist, hint, diff, diffHint, range('Steering sensitivity', 'steerSens', 0.6, 1.4, 0.05), range('Stick deadzone', 'padDeadzone', 0.02, 0.4, 0.02), rumble];
}
