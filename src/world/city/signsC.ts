import type { SignSpec } from './signs';

/** Neon Harbor district signs (task 065, built by Claude): harbour, industrial, old town and strip trades. Fictional. */
export const SIGNS_C: SignSpec[] = [
  { text: 'TIDE MARKET', sub: 'FRESH CATCH', color: '#18d8ff', alt: '#ffffff', style: 'solid', icon: 'bowl' },
  { text: 'ANCHOR & CO', sub: 'SHIP CHANDLER', color: '#ffb347', alt: '#18d8ff', style: 'bar', icon: 'ring' },
  { text: 'SALT DOG', sub: 'SAILOR BAR', color: '#ff2a9d', alt: '#c8f4ff', style: 'tube', icon: 'cup' },
  { text: 'NIGHT SHIFT', sub: '24 H DINER', color: '#ffd27d', alt: '#ff4fa3', style: 'tube', icon: 'cup' },
  { text: 'GRIP KINGS', sub: 'TYRES + WHEELS', color: '#ff9a2e', alt: '#ffffff', style: 'solid', icon: 'ring' },
  { text: 'OLD OVEN', sub: 'BAKERY', color: '#ffb347', alt: '#ffd27d', style: 'bar', icon: 'star' },
  { text: 'INK HOUSE', sub: 'TATTOO', color: '#7a5cff', alt: '#39ff88', style: 'tube', icon: 'star' },
  { text: 'ECHO BOX', sub: 'KARAOKE', color: '#ff4fa3', alt: '#18d8ff', style: 'solid', icon: 'bolt' },
];
