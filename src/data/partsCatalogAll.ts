import { CATALOG, type CatalogPart } from './partsCatalog';
import { CATALOG_MORE } from './partsCatalogMore';

/** Every purchasable body part (base + Qwen task 041). Import this, not CATALOG, in shops and tests. */
export const ALL_PARTS: readonly CatalogPart[] = [...CATALOG, ...CATALOG_MORE];
