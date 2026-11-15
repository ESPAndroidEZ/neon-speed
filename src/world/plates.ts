import { CanvasTexture, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

/** Fictional Kestrel Bay plate: light reflective plate, blue city band on the left, the owner's text (up to 8 chars). */
function drawPlate(c: HTMLCanvasElement, text: string): void {
  const g = c.getContext('2d');
  if (!g) return;
  const { width: w, height: h } = c;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#11131a';
  g.beginPath(); g.roundRect(0, 0, w, h, 10); g.fill();
  g.fillStyle = '#eef1f6';
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 8); g.fill();
  g.fillStyle = '#1f4fd6';
  g.beginPath(); g.roundRect(4, 4, 34, h - 8, [8, 0, 0, 8]); g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 15px system-ui,sans-serif';
  g.textAlign = 'center';
  g.fillText('KB', 21, h - 14);
  const t = (text || ' ').toUpperCase().slice(0, 8);
  g.fillStyle = '#12151e';
  let size = 40;
  g.font = `900 ${size}px "DejaVu Sans Mono",Menlo,Consolas,monospace`;
  while (g.measureText(t).width > w - 60 && size > 18) g.font = `900 ${(size -= 2)}px "DejaVu Sans Mono",Menlo,Consolas,monospace`;
  g.textBaseline = 'middle';
  g.fillText(t, (w + 38) / 2, h / 2 + 2);
}

export interface Plates {
  readonly group: Group;
  setText(text: string): void;
}

/**
 * Front and rear number plates for a car of `length` m (nose +Z). One canvas texture shared by both plates;
 * `setText` redraws it (garage edits show live). Freed with the car by world/disposeVisual.
 */
export function createPlates(length: number, frontY = 0.36, rearY = 0.5, text = ''): Plates {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 56;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.1 });
  const geo = new PlaneGeometry(0.52, 0.114);
  const front = new Mesh(geo, mat);
  front.position.set(0, frontY, length / 2 + 0.012);
  const rear = new Mesh(geo, mat);
  rear.position.set(0, rearY, -length / 2 - 0.012);
  rear.rotation.y = Math.PI;
  const group = new Group();
  group.name = 'plates';
  group.add(front, rear);
  let current = '';
  const setText = (t: string): void => {
    if (t === current) return;
    current = t;
    drawPlate(canvas, t);
    tex.needsUpdate = true;
  };
  setText(text);
  return { group, setText };
}
