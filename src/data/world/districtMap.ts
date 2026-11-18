import type { District, DistrictId } from '../../types/world';

/** World square half size (m): the drivable area is 6144 m x 6144 m. */
export const WORLD_HALF = 3072;
/** District cell size (m): the map below is 12 x 12 cells. */
export const CELL = 512;

/**
 * Neon Harbor, north at the top, west on the left (docs/open-world.md). One letter per 512 m cell:
 * H hills, O old town, D downtown, S neon strip, I industrial/airfield, P harbour/docks, W bay and sea.
 */
const MAP = [
  'HHHHHHHHHHHH',
  'HHHHHHHHHHII',
  'HHHHHHHHHIII',
  'OOOHHHHSSIII',
  'OOODDDDSSIII',
  'OOODDDDSSIII',
  'OOODDDDSSIII',
  'OOODDDDSSIII',
  'WWWWPPPPPPII',
  'WWWWPPPPPPPI',
  'WWWWPPPPPPPP',
  'WWWWWWWWWWWW',
] as const;
const LETTER: Record<string, DistrictId> = { H: 'hills', O: 'oldtown', D: 'downtown', S: 'strip', I: 'industrial', P: 'harbour', W: 'bay' };

/** District at a world point (outside the square: the nearest edge cell). */
export function districtAt(x: number, z: number): DistrictId {
  const col = Math.min(11, Math.max(0, Math.floor((x + WORLD_HALF) / CELL)));
  const row = Math.min(11, Math.max(0, Math.floor((WORLD_HALF - z) / CELL)));
  return LETTER[MAP[row][col]];
}

/** Water: the bay (south-west) and the open sea along the south edge. Only the Bay Bridge crosses it. */
export const isWater = (x: number, z: number): boolean => districtAt(x, z) === 'bay';

/** Looks per district: fog, lamp/key colours, lit windows (night). */
export const DISTRICT_LOOK: Readonly<Record<DistrictId, District>> = {
  downtown: { id: 'downtown', name: 'district.downtown', fog: 0x0a1020, fogDensity: 0.0024, lamp: 0xdfeaff, key: 0x6fb8ff, window: 0xbfe4ff, lit: 0.55 },
  harbour: { id: 'harbour', name: 'district.harbour', fog: 0x140c08, fogDensity: 0.003, lamp: 0xffa040, key: 0xff9a3c, window: 0xffc070, lit: 0.2 },
  oldtown: { id: 'oldtown', name: 'district.oldtown', fog: 0x120c10, fogDensity: 0.0028, lamp: 0xffc890, key: 0xffb070, window: 0xffd29a, lit: 0.45 },
  strip: { id: 'strip', name: 'district.strip', fog: 0x16061a, fogDensity: 0.0022, lamp: 0xff4fd0, key: 0xff2a9d, window: 0xff7ae0, lit: 0.7 },
  hills: { id: 'hills', name: 'district.hills', fog: 0x060a12, fogDensity: 0.0014, lamp: 0xfff0d0, key: 0x8fa8d8, window: 0xffe0a8, lit: 0.3 },
  industrial: { id: 'industrial', name: 'district.industrial', fog: 0x0c0e0a, fogDensity: 0.002, lamp: 0xd8ffb0, key: 0x9fd890, window: 0xe8ffc8, lit: 0.12 },
  bay: { id: 'bay', name: 'district.bay', fog: 0x040812, fogDensity: 0.0012, lamp: 0xffffff, key: 0x7fa0ff, window: 0xffffff, lit: 0 },
};
