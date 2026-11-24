import { Color, DirectionalLight, Group, HemisphereLight, Mesh, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { TimeOfDay, TODS } from '../src/world/open/timeOfDay.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const mem: Record<string, string> = {};
const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
const store = new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id));

const scene = new Scene();
const hemi = new HemisphereLight(0x5464a8, 0x1a1a26, 2.3), moon = new DirectionalLight(0x8fa4ff, 0.7);
const mat = new ShaderMaterial({ uniforms: { top: { value: new Color(0x101030) }, horizon: { value: new Color(0x302040) }, stars: { value: 1 }, moon: { value: 1 } } });
const dome = new Group(); dome.add(new Mesh(new PlaneGeometry(1, 1), mat));
scene.add(hemi, moon, dome);
const tod = new TimeOfDay(scene, store);

check('four times of day and night is the default', TODS.length === 4 && tod.tod === 'night');
for (let i = 0; i < 120; i++) tod.update(1 / 60);
check('night changes nothing', hemi.intensity === 2.3 && mat.uniforms.stars.value === 1 && tod.fog.w === 0 && tod.fog.k === 1);
tod.set('day');
for (let i = 0; i < 300; i++) tod.update(1 / 60);
check('day brightens the lights and empties the sky of stars', hemi.intensity > 2.3 * 1.2 && moon.intensity > 0.7 * 1.2 && mat.uniforms.stars.value < 0.05 && mat.uniforms.moon.value < 0.05);
check('day paints a blue sky', (mat.uniforms.top.value as Color).b > (mat.uniforms.top.value as Color).r && (mat.uniforms.horizon.value as Color).getHex() !== 0x302040);
check('day thins and lightens the fog', tod.fog.w > 0.7 && tod.fog.k < 0.7 && tod.fog.color.getHex() === 0xb8d4ee, `w ${tod.fog.w.toFixed(2)} k ${tod.fog.k.toFixed(2)}`);
tod.set('dusk');
for (let i = 0; i < 300; i++) tod.update(1 / 60);
check('dusk is warmer than day and its horizon orange', hemi.intensity < 2.3 * 1.5 && (mat.uniforms.horizon.value as Color).r > (mat.uniforms.horizon.value as Color).b);
tod.set('night');
check('back to night: the lights are restored at once', hemi.intensity === 2.3 && moon.intensity === 0.7 && hemi.color.getHex() === 0x5464a8 && hemi.groundColor.getHex() === 0x1a1a26 && tod.fog.w === 0);
tod.set('dawn');
for (let i = 0; i < 200; i++) tod.update(1 / 60);
tod.reset();
check('leaving Free Drive restores the lights', hemi.intensity === 2.3 && moon.color.getHex() === 0x8fa4ff);
check('the choice is saved', store.data.settings.tod === 'dawn' && new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id)).data.settings.tod === 'dawn');
check('cycling goes night, dusk, dawn, day, night', (() => { tod.set('night'); const seq: string[] = []; for (let i = 0; i < 4; i++) seq.push(tod.cycle()); return seq.join() === 'dusk,dawn,day,night'; })());
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
