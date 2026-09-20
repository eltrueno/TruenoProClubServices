import type { IAchievementDefinition } from "./types/achievement.js"

/**
 * Definiciones de logros. Son la fuente de verdad: el worker las upserta en
 * `achievements_definitions` al arrancar, así una DB nueva las tiene desde el
 * primer partido. Para añadir o cambiar un logro se edita aquí.
 *
 * - infinite + step: hito cada `step` (25 goles, 50 goles, ...)
 * - unique + cumulative + threshold/exact: una vez, sobre el acumulado del jugador
 * - unique + match + threshold/exact: una vez, sobre las stats de un partido
 * - type general (totwBest/totwWorst): se evalúan tras cada equipo de la semana
 */
export const ACHIEVEMENT_DEFINITIONS: IAchievementDefinition[] = [
    { _id: "gamesPlayed_milestone_official", name: "Partidos Jugados", description: "Cada 50 partidos oficiales jugados", category: "gamesPlayed", scope: "cumulative", type: "official", mode: "infinite", step: 50 },
    { _id: "goals_milestone_official", name: "Goles", description: "Cada 25 goles en partidos oficiales", category: "goals", scope: "cumulative", type: "official", mode: "infinite", step: 25 },
    { _id: "assists_milestone_official", name: "Asistencias", description: "Cada 25 asistencias en partidos oficiales", category: "assists", scope: "cumulative", type: "official", mode: "infinite", step: 25 },
    { _id: "saves_milestone_official", name: "Paradas", description: "Cada 15 paradas en partidos oficiales", category: "saves", scope: "cumulative", type: "official", mode: "infinite", step: 15 },
    { _id: "redCards_milestone_official", name: "Tarjetas Rojas", description: "Cada 10 tarjetas rojas en partidos oficiales", category: "redCards", scope: "cumulative", type: "official", mode: "infinite", step: 10 },
    { _id: "passesMade_milestone_official", name: "Pases", description: "Cada 250 pases (intentos) en partidos oficiales", category: "passesMade", scope: "cumulative", type: "official", mode: "infinite", step: 250 },
    { _id: "manOfTheMatch_milestone_official", name: "Mejor Del Partido", description: "Cada 10 partidos como Mejor del Partido", category: "manOfTheMatch", scope: "cumulative", type: "official", mode: "infinite", step: 10 },
    { _id: "hattricks_milestone_official", name: "Hat Tricks", description: "Cada 5 hat tricks en partidos oficiales", category: "hattricks", scope: "cumulative", type: "official", mode: "infinite", step: 5 },
    { _id: "pokers_milestone_official", name: "Pokers", description: "Cada póker en partido oficial", category: "pokers", scope: "cumulative", type: "official", mode: "infinite", step: 1 },
    { _id: "cleanSheets_milestone_official", name: "Porteria a cero", description: "Cada 10 partidos sin que el rival marque", category: "cleanSheets", scope: "cumulative", type: "official", mode: "infinite", step: 10 },
    { _id: "1match_achievement_official", name: "Mi primera chamba", description: "Juega tu primer partido oficial", category: "gamesPlayed", scope: "cumulative", type: "official", mode: "unique", threshold: 1 },
    { _id: "33match_achievement_official", name: "¿Me repites el numerín?", description: "Juega 33 partidos oficiales. Si, 33", category: "gamesPlayed", scope: "cumulative", type: "official", mode: "unique", threshold: 33 },
    { _id: "perfectPassing_achievement_official", name: "¿Es Xavi Hernandez?", description: "Logra un 100% de precisión de pases en un partido oficial (mín. 10 pases)", category: "pass_accuracy", scope: "match", type: "official", mode: "unique", threshold: 100 },
    { _id: "nullPassing_achievement_official", name: "Casi imposible", description: "Falla todos los pases en un partido oficial (mín. 10 pases)", category: "pass_accuracy", scope: "match", type: "official", mode: "unique", exact: 0 },
    { _id: "perfectShooting_achievement_official", name: "Francotirador preciso", description: "Logra un 100% de precisión de tiros en un partido oficial (mín. 3 tiros)", category: "shot_accuracy", scope: "match", type: "official", mode: "unique", threshold: 100 },
    { _id: "nullShooting_achievement_official", name: "Para las stats", description: "Falla todos los tiros en un partido oficial (mín. 3 tiros)", category: "shot_accuracy", scope: "match", type: "official", mode: "unique", exact: 0 },
    { _id: "1cleanSheet_achievement_official", name: "Por aquí no", description: "Mantén tu portería a cero en un partido oficial", category: "cleanSheets", scope: "cumulative", type: "official", mode: "unique", threshold: 1 },
    { _id: "1goal_achievement_official", name: "Bautismo de Gol", description: "Marca tu primer gol en un partido oficial", category: "goals", scope: "cumulative", type: "official", mode: "unique", threshold: 1 },
    { _id: "1assist_achievement_official", name: "Marca tu que a mi me da la risa", description: "Da tu primera asistencia en un partido oficial", category: "assists", scope: "cumulative", type: "official", mode: "unique", threshold: 1 },
    { _id: "1hattrick_achievement_official", name: "Mi primer Hat tricky", description: "Marca tu primer hat-trick en un partido oficial", category: "hattricks", scope: "cumulative", type: "official", mode: "unique", threshold: 1 },
    { _id: "1poker_achievement_official", name: "Escalera, Full... Poker", description: "Marca tu primer poker en un partido oficial", category: "pokers", scope: "cumulative", type: "official", mode: "unique", threshold: 1 },
    { _id: "1save_achievement_official", name: "CaseMuro", description: "Haz tu primera parada en un partido oficial", category: "saves", scope: "cumulative", type: "official", mode: "unique", threshold: 1 },
    { _id: "1redCard_achievement_official", name: "Leñero", description: "Consigue tu primera tarjeta roja en un partido oficial", category: "redCards", scope: "cumulative", type: "official", mode: "unique", threshold: 1 },
    { _id: "5redCard_achievement_official", name: "Carnicero", description: "Consigue 5 tarjetas rojas en partidos oficiales", category: "redCards", scope: "cumulative", type: "official", mode: "unique", threshold: 5 },
    { _id: "10redCard_achievement_official", name: "Asesino", description: "Consigue 10 tarjetas rojas en partidos oficiales", category: "redCards", scope: "cumulative", type: "official", mode: "unique", threshold: 10 },
    { _id: "20redCard_achievement_official", name: "Casesino", description: "Consigue 20 tarjetas rojas en partidos oficiales", category: "redCards", scope: "cumulative", type: "official", mode: "unique", threshold: 20 },
    { _id: "1totwBest_achievement_official", name: "Equipo de la semana", description: "Entra por primera vez en el equipo de los mejores de la semana", category: "totwBest", scope: "cumulative", type: "general", mode: "unique", threshold: 1 }
]
