import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { COPS, type RoamPolice } from '../../physics/roamPolice';

export interface PoliceView { readonly group: Group; update(p: RoamPolice, t: number): void; dispose(): void }

/**
 * The police cars: a dark body, a white door stripe and a light bar that flashes red and blue. Every cop is five boxes
 * (15 draw calls for three) built once; only the cops that are out are visible.
 */
export function policeView(): PoliceView {
  const geo = { body: new BoxGeometry(1.9, 0.62, 4.6), cabin: new BoxGeometry(1.6, 0.5, 2.3), stripe: new BoxGeometry(1.94, 0.22, 3.4), bar: new BoxGeometry(0.8, 0.18, 0.5) };
  const dark = new MeshStandardMaterial({ color: 0x1b1e27, roughness: 0.4, metalness: 0.4 }), white = new MeshStandardMaterial({ color: 0xf2f5fa, roughness: 0.45, emissive: 0x303844, emissiveIntensity: 0.6 });
  const red = new MeshBasicMaterial({ color: 0xff2030 }), blue = new MeshBasicMaterial({ color: 0x2a6bff });
  const group = new Group();
  group.name = 'police';
  const cops: Group[] = [];
  for (let i = 0; i < COPS; i++) {
    const c = new Group();
    const add = (g: BoxGeometry, m: MeshStandardMaterial | MeshBasicMaterial, x: number, y: number, z: number): void => { const o = new Mesh(g, m); o.position.set(x, y, z); c.add(o); };
    add(geo.body, white, 0, 0.62, 0); add(geo.cabin, dark, 0, 1.17, -0.2); add(geo.stripe, dark, 0, 0.6, 0.1); // white car, black doors and glass
    add(geo.bar, red, -0.42, 1.55, -0.2); add(geo.bar, blue, 0.42, 1.55, -0.2);
    c.visible = false;
    group.add(c);
    cops.push(c);
  }
  return {
    group,
    update(p, t) {
      const flash = Math.sin(t * 16) > 0;
      red.color.setRGB(flash ? 3.5 : 0.9, 0.1, 0.12); // above 1: the bloom picks the bars up; neither bar goes fully dark
      blue.color.setRGB(0.15, flash ? 0.4 : 0.9, flash ? 1.0 : 3.5);
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
