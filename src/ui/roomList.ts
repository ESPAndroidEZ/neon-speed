import type { Lobby } from '../net/lobby';
import type { NetPlayer } from '../net/protocol';
import type { RoomInfo } from '../net/serverLink';
import { findTrackDef } from '../data/tracks';
import { t, tx, type StringKey } from '../i18n';
import { button, h } from './uiKit';

/** "Kestrel Bay · rain · 3/8" for one open room (plain text: the track id comes from another player). */
export function roomText(r: RoomInfo): string {
  const w = ['CLEAR', 'RAIN', 'SNOW'].includes(r.weather) ? t(`weather.${r.weather}` as StringKey).toLowerCase() : '';
  return `${tx(findTrackDef(r.track).name)} · ${w} · ${r.n}/${r.max}`;
}

/** First open room with space, or null: quick join takes the newest (the server lists newest first). */
export const pickRoom = (rooms: readonly RoomInfo[]): RoomInfo | null => rooms.find((r) => !r.racing && r.n < r.max) ?? null;

/**
 * Open rooms on our lobby server with a Join button each, plus "Quick race": join the newest open room, or open a
 * public one. Hidden when the server is not reachable (friends still play by code over PeerJS).
 */
export function roomList(L: Lobby, player: () => NetPlayer): HTMLElement {
  const box = h('section', 'rb-panel');
  box.style.cssText += ';width:min(460px,94vw);display:none';
  const fill = (rooms: RoomInfo[]): void => {
    box.replaceChildren(h('h3', '', t('on.open')));
    const quick = button(t('on.quick'), () => {
      const r = pickRoom(rooms);
      void (r ? L.join(r.code, player()) : L.create(player(), true));
    }, 'hot');
    box.append(quick, h('div', 'rb-sub', t(rooms.length ? 'on.quickHow' : 'on.noRooms')));
    for (const r of rooms.slice(0, 8)) {
      const row = h('div', 'rb-row', '<b style="letter-spacing:3px"></b><span class="rb-sub" style="flex:1;text-align:left"></span>');
      (row.firstElementChild as HTMLElement).textContent = r.code;
      (row.children[1] as HTMLElement).textContent = roomText(r);
      const b = button(t('on.join'), () => void L.join(r.code, player()));
      b.disabled = r.racing || r.n >= r.max || L.busy;
      b.style.cssText += ';min-width:0;flex:0 0 auto;padding:8px 14px'; // the room text keeps the width
      row.append(b);
      box.append(row);
    }
    box.append(button(t('on.refresh'), load));
    box.style.display = '';
  };
  let tries = 0;
  const load = (): void => {
    void L.link.rooms().then((rooms) => {
      if (L.link.serverKnown) fill(rooms);
      else if (++tries < 5) setTimeout(() => { if (box.isConnected) load(); }, 12000); // slow start or a blip
    });
  };
  load();
  return box;
}
