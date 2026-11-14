import { partPrice, type CatalogPart } from './partsCatalog';

export const CATALOG_MORE: CatalogPart[] = [
  { slot: 'spoiler', id: 'ducktail', name: 'Ducktail', brand: 'Voltaic', tier: 1, price: partPrice('spoiler', 1), mul: { gripRear: 1.003, dragCoef: 1.005 } },
  { slot: 'spoiler', id: 'lip-slim', name: 'Slimline Lip', brand: 'Kestrel Aero', tier: 1, price: partPrice('spoiler', 1), mul: { gripRear: 1.004, dragCoef: 1.006 } },
  { slot: 'spoiler', id: 'twin-blade', name: 'Twin Blade', brand: 'Orbit', tier: 2, price: partPrice('spoiler', 2), mul: { gripRear: 1.007, dragCoef: 1.012 } },
  { slot: 'spoiler', id: 'swan-neck', name: 'Swan Neck', brand: 'Halden', tier: 2, price: partPrice('spoiler', 2), mul: { gripRear: 1.008, dragCoef: 1.015 } },
  { slot: 'spoiler', id: 'roof-fin', name: 'Roof Fin', brand: 'Nimbus', tier: 2, price: partPrice('spoiler', 2), mul: { gripRear: 1.009, dragCoef: 1.018 } },
  { slot: 'spoiler', id: 'big-wing', name: 'Big Wing', brand: 'Argo', tier: 3, price: partPrice('spoiler', 3), mul: { gripRear: 1.012, dragCoef: 1.04 } },
  { slot: 'splitter', id: 'lip-wide', name: 'Widebody Lip', brand: 'Tekton', tier: 1, price: partPrice('splitter', 1), mul: { gripFront: 1.003, dragCoef: 1.005 } },
  { slot: 'splitter', id: 'dual-fin', name: 'Dual Fin', brand: 'Voltaic', tier: 2, price: partPrice('splitter', 2), mul: { gripFront: 1.006, dragCoef: 1.010 } },
  { slot: 'splitter', id: 'canard', name: 'Canard', brand: 'Kestrel Aero', tier: 2, price: partPrice('splitter', 2), mul: { gripFront: 1.007, dragCoef: 1.013 } },
  { slot: 'splitter', id: 'plow', name: 'Plow', brand: 'Orbit', tier: 2, price: partPrice('splitter', 2), mul: { gripFront: 1.008, dragCoef: 1.016 } },
  { slot: 'splitter', id: 'mesh', name: 'Mesh Splitter', brand: 'Halden', tier: 3, price: partPrice('splitter', 3), mul: { gripFront: 1.012, dragCoef: 1.04 } },
  { slot: 'skirts', id: 'sharp', name: 'Sharp Skirt', brand: 'Nimbus', tier: 1, price: partPrice('skirts', 1) },
  { slot: 'skirts', id: 'ducted', name: 'Ducted Skirt', brand: 'Argo', tier: 2, price: partPrice('skirts', 2) },
  { slot: 'skirts', id: 'ribbed', name: 'Ribbed Skirt', brand: 'Tekton', tier: 2, price: partPrice('skirts', 2) },
  { slot: 'skirts', id: 'carbon', name: 'Carbon Skirt', brand: 'Voltaic', tier: 3, price: partPrice('skirts', 3) },
  { slot: 'hood', id: 'scoop', name: 'Scoop Hood', brand: 'Kestrel Aero', tier: 1, price: partPrice('hood', 1), mul: { dragCoef: 1.01 } },
  { slot: 'hood', id: 'twin-vent', name: 'Twin Vent Hood', brand: 'Orbit', tier: 1, price: partPrice('hood', 1), mul: { dragCoef: 1.01 } },
  { slot: 'hood', id: 'louvered', name: 'Louvered Hood', brand: 'Halden', tier: 2, price: partPrice('hood', 2) },
  { slot: 'hood', id: 'carbon-flat', name: 'Carbon Flat Hood', brand: 'Nimbus', tier: 3, price: partPrice('hood', 3) },
];
