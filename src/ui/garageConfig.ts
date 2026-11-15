/**
 * Menu / garage camera framing. Plain data plus one helper: no imports.
 *
 * QWEN MAY: change any NUMBER below (and comments). QWEN MAY NOT: rename or remove a field, add imports, or edit
 * game/showroomCam.ts (it reads this). Screen positions are NDC so they hold for any aspect ratio: x -1 = left edge,
 * +1 = right edge, y +1 = top edge. The car's centre is placed there with a projection shift (the camera does not
 * move), so a value of 0.33 on x puts the car in the middle of the right two thirds on a phone, a monitor or 32:9.
 */
export const GARAGE_CONFIG = {
  /** Where the car sits on screen per layout: main = title and full-width screens, menu = main menu (button stack on the left), side = garage panel on the left (wide), sheet = garage bottom sheet (narrow). */
  main: { x: 0, y: 0 },
  menu: { x: 0.3, y: 0 },
  side: { x: 0.33, y: 0 },
  sheet: { x: 0, y: 0 },
  /** Width in px above which the garage uses the side panel; narrower screens use the bottom sheet. */
  sideLayoutMinWidth: 800,
  /** Orbit camera: distance (m), height (m), extra height per metre of distance, the point looked at (m, aims low so the car sits above menu panels), vertical fov, orbit speed (rad/s). */
  distance: 9.4,
  height: 1.8,
  heightPerMetre: 0.05,
  lookAtY: -0.25,
  fov: 45,
  orbitSpeed: 0.35,
  /** Narrow screens pull the camera back by max(1, narrowAspect / aspect). */
  narrowAspect: 1.5,
} as const;

export type GarageLayout = 'main' | 'menu' | 'side' | 'sheet';

/** Garage layout for a screen width. */
export const garageLayout = (widthPx: number): GarageLayout => (widthPx > GARAGE_CONFIG.sideLayoutMinWidth ? 'side' : 'sheet');
