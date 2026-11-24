import type { SaveStore } from '../core/save';
import { h } from './uiKit';
import { t, type StringKey } from '../i18n';

type BoolSetting = 'raceIntro';

/** A checkbox row for a yes/no setting in the save: the label, the box, saved at once. */
export function toggleRow(store: SaveStore, key: BoolSetting, label: StringKey): HTMLElement {
  const row = h('label', 'rb-row', `<span class="rb-lbl">${t(label)}</span>`);
  const box = h('input') as HTMLInputElement;
  box.type = 'checkbox';
  box.checked = store.data.settings[key];
  box.addEventListener('change', () => { store.data.settings[key] = box.checked; store.commit(); });
  row.append(box);
  return row;
}
