import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { COPS, type RoamPolice } from '../../physics/roamPolice';

export interface PoliceView { readonly group: Group; update(p: RoamPolice, t: number): void; dispose(): void }

/**
 * The police cars: a dark body, a white door stripe and a light bar that flashes red and blue. Every cop is five boxes
 * (15 draw calls for three) built once; only the cops that are out are visible.
 */
export function policeView(): PoliceView {
  const geo = { body: new BoxGeometry(1.9, 0.6, 4.6), cabin: new BoxGeometry(1.6, 0.5, 2.3), stripe: new BoxGeometry(1.94, 0.2, 2.1), bar: new BoxGeometry(0.62, 0.14, 0.42) };
  const dark = new MeshStandardMaterial({ color: 0x14161c, roughness: 0.4, metalness: 0.5 }), white = new MeshStandardMaterial({ color: 0xe8ecf4, roughness: 0.5 });
  const red = new MeshBasicMaterial({ color: 0xff2030 }), blue = new MeshBasicMaterial({ color: 0x2a6bff });
  const group = new Group();
  group.name = 'police';
  const cops: Group[] = [];
  for (let i = 0; i < COPS; i++) {
    const c = new Group();
    const add = (g: BoxGeometry, m: MeshStandardMaterial | MeshBasicMaterial, x: number, y: number, z: number): void => { const o = new Mesh(g, m); o.position.set(x, y, z); c.add(o); };
    add(geo.body, dark, 0, 0.62, 0); add(geo.cabin, dark, 0, 1.15, -0.2); add(geo.stripe, white, 0, 0.62, 0.1);
    add(geo.bar, red, -0.34, 1.5, -0.2); add(geo.bar, blue, 0.34, 1.5, -0.2);
    c.visible = false;
    group.add(c);
    cops.push(c);
  }
  return {
    group,
    update(p, t) {
      const flash = Math.sin(t * 16) > 0;
      red.color.setRGB(flash ? 3 : 0.15, 0.08, 0.1); // above 1: the bloom picks the bars up
      blue.color.setRGB(0.1, flash ? 0.15 : 0.5, flash ? 0.4 : 3);
      for (let i = 0; i < COPS; i++) {
        const on = i < p.count;
        cops[i].visible = on;
        if (on) { cops[i].position.set(p.x[i], p.y[i], p.z[i]); cops[i].rotation.y = p.h[i]; }
      }
    },
    dispose() {
      group.removeFromParent();
      for (const g of Object.values(geo)) g.dispose();
      for (const m of [dark, white, red, blue]) m.dispose();
    },
  };
}
