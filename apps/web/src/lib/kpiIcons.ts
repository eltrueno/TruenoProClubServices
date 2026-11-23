import { ACHIEVEMENT_CATEGORY_ICONS, ACHIEVEMENT_ICONS } from "@trueno-proclub-services/shared"

/**
 * Iconos rellenos (Heroicons 2, 24/solid) de los KPIs de las fichas de partido y de jugador, como
 * contenido de un <svg viewBox="0 0 24 24" fill="currentColor"> (v-html). Los que ya están en los
 * logros se reutilizan de ahí; el resto se copia de heroicons.
 */
export const KPI_ICONS = {
    /** star */
    rating: ACHIEVEMENT_CATEGORY_ICONS.performance.solid,
    /** chart-pie */
    possession: '<path fill-rule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V3Z" clip-rule="evenodd"/>',
    /** fire */
    shots: ACHIEVEMENT_CATEGORY_ICONS.attack.solid,
    goals: ACHIEVEMENT_CATEGORY_ICONS.attack.solid,
    /** arrows-right-left */
    passes: '<path fill-rule="evenodd" d="M15.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H7.5a.75.75 0 0 1 0-1.5h11.69l-3.22-3.22a.75.75 0 0 1 0-1.06Zm-7.94 9a.75.75 0 0 1 0 1.06l-3.22 3.22H16.5a.75.75 0 0 1 0 1.5H4.81l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/>',
    /** shield-check */
    tackles: ACHIEVEMENT_CATEGORY_ICONS.defense.solid,
    /** hand-raised */
    saves: ACHIEVEMENT_ICONS.hand.solid,
    /** rocket-launch */
    assists: ACHIEVEMENT_ICONS.rocket.solid,
    /** check-badge */
    games: ACHIEVEMENT_CATEGORY_ICONS.matches.solid,
    /** bolt */
    wins: ACHIEVEMENT_CATEGORY_ICONS.streaks.solid,
} as const

export type KpiIcon = keyof typeof KPI_ICONS
