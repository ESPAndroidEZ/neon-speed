/** GLB files found in public/models at build time (vite.config `define`); null in dev and tests, where we probe instead. */
declare const __RB_MODELS__: readonly string[] | null | undefined;
const LIST: readonly string[] | null = typeof __RB_MODELS__ !== 'undefined' && __RB_MODELS__ ? __RB_MODELS__ : null;

/**
 * Whether `rel` (e.g. 'civic.glb', 'props/lamp.glb') can exist. A release build only fetches the files it shipped,
 * so a missing optional model costs no 404 (and no console error); dev keeps probing so a dropped-in GLB is picked up.
 */
export const modelPresent = (rel: string): boolean => !LIST || LIST.includes(rel);
