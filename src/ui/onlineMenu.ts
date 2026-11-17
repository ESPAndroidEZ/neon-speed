import { findCar } from '../data/cars';
import { TRACKS } from '../data/tracks';
import { saveOnlineName, type Online } from '../game/onlineRace';
import { t } from '../i18n';
import { cleanCode, cleanName, MAX_PLAYERS } from '../net/protocol';
import { tx, type StringKey } from '../i18n';
import { button, h } from './uiKit';

const WEATHERS = ['CLEAR', 'RAIN', 'SNOW'] as const;

/** Online screen: name, create or join a room by code; in the room the player list, the host's track and weather, and "Start race for everyone". */
export function buildOnlineMenu(o: Online, onBack: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.style.cssText += ';overflow:auto;justify-content:flex-start;padding:max(16px,3vh) 14px max(20px,4vh)';
  const L = o.lobby;
  let code = '';

  const render = (): void => {
    if (!root.isConnected && root.childElementCount) { L.onChange = () => {}; return; }
    root.replaceChildren(h('h2', 'rb-title', t('on.title')));
    const err = L.error ? h('div', 'rb-note', t(`on.err.${L.error}` as StringKey, { msg: L.errorText })) : null;
    if (!L.inRoom) {
      const me = o.me();
      const panel = h('section', 'rb-panel');
      panel.style.width = 'min(460px,94vw)';
      const name = h('input') as HTMLInputElement;
      name.className = 'rb-input';
      name.maxLength = 16;
      name.value = me.name;
      name.addEventListener('change', () => { name.value = cleanName(name.value); saveOnlineName(name.value); });
      const codeIn = h('input') as HTMLInputElement;
      codeIn.className = 'rb-input';
      codeIn.placeholder = 'ABCD';
      codeIn.maxLength = 4;
      codeIn.value = code;
      codeIn.style.cssText = 'text-transform:uppercase;letter-spacing:6px;width:7.5em;text-align:center';
      codeIn.addEventListener('input', () => { codeIn.value = code = cleanCode(codeIn.value); });
      const player = () => { saveOnlineName(cleanName(name.value)); return { ...o.me(), name: cleanName(name.value) }; };
      const create = button(t('on.create'), () => void L.create(player()), 'hot');
      const join = button(t('on.join'), () => { if (code.length === 4) void L.join(code, player()); });
      create.disabled = join.disabled = L.busy;
      const row = (label: string, ...els: HTMLElement[]) => { const r = h('div', 'rb-row', `<span class="rb-lbl">${label}</span>`); r.append(...els); return r; };
      panel.append(row(t('on.name'), name), h('div', 'rb-sub', t('on.yourCar', { car: findCar(me.car).name })), create, row(t('on.code'), codeIn, join));
      if (L.busy) panel.append(h('div', 'rb-sub', t('on.connecting')));
      root.append(panel);
      if (err) root.append(err);
      root.append(h('div', 'rb-hint', t('on.how')), button(t('common.back'), onBack));
      codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') join.click(); });
      return;
    }
    const host = L.role === 'host';
    root.append(h('div', 'rb-sub', t('on.room')), h('div', 'rb-logo', L.code));
    root.lastElementChild?.setAttribute('style', 'letter-spacing:10px;font-size:clamp(34px,8vw,56px)');
    const list = h('section', 'rb-panel');
    list.style.width = 'min(460px,94vw)';
    list.append(h('h3', '', t('on.players', { n: L.players.length, max: MAX_PLAYERS })));
    for (const p of L.players) {
      const tags = [p.id === L.hostId ? t('on.host') : '', p.id === L.me.id ? t('on.you') : ''].filter(Boolean).join(' · ');
      const r = h('div', 'rb-row', `<b style="flex:1;text-align:left"></b><span class="rb-sub"></span>`);
      (r.firstElementChild as HTMLElement).textContent = p.name + (tags ? `  (${tags})` : '');
      (r.lastElementChild as HTMLElement).textContent = findCar(p.car).name;
      list.append(r);
    }
    if (L.players.length < 2) list.append(h('div', 'rb-sub', t('on.share')));
    root.append(list);
    const set = h('section', 'rb-panel');
    set.style.width = 'min(460px,94vw)';
    const pick = (label: string, items: readonly { id: string; name: string }[], cur: string, onPick: (id: string) => void) => {
      const r = h('div', 'rb-row', `<span class="rb-lbl">${label}</span>`);
      r.style.flexWrap = 'wrap';
      for (const it of items) {
        const b = button(it.name, () => onPick(it.id), it.id === cur ? 'hot' : '');
        b.disabled = !host;
        b.style.cssText += ';min-width:0;padding:8px 12px;font-size:13px';
        r.append(b);
      }
      return r;
    };
    set.append(
      pick(t('on.track'), TRACKS.map((d) => ({ id: d.id, name: tx(d.name) })), L.settings.track, (id) => L.setSettings({ track: id })),
      pick(t('on.weather'), WEATHERS.map((w) => ({ id: w, name: t(`weather.${w}` as StringKey) })), L.settings.weather, (id) => L.setSettings({ weather: id as typeof WEATHERS[number] })),
    );
    root.append(set);
    if (err) root.append(err);
    if (host) {
      const go = button(t('on.start'), () => L.start(), 'hot');
      go.disabled = L.racing;
      root.append(go);
    } else root.append(h('div', 'rb-sub', t(L.racing ? 'on.racing' : 'on.waiting')));
    root.append(button(t('on.leave'), () => L.leave()));
    root.append(button(t('common.back'), onBack));
  };
  L.onChange = render;
  render();
  return root;
}
