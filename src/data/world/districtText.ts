import type { DistrictId } from '../../types/world';

/**
 * Neon Harbor place names (task 066, built by Claude). Street names are proper nouns and stay English in Spanish too;
 * the district lines are translated (src/i18n/esContentI.ts). Names: first half for east-west streets, second half north-south.
 */
export const STREET_NAMES: Readonly<Record<DistrictId, readonly string[]>> = {
  downtown: ['Meridian Avenue', 'Glass Street', 'Halcyon Row', 'Prism Boulevard', 'Union Street', 'Tower Lane', 'Signal Street', 'Arc Avenue', 'Cobalt Way', 'Exchange Street', 'Monarch Avenue', 'Lumen Street'],
  harbour: ['Pier Road', 'Crane Street', 'Ballast Lane', 'Gantry Road', 'Mooring Street', 'Bollard Row', 'Tugboat Lane', 'Freight Avenue', 'Quay Street', 'Hawser Way', 'Dock Nine Road', 'Lighthouse Road'],
  oldtown: ['Lantern Alley', 'Chapel Street', 'Cobbler Lane', 'Bell Street', 'Weaver Row', 'Market Street', 'Tanner Lane', 'Clocktower Street', 'Baker Street', 'Fountain Lane', 'Ropewalk', 'Saint Ives Row'],
  strip: ['Neon Mile', 'Jackpot Avenue', 'Velvet Street', 'Marquee Row', 'Encore Lane', 'Starlight Avenue', 'Spotlight Street', 'Arcade Lane', 'Midnight Boulevard', 'Disco Row', 'Afterglow Street', 'Highball Lane'],
  hills: ['Ridge Road', 'Cypress Drive', 'Overlook Lane', 'Summit Road', 'Pinecrest Drive', 'Switchback Road', 'Vista Way', 'Canyon Drive', 'Hilltop Lane', 'Eagle Rise', 'Juniper Way', 'Skyline Drive'],
  industrial: ['Foundry Road', 'Rivet Street', 'Smelter Lane', 'Boiler Row', 'Piston Avenue', 'Furnace Street', 'Conveyor Road', 'Turbine Lane', 'Gasworks Road', 'Slag Street', 'Kiln Avenue', 'Chimney Lane'],
  bay: ['Seawall Road', 'Tidal Way', 'Breakwater Road', 'Pelican Lane'],
};

/** Names for the roads that cross districts. */
export const ROAD_NAMES = { highway: 'Harbor Expressway', bridge: 'Bay Bridge', runway: 'Old Airfield', coast: 'Coast Road' } as const;

/** One line about each district, shown when you drive into it. */
export const DISTRICT_BLURB: Readonly<Record<DistrictId, string>> = {
  downtown: 'Glass towers and long straight avenues: the fastest blocks in the city, if the lights let you.',
  harbour: 'Container stacks, crane lights and long straight docks: the drifters’ playground.',
  oldtown: 'Narrow brick streets and tight corners. Brake early, the walls do not forgive.',
  strip: 'Wall-to-wall neon, music on every corner and a crowd that watches every car.',
  hills: 'Winding roads above the lights, quiet villas and the best view of the skyline.',
  industrial: 'Foundries, warehouses and empty roads at night. Nobody asks why you are here.',
  bay: 'The bridge and the open water. Wide, fast and windy.',
};
