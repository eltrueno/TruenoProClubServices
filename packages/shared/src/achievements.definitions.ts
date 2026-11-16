import type { IAchievementDefinition } from "./types/achievement.js"

/**
 * Definiciones de los logros DE CLUB. Son la fuente de verdad: el worker las upserta en
 * `achievements_definitions` al arrancar (y borra las que ya no estén aquí), así una DB
 * nueva las tiene desde el primer partido. Para añadir o cambiar un logro se edita aquí.
 *
 * Cuentan todos los partidos del jugador en el club, oficiales y amistosos juntos (menos los
 * nulos y los de menos de 15', que no cuentan para nada).
 *
 * - infinite + step: hito cada `step` (25 goles, 50 goles, ...). Los puntos se dan en cada hito
 * - unique + cumulative + threshold/exact: una vez, sobre el acumulado del jugador
 * - unique + match + threshold/exact: una vez, sobre las stats de un partido
 * - categorías totwBest / totwWorst: se evalúan tras cada equipo de la semana. Ahora mismo no hay
 *   ninguno (el equipo de la semana se va a rehacer), pero el motor los sigue soportando
 *
 * `points`: lo que vale el logro (para rankings y la futura economía del canal).
 */
const club = (def: Omit<IAchievementDefinition, "type">): IAchievementDefinition => ({ ...def, type: "club" })

export const ACHIEVEMENT_DEFINITIONS: IAchievementDefinition[] = [
    // ---- Hitos que se repiten ----
    club({ _id: "gamesPlayed_milestone", name: "Partidos Jugados", description: "Cada 50 partidos jugados", category: "gamesPlayed", scope: "cumulative", mode: "infinite", step: 50, points: 10 }),
    club({ _id: "wins_milestone", name: "Victorias", description: "Cada 25 victorias", category: "wins", scope: "cumulative", mode: "infinite", step: 25, points: 10 }),
    club({ _id: "goals_milestone", name: "Goles", description: "Cada 25 goles", category: "goals", scope: "cumulative", mode: "infinite", step: 25, points: 10 }),
    club({ _id: "assists_milestone", name: "Asistencias", description: "Cada 25 asistencias", category: "assists", scope: "cumulative", mode: "infinite", step: 25, points: 10 }),
    club({ _id: "saves_milestone", name: "Paradas", description: "Cada 25 paradas", category: "saves", scope: "cumulative", mode: "infinite", step: 25, points: 10 }),
    club({ _id: "cleanSheets_milestone", name: "Portería a cero", description: "Cada 10 partidos sin que el rival marque", category: "cleanSheets", scope: "cumulative", mode: "infinite", step: 10, points: 10 }),
    club({ _id: "tacklesSuccess_milestone", name: "Entradas", description: "Cada 100 entradas con éxito", category: "tacklesSuccess", scope: "cumulative", mode: "infinite", step: 100, points: 5 }),
    club({ _id: "passesMade_milestone", name: "Pases", description: "Cada 500 pases (intentos)", category: "passesMade", scope: "cumulative", mode: "infinite", step: 500, points: 5 }),
    club({ _id: "manOfTheMatch_milestone", name: "Mejor Del Partido", description: "Cada 10 partidos como Mejor del Partido", category: "manOfTheMatch", scope: "cumulative", mode: "infinite", step: 10, points: 15 }),
    club({ _id: "hattricks_milestone", name: "Hat Tricks", description: "Cada 5 hat tricks", category: "hattricks", scope: "cumulative", mode: "infinite", step: 5, points: 15 }),
    club({ _id: "pokers_milestone", name: "Pokers", description: "Cada póker", category: "pokers", scope: "cumulative", mode: "infinite", step: 1, points: 10 }),
    club({ _id: "redCards_milestone", name: "Tarjetas Rojas", description: "Cada 10 tarjetas rojas", category: "redCards", scope: "cumulative", mode: "infinite", step: 10, points: 5 }),

    // ---- Partidos ----
    club({ _id: "1match_achievement", name: "Mi primera chamba", description: "Juega tu primer partido", category: "gamesPlayed", scope: "cumulative", mode: "unique", threshold: 1, points: 5 }),
    club({ _id: "33match_achievement", name: "¿Me repites el numerín?", description: "Juega 33 partidos. Si, 33", category: "gamesPlayed", scope: "cumulative", mode: "unique", threshold: 33, points: 10 }),
    club({ _id: "100match_achievement", name: "Centenario", description: "Juega 100 partidos", category: "gamesPlayed", scope: "cumulative", mode: "unique", threshold: 100, points: 25 }),
    club({ _id: "250match_achievement", name: "One Club Man", description: "Juega 250 partidos", category: "gamesPlayed", scope: "cumulative", mode: "unique", threshold: 250, points: 50 }),
    club({ _id: "5000minutes_achievement", name: "No sale ni con agua caliente", description: "Juega 5000 minutos", category: "minutesPlayed", scope: "cumulative", mode: "unique", threshold: 5000, points: 20 }),
    club({ _id: "1win_achievement", name: "Los tres puntos", description: "Gana tu primer partido", category: "wins", scope: "cumulative", mode: "unique", threshold: 1, points: 5 }),
    club({ _id: "100win_achievement", name: "Ganador nato", description: "Gana 100 partidos", category: "wins", scope: "cumulative", mode: "unique", threshold: 100, points: 40 }),

    // ---- Goles y asistencias ----
    club({ _id: "1goal_achievement", name: "Bautismo de Gol", description: "Marca tu primer gol", category: "goals", scope: "cumulative", mode: "unique", threshold: 1, points: 5 }),
    club({ _id: "100goal_achievement", name: "Killer", description: "Marca 100 goles", category: "goals", scope: "cumulative", mode: "unique", threshold: 100, points: 40 }),
    club({ _id: "1assist_achievement", name: "Marca tu que a mi me da la risa", description: "Da tu primera asistencia", category: "assists", scope: "cumulative", mode: "unique", threshold: 1, points: 5 }),
    club({ _id: "100assist_achievement", name: "El socio de todos", description: "Da 100 asistencias", category: "assists", scope: "cumulative", mode: "unique", threshold: 100, points: 40 }),
    club({ _id: "1hattrick_achievement", name: "Mi primer Hat tricky", description: "Marca tu primer hat-trick", category: "hattricks", scope: "cumulative", mode: "unique", threshold: 1, points: 15 }),
    club({ _id: "1poker_achievement", name: "Escalera, Full... Poker", description: "Marca tu primer poker", category: "pokers", scope: "cumulative", mode: "unique", threshold: 1, points: 20 }),
    club({ _id: "manita_achievement", name: "Manita", description: "Marca 5 goles o más en un partido", category: "goals", scope: "match", mode: "unique", threshold: 5, points: 30 }),
    club({ _id: "3assistsMatch_achievement", name: "Repartidor", description: "Da 3 asistencias o más en un partido", category: "assists", scope: "match", mode: "unique", threshold: 3, points: 15 }),

    // ---- Un partido redondo (o todo lo contrario) ----
    club({ _id: "1motm_achievement", name: "El mejor de la clase", description: "Sé el Mejor del Partido por primera vez", category: "manOfTheMatch", scope: "cumulative", mode: "unique", threshold: 1, points: 10 }),
    club({ _id: "rating10_achievement", name: "Partido perfecto", description: "Acaba un partido con un 10 de valoración", category: "rating", scope: "match", mode: "unique", threshold: 10, points: 25 }),
    club({ _id: "perfectPassing_achievement", name: "¿Es Xavi Hernandez?", description: "Logra un 100% de precisión de pases en un partido (mín. 10 pases)", category: "pass_accuracy", scope: "match", mode: "unique", threshold: 100, points: 15 }),
    club({ _id: "nullPassing_achievement", name: "Casi imposible", description: "Falla todos los pases en un partido (mín. 10 pases)", category: "pass_accuracy", scope: "match", mode: "unique", exact: 0, points: 5 }),
    club({ _id: "perfectShooting_achievement", name: "Francotirador preciso", description: "Logra un 100% de precisión de tiros en un partido (mín. 3 tiros)", category: "shot_accuracy", scope: "match", mode: "unique", threshold: 100, points: 10 }),
    club({ _id: "nullShooting_achievement", name: "Para las stats", description: "Falla todos los tiros en un partido (mín. 3 tiros)", category: "shot_accuracy", scope: "match", mode: "unique", exact: 0, points: 5 }),

    // ---- Portería y defensa ----
    club({ _id: "1save_achievement", name: "CaseMuro", description: "Haz tu primera parada", category: "saves", scope: "cumulative", mode: "unique", threshold: 1, points: 5 }),
    club({ _id: "10savesMatch_achievement", name: "El pulpo", description: "Haz 10 paradas o más en un partido", category: "saves", scope: "match", mode: "unique", threshold: 10, points: 20 }),
    club({ _id: "1cleanSheet_achievement", name: "Por aquí no", description: "Mantén tu portería a cero en un partido", category: "cleanSheets", scope: "cumulative", mode: "unique", threshold: 1, points: 5 }),
    club({ _id: "50cleanSheet_achievement", name: "Candado", description: "Mantén tu portería a cero en 50 partidos", category: "cleanSheets", scope: "cumulative", mode: "unique", threshold: 50, points: 30 }),

    // ---- Tarjetas ----
    club({ _id: "1redCard_achievement", name: "Leñero", description: "Consigue tu primera tarjeta roja", category: "redCards", scope: "cumulative", mode: "unique", threshold: 1, points: 5 }),
    club({ _id: "5redCard_achievement", name: "Carnicero", description: "Consigue 5 tarjetas rojas", category: "redCards", scope: "cumulative", mode: "unique", threshold: 5, points: 5 }),
    club({ _id: "10redCard_achievement", name: "Asesino", description: "Consigue 10 tarjetas rojas", category: "redCards", scope: "cumulative", mode: "unique", threshold: 10, points: 10 }),
    club({ _id: "20redCard_achievement", name: "Casesino", description: "Consigue 20 tarjetas rojas", category: "redCards", scope: "cumulative", mode: "unique", threshold: 20, points: 15 }),
]
