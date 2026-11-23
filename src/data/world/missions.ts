import type { MissionHook } from '../../types/world';

/**
 * Free Drive missions as data (docs/open-world.md): add one here and it runs, no engine code. Today the runner
 * (`core/missions.ts`) plays `reach` objectives: drive to a place before the clock runs out. Places are named like
 * `meet`, `zone:<n>`, `trap:<n>`, `race:<district>`, `token:<n>` (resolved by game/roamMissions). A trigger `{ district }`
 * offers the mission when you drive into that district. Texts are i18n keys `mission.<id>` (name) and `mission.<id>.b` (brief), English and Spanish.
 * Rewards pay once (`flag` marks it done; cash goes through the save, never twice).
 */
export const MISSIONS: readonly MissionHook[] = [
  { id: 'courier-strip', trigger: { district: 'downtown' }, objective: { kind: 'reach', poi: 'meet', seconds: 150 }, reward: { cash: 1500, flag: 'm:courier-strip' } },
  { id: 'dock-run', trigger: { district: 'harbour' }, objective: { kind: 'reach', poi: 'zone:0', seconds: 120 }, reward: { cash: 1800, flag: 'm:dock-run' } },
  { id: 'old-town-tip', trigger: { district: 'oldtown' }, objective: { kind: 'reach', poi: 'race:downtown', seconds: 140 }, reward: { cash: 1600, flag: 'm:old-town-tip' } },
  { id: 'strip-camera', trigger: { district: 'strip' }, objective: { kind: 'reach', poi: 'trap:0', seconds: 100 }, reward: { cash: 2000, flag: 'm:strip-camera' } },
  { id: 'token-sprint', trigger: { district: 'strip' }, objective: { kind: 'reach', poi: 'token:10', seconds: 90 }, reward: { cash: 1200, flag: 'm:token-sprint' } },
];
