import { isHiddenAchievement, rarityFromPoints, type AchievementCategory } from "./constants.js"
import type { IAchievementDefinition } from "./types/achievement.js"

/**
 * Definiciones de los logros DE CLUB. Son la fuente de verdad: el worker deja
 * `achievements_definitions` igual que esta lista al arrancar (añade, actualiza y borra) y, si
 * cambian las condiciones de alguno, rehace los desbloqueados desde el historial. Para añadir
 * o cambiar un logro se edita aquí, una línea por logro.
 *
 * Cuentan todos los partidos del jugador en el club, oficiales y amistosos juntos (menos los
 * nulos y los de menos de 15', que no cuentan para nada).
 *
 * - `metric`: qué se mide (ver ACHIEVEMENT_METRICS y achievementMetrics.ts del worker)
 * - `scope`: "cumulative" (acumulado o estado del jugador) o "match" (un partido concreto)
 * - `mode: "infinite"` + `step`: hito cada `step` (25 goles, 50 goles…); los puntos se dan en cada uno
 * - `mode: "unique"` + `threshold` (llegar a) o `exact` (clavar): una sola vez
 * - `points`: lo que vale. La rareza sale de los puntos: hasta 10 común, hasta 25 raro,
 *   hasta 50 épico y más, legendario
 *
 * Los de la cuenta (comunes a todos los clubes) están en achievements.account.ts.
 */
type Input = Omit<IAchievementDefinition, "type" | "category" | "rarity" | "hidden" | "scope" | "mode">

const make = (category: AchievementCategory, scope: IAchievementDefinition["scope"], mode: IAchievementDefinition["mode"]) =>
    (def: Input): IAchievementDefinition => ({ ...def, type: "club", category, scope, mode, rarity: rarityFromPoints(def.points), hidden: isHiddenAchievement(category, rarityFromPoints(def.points)) })

/** hito que se repite cada `step` */
const milestone = make("milestones", "cumulative", "infinite")
/** una vez, sobre el acumulado o el estado del jugador */
const total = (category: AchievementCategory) => make(category, "cumulative", "unique")
/** una vez, sobre un partido */
const inMatch = (category: AchievementCategory) => make(category, "match", "unique")

export const ACHIEVEMENT_DEFINITIONS: IAchievementDefinition[] = [
    // ---- Hitos que se repiten ----
    milestone({ _id: "gamesPlayed_milestone", name: "Partidos Jugados", description: "Cada 50 partidos jugados", metric: "gamesPlayed", step: 50, points: 10 }),
    milestone({ _id: "wins_milestone", name: "Victorias", description: "Cada 25 victorias", metric: "wins", step: 25, points: 10 }),
    milestone({ _id: "goals_milestone", name: "Goles", description: "Cada 25 goles", metric: "goals", step: 25, points: 10 }),
    milestone({ _id: "assists_milestone", name: "Asistencias", description: "Cada 25 asistencias", metric: "assists", step: 25, points: 10 }),
    milestone({ _id: "saves_milestone", name: "Paradas", description: "Cada 25 paradas", metric: "saves", step: 25, points: 10 }),
    milestone({ _id: "cleanSheets_milestone", name: "Portería a cero", description: "Cada 10 partidos sin que el rival marque", metric: "cleanSheets", step: 10, points: 10 }),
    milestone({ _id: "tacklesSuccess_milestone", name: "Entradas", description: "Cada 100 entradas con éxito", metric: "tacklesSuccess", step: 100, points: 5 }),
    milestone({ _id: "passesMade_milestone", name: "Pases", description: "Cada 500 pases (intentos)", metric: "passesMade", step: 500, points: 5 }),
    milestone({ _id: "manOfTheMatch_milestone", name: "Mejor Del Partido", description: "Cada 10 partidos como Mejor del Partido", metric: "manOfTheMatch", step: 10, points: 15 }),
    milestone({ _id: "hattricks_milestone", name: "Hat Tricks", description: "Cada 5 hat tricks", metric: "hattricks", step: 5, points: 15 }),
    milestone({ _id: "pokers_milestone", name: "Pokers", description: "Cada póker", metric: "pokers", step: 1, points: 10 }),
    milestone({ _id: "redCards_milestone", name: "Tarjetas Rojas", description: "Cada 10 tarjetas rojas", metric: "redCards", step: 10, points: 5 }),

    // ---- Partidos y victorias ----
    total("matches")({ _id: "1match_achievement", name: "Mi primera chamba", description: "Juega tu primer partido", metric: "gamesPlayed", threshold: 1, points: 5 }),
    total("matches")({ _id: "33match_achievement", name: "¿Me repites el numerín?", description: "Juega 33 partidos. Si, 33", metric: "gamesPlayed", threshold: 33, points: 10 }),
    total("matches")({ _id: "100match_achievement", name: "Centenario", description: "Juega 100 partidos", metric: "gamesPlayed", threshold: 100, points: 25 }),
    total("matches")({ _id: "250match_achievement", name: "Leyenda", description: "Juega 250 partidos", metric: "gamesPlayed", threshold: 250, points: 50 }),
    total("matches")({ _id: "500match_achievement", name: "One Club Man", description: "Juega 500 partidos", metric: "gamesPlayed", threshold: 500, points: 100 }),
    total("matches")({ _id: "5000minutes_achievement", name: "Ni con agua caliente", description: "Juega 5000 minutos", metric: "minutesPlayed", threshold: 5000, points: 20 }),
    total("matches")({ _id: "1win_achievement", name: "Los tres puntos", description: "Gana tu primer partido", metric: "wins", threshold: 1, points: 5 }),
    total("matches")({ _id: "100win_achievement", name: "Ganador nato", description: "Gana 100 partidos", metric: "wins", threshold: 100, points: 40 }),

    // ---- Goles y asistencias ----
    total("attack")({ _id: "1goal_achievement", name: "Bautismo de Gol", description: "Marca tu primer gol", metric: "goals", threshold: 1, points: 5 }),
    total("attack")({ _id: "debutGoal_achievement", icon: "rocket", name: "El Niño Maravilla", description: "Marca en tu primer partido", metric: "debutGoal", threshold: 1, points: 15 }),
    total("attack")({ _id: "100goal_achievement", name: "Killer", description: "Marca 100 goles", metric: "goals", threshold: 100, points: 40 }),
    total("attack")({ _id: "250goal_achievement", name: "Pichichi", description: "Marca 250 goles", metric: "goals", threshold: 250, points: 80 }),
    total("attack")({ _id: "1assist_achievement", name: "Marca tu que a mi me da la risa", description: "Da tu primera asistencia", metric: "assists", threshold: 1, points: 5 }),
    total("attack")({ _id: "100assist_achievement", name: "El socio de todos", description: "Da 100 asistencias", metric: "assists", threshold: 100, points: 40 }),
    total("attack")({ _id: "1hattrick_achievement", name: "Mi primer Hat tricky", description: "Marca tu primer hat-trick", metric: "hattricks", threshold: 1, points: 15 }),
    total("attack")({ _id: "1poker_achievement", name: "Escalera, Full... Poker", description: "Marca tu primer poker", metric: "pokers", threshold: 1, points: 20 }),
    inMatch("attack")({ _id: "manita_achievement", name: "Manita", description: "Marca 5 goles o más en un partido", metric: "goals", threshold: 5, points: 30 }),
    inMatch("attack")({ _id: "3assistsMatch_achievement", name: "Repartidor", description: "Da 3 asistencias o más en un partido", metric: "assists", threshold: 3, points: 15 }),
    total("attack")({ _id: "5000passes_achievement", name: "Mil pases", description: "Completa 5000 pases", metric: "passesSuccess", threshold: 5000, points: 30 }),

    // ---- Partidazos (o todo lo contrario) ----
    total("performance")({ _id: "1motm_achievement", name: "El mejor de la clase", description: "Sé el Mejor del Partido por primera vez", metric: "manOfTheMatch", threshold: 1, points: 10 }),
    total("performance")({ _id: "50motm_achievement", name: "Galáctico", description: "Sé el Mejor del Partido 50 veces", metric: "manOfTheMatch", threshold: 50, points: 75 }),
    inMatch("performance")({ _id: "rating10_achievement", name: "Partido perfecto", description: "Acaba un partido con un 10 de valoración", metric: "rating", threshold: 10, points: 25 }),
    inMatch("performance")({ _id: "lowRating_achievement", name: "Hoy no era tu día", description: "Acaba un partido con menos de un 4 de valoración", metric: "lowRating", threshold: 1, points: 5 }),
    inMatch("performance")({ _id: "perfectPassing_achievement", name: "¿Es Xavi Hernandez?", description: "Logra un 100% de precisión de pases en un partido (mín. 10 pases)", metric: "pass_accuracy", threshold: 100, points: 15 }),
    inMatch("performance")({ _id: "nullPassing_achievement", name: "Casi imposible", description: "Falla todos los pases en un partido (mín. 10 pases)", metric: "pass_accuracy", exact: 0, points: 5 }),
    inMatch("performance")({ _id: "perfectShooting_achievement", icon: "target", name: "Francotirador preciso", description: "Logra un 100% de precisión de tiros en un partido (mín. 3 tiros)", metric: "shot_accuracy", threshold: 100, points: 10 }),
    inMatch("performance")({ _id: "nullShooting_achievement", name: "Para las stats", description: "Falla todos los tiros en un partido (mín. 3 tiros)", metric: "shot_accuracy", exact: 0, points: 5 }),
    inMatch("performance")({ _id: "goalAssistMotm_achievement", name: "Lo hace todo", description: "Gol, asistencia y Mejor del Partido en el mismo partido", metric: "goalAssistMotm", threshold: 1, points: 15 }),
    inMatch("performance")({ _id: "motmInLoss_achievement", name: "Solo ante el peligro", description: "Sé el Mejor del Partido en una derrota", metric: "motmInLoss", threshold: 1, points: 15 }),

    // ---- Portería y defensa ----
    total("defense")({ _id: "1save_achievement", name: "CaseMuro", description: "Haz tu primera parada", metric: "saves", threshold: 1, points: 5 }),
    inMatch("defense")({ _id: "10savesMatch_achievement", icon: "hand", name: "San Iker", description: "Haz 10 paradas o más en un partido", metric: "saves", threshold: 10, points: 20 }),
    total("defense")({ _id: "1cleanSheet_achievement", name: "Por aquí no", description: "Mantén tu portería a cero en un partido", metric: "cleanSheets", threshold: 1, points: 5 }),
    total("defense")({ _id: "50cleanSheet_achievement", name: "Candado", description: "Mantén tu portería a cero en 50 partidos", metric: "cleanSheets", threshold: 50, points: 30 }),
    inMatch("defense")({ _id: "cleanSheetSaves_achievement", icon: "hand", name: "Cerrojo", description: "Portería a cero con 8 paradas o más", metric: "cleanSheetSaves", threshold: 8, points: 30 }),
    inMatch("defense")({ _id: "10tacklesMatch_achievement", name: "Segador", description: "10 entradas con éxito en un partido", metric: "tacklesSuccess", threshold: 10, points: 25 }),
    inMatch("defense")({ _id: "cleanTackles_achievement", name: "Limpio", description: "5 entradas o más en un partido, todas con éxito", metric: "cleanTackles", threshold: 5, points: 15 }),
    inMatch("defense")({ _id: "gkConceded_achievement", name: "Coladero", description: "Encaja 7 goles o más jugando de portero", metric: "gkConceded", threshold: 7, points: 5 }),

    // ---- Tarjetas ----
    total("discipline")({ _id: "1redCard_achievement", name: "Leñero", description: "Consigue tu primera tarjeta roja", metric: "redCards", threshold: 1, points: 5 }),
    total("discipline")({ _id: "5redCard_achievement", name: "Carnicero", description: "Consigue 5 tarjetas rojas", metric: "redCards", threshold: 5, points: 5 }),
    total("discipline")({ _id: "10redCard_achievement", name: "Asesino", description: "Consigue 10 tarjetas rojas", metric: "redCards", threshold: 10, points: 10 }),
    total("discipline")({ _id: "20redCard_achievement", name: "Casesino", description: "Consigue 20 tarjetas rojas", metric: "redCards", threshold: 20, points: 15 }),
    inMatch("discipline")({ _id: "goalAndRedCard_achievement", name: "Zidane en Berlín", description: "Marca y ve la roja en el mismo partido", metric: "goalAndRedCard", threshold: 1, points: 15 }),

    // ---- De equipo (se lo lleva cada jugador del club que juega ese partido) ----
    inMatch("team")({ _id: "winBy5_achievement", name: "Paliza gitana", description: "Gana por 5 goles o más", metric: "winMargin", threshold: 5, points: 10 }),
    inMatch("team")({ _id: "shutout6_achievement", name: "Set en blanco", description: "Gana 6-0 o más sin encajar", metric: "shutoutWinMargin", threshold: 6, points: 20 }),
    inMatch("team")({ _id: "teamGoals10_achievement", name: "Doble dígito", description: "Tu equipo marca 10 goles o más en un partido", metric: "teamGoals", threshold: 10, points: 30 }),
    inMatch("team")({ _id: "totalGoals10_achievement", name: "Solteros contra casados", description: "Juega un partido con 10 goles o más entre los dos equipos", metric: "totalGoals", threshold: 10, points: 10 }),
    inMatch("team")({ _id: "lossBy5_achievement", name: "Nos han pintado la cara", description: "Pierde por 5 goles o más", metric: "lossMargin", threshold: 5, points: 5 }),
    inMatch("team")({ _id: "goallessDraw_achievement", name: "Resultado gafas", description: "Empata 0-0", metric: "goallessDraw", threshold: 1, points: 5 }),
    inMatch("team")({ _id: "oneNilWin_achievement", name: "Ole ole ole, Cholo Simeone", description: "Gana 1-0", metric: "shutoutWinMargin", exact: 1, points: 5 }),
    inMatch("team")({ _id: "robbery_achievement", name: "Ha sido un robo", description: "Gana con la mitad de tiros que el rival o menos (y él al menos 6)", metric: "robbery", threshold: 1, points: 10 }),
    inMatch("attack")({ _id: "oneNilWinner_achievement", icon: "heart", name: "Iniesta de mi vida", description: "Marca el único gol de una victoria 1-0", metric: "oneNilWinner", threshold: 1, points: 20 }),
    inMatch("team")({ _id: "haramball_achievement", icon: "hand", name: "Haramball", description: "Gana 1-0 con 8 paradas o más de tu equipo", metric: "oneNilSaves", threshold: 8, points: 20 }),
    inMatch("team")({ _id: "twoNilWin_achievement", name: "Partido de manual", description: "Gana 2-0", metric: "shutoutWinMargin", exact: 2, points: 5 }),
    inMatch("team")({ _id: "oneOneDraw_achievement", name: "Ni pa ti ni pa mí", description: "Empata 1-1", metric: "highScoringDraw", exact: 1, points: 5 }),
    inMatch("team")({ _id: "winBy1_achievement", name: "Sufriendo hasta el final", description: "Gana por un solo gol", metric: "winMargin", exact: 1, points: 5 }),
    inMatch("team")({ _id: "lossBy1_achievement", name: "Merecimos más", description: "Pierde por un solo gol", metric: "lossMargin", exact: 1, points: 5 }),
    inMatch("team")({ _id: "lossBy7_achievement", name: "Mineirazo", description: "Pierde por 7 goles o más", metric: "lossMargin", threshold: 7, points: 10 }),
    inMatch("team")({ _id: "highDraw3_achievement", name: "Partido de Playstation", description: "Empata 3-3 o más", metric: "highScoringDraw", threshold: 3, points: 10 }),
    inMatch("team")({ _id: "highScoringDraw_achievement", name: "Reparto de puntos", description: "Empata 4-4 o más", metric: "highScoringDraw", threshold: 4, points: 20 }),
    inMatch("team")({ _id: "penaltyWin_achievement", name: "Sangre fría", description: "Gana en la tanda de penaltis", metric: "penaltyWin", threshold: 1, points: 20 }),
    inMatch("team")({ _id: "dnfWin_achievement", name: "Diles que se vayan", description: "Gana porque el rival abandona", metric: "dnfWin", threshold: 1, points: 5 }),
    inMatch("team")({ _id: "fullSquadWin_achievement", name: "Equipazo", description: "Gana un partido jugando 11 del club", metric: "fullSquadWin", threshold: 1, points: 25 }),
    inMatch("team")({ _id: "outnumberedWin_achievement", name: "Contra todo y contra todos", description: "Gana con menos jugadores humanos que el rival", metric: "outnumberedWin", threshold: 1, points: 20 }),
    inMatch("team")({ _id: "playoffWin_achievement", name: "Ya hemos pasao", description: "Gana un partido de playoff", metric: "playoffWin", threshold: 1, points: 15 }),
    inMatch("team")({ _id: "teamScorers5_achievement", name: "Hay para todos", description: "Juega un partido en el que marcan 5 jugadores distintos del club", metric: "teamScorers", threshold: 5, points: 25 }),

    // ---- Rachas ----
    total("streaks")({ _id: "winStreak5_achievement", name: "En racha", description: "Gana 5 partidos seguidos", metric: "winStreak", threshold: 5, points: 15 }),
    total("streaks")({ _id: "winStreak10_achievement", name: "Imparables", description: "Gana 10 partidos seguidos", metric: "winStreak", threshold: 10, points: 40 }),
    total("streaks")({ _id: "unbeatenStreak30_achievement", name: "Los Invencibles", description: "30 partidos seguidos sin perder", metric: "unbeatenStreak", threshold: 30, points: 75 }),
    total("streaks")({ _id: "scoringStreak15_achievement", name: "Pichichi en racha", description: "Marca en 15 partidos seguidos", metric: "scoringStreak", threshold: 15, points: 75 }),
    total("streaks")({ _id: "unbeatenStreak15_achievement", name: "Partido a partido", description: "15 partidos seguidos sin perder", metric: "unbeatenStreak", threshold: 15, points: 40 }),
    total("streaks")({ _id: "scoringStreak5_achievement", name: "Enchufado", description: "Marca en 5 partidos seguidos", metric: "scoringStreak", threshold: 5, points: 20 }),
    total("streaks")({ _id: "scoringStreak10_achievement", name: "On fire", description: "Marca en 10 partidos seguidos", metric: "scoringStreak", threshold: 10, points: 50 }),
    total("streaks")({ _id: "assistStreak5_achievement", name: "Barra libre", description: "Da una asistencia en 5 partidos seguidos", metric: "assistStreak", threshold: 5, points: 20 }),
    total("streaks")({ _id: "lossStreak5_achievement", name: "Crisis en el vestuario", description: "Pierde 5 partidos seguidos", metric: "lossStreak", threshold: 5, points: 5 }),
    total("streaks")({ _id: "lossStreak10_achievement", name: "Esto huele a Segunda", description: "Pierde 10 partidos seguidos", metric: "lossStreak", threshold: 10, points: 5 }),
    total("streaks")({ _id: "forwardDrought10_achievement", name: "Sequía", description: "10 partidos seguidos de delantero sin marcar", metric: "forwardDrought", threshold: 10, points: 5 }),

    // ---- Para expertos ----
    inMatch("expert")({ _id: "gkGoal_achievement", icon: "rocket", name: "Portero goleador", description: "Marca un gol jugando de portero", metric: "gkGoals", threshold: 1, points: 50 }),
    inMatch("expert")({ _id: "gkAssist_achievement", icon: "rocket", name: "Portero asistente", description: "Da una asistencia jugando de portero", metric: "gkAssists", threshold: 1, points: 30 }),
    inMatch("expert")({ _id: "defenderHattrick_achievement", name: "Central con gol", description: "Marca un hat-trick jugando de defensa", metric: "defenderGoals", threshold: 3, points: 40 }),
    inMatch("expert")({ _id: "perfectHattrick_achievement", icon: "target", name: "Hat-trick perfecto", description: "Marca 3 goles o más sin fallar un solo tiro", metric: "perfectHattrick", threshold: 1, points: 30 }),
    inMatch("expert")({ _id: "hattrickMotm_achievement", name: "Siuuu", description: "Hat-trick y Mejor del Partido en el mismo partido", metric: "hattrickMotm", threshold: 1, points: 25 }),
    inMatch("expert")({ _id: "doubleDouble_achievement", name: "Doble doble", description: "2 goles y 2 asistencias o más en un partido", metric: "goalsAndAssists", threshold: 2, points: 20 }),
    inMatch("expert")({ _id: "tripleTriple_achievement", name: "Triple triple", description: "3 goles y 3 asistencias o más en un partido", metric: "goalsAndAssists", threshold: 3, points: 60 }),
    inMatch("expert")({ _id: "soloScorer_achievement", name: "Yo me lo guiso", description: "Marca todos los goles de tu equipo en un partido (mín. 3)", metric: "soloScorer", threshold: 3, points: 25 }),
    inMatch("expert")({ _id: "metronome_achievement", name: "Paella, Toros, Tiki taka", description: "50 pases o más en un partido con un 95% de acierto", metric: "metronome", threshold: 95, points: 30 }),
    inMatch("expert")({ _id: "ghost_achievement", icon: "ghost", name: "¿Alguien le ha visto?", description: "Juega un partido entero sin tirar, asistir ni hacer una entrada (no vale de portero)", metric: "ghost", threshold: 1, points: 5 }),
    inMatch("expert")({ _id: "gkConceded10_achievement", name: "Esto es un colador", description: "Encaja 10 goles o más jugando de portero", metric: "gkConceded", threshold: 10, points: 10 }),
    inMatch("expert")({ _id: "shotsWithoutGoal_achievement", name: "Chupón", description: "10 tiros o más en un partido sin marcar", metric: "shotsWithoutGoal", threshold: 10, points: 5 }),
    total("expert")({ _id: "positionsPlayed_achievement", name: "Fútbol total", description: "Juega en las 4 posiciones", metric: "positionsPlayed", threshold: 4, points: 20 }),
    total("expert")({ _id: "positionsScored_achievement", name: "Todoterreno", description: "Marca jugando en las 4 posiciones", metric: "positionsScored", threshold: 4, points: 60 }),

    // ---- Curiosidades ----
    total("curiosities")({ _id: "dayMatches10_achievement", icon: "clock", name: "Maratón", description: "Juega 10 partidos en un mismo día", metric: "dayMatches", threshold: 10, points: 15 }),
    total("curiosities")({ _id: "dayMatches20_achievement", icon: "clock", name: "Vicio", description: "Juega 20 partidos en un mismo día", metric: "dayMatches", threshold: 20, points: 30 }),
    total("curiosities")({ _id: "dayMatches30_achievement", icon: "clock", name: "Esto no es sano", description: "Juega 30 partidos en un mismo día", metric: "dayMatches", threshold: 30, points: 50 }),
    total("curiosities")({ _id: "dayPerfectWins_achievement", name: "Día redondo", description: "Gana tus 5 primeros partidos de un día", metric: "dayPerfectWins", threshold: 5, points: 25 }),
    total("curiosities")({ _id: "dayAllLosses_achievement", name: "Mejor me quedo en la cama", description: "Pierde tus 5 primeros partidos de un día", metric: "dayAllLosses", threshold: 5, points: 5 }),
    total("curiosities")({ _id: "dayGoals10_achievement", name: "Hoy entran todas", description: "Marca 10 goles en un mismo día", metric: "dayGoals", threshold: 10, points: 20 }),
    total("curiosities")({ _id: "daysPlayed30_achievement", icon: "heart", name: "Fiel", description: "Juega en 30 días distintos", metric: "daysPlayed", threshold: 30, points: 15 }),
    total("curiosities")({ _id: "daysPlayed100_achievement", icon: "heart", name: "Abonado", description: "Juega en 100 días distintos", metric: "daysPlayed", threshold: 100, points: 40 }),
    total("curiosities")({ _id: "weekStreak8_achievement", name: "No falla", description: "Juega 8 semanas seguidas", metric: "weekStreak", threshold: 8, points: 25 }),
    total("curiosities")({ _id: "weekStreak26_achievement", name: "Media temporada", description: "Juega 26 semanas seguidas", metric: "weekStreak", threshold: 26, points: 60 }),
    total("curiosities")({ _id: "weekend_achievement", name: "Finde completo", description: "Juega el sábado y el domingo del mismo fin de semana", metric: "weekendPlayed", threshold: 1, points: 5 }),
    total("curiosities")({ _id: "weekDays7_achievement", name: "Sin descanso", description: "Juega los 7 días de una misma semana", metric: "weekDaysPlayed", threshold: 7, points: 40 }),
    total("curiosities")({ _id: "comeback30_achievement", name: "El hijo pródigo", description: "Vuelve a jugar después de 30 días sin hacerlo", metric: "daysSinceLastMatch", threshold: 30, points: 10 }),
    total("curiosities")({ _id: "comeback90_achievement", name: "Vuelve el hijo pródigo… otra vez", description: "Vuelve a jugar después de 90 días sin hacerlo", metric: "daysSinceLastMatch", threshold: 90, points: 20 }),
    total("curiosities")({ _id: "anniversary_achievement", icon: "cake", name: "Aniversario", description: "Juega un partido un año después del primero", metric: "daysSinceFirstMatch", threshold: 365, points: 25 }),
    total("curiosities")({ _id: "sameScore3_achievement", name: "Déjà vu", description: "Tres partidos seguidos con el mismo resultado exacto", metric: "sameScoreStreak", threshold: 3, points: 15 }),
    inMatch("curiosities")({ _id: "christmas_achievement", icon: "gift", name: "Navidad en el campo", description: "Juega un partido el 24 o el 25 de diciembre", metric: "christmasMatch", threshold: 1, points: 10 }),
    inMatch("curiosities")({ _id: "newYear_achievement", icon: "gift", name: "Uvas y goles", description: "Juega un partido el 31 de diciembre o el 1 de enero", metric: "newYearMatch", threshold: 1, points: 10 }),
    inMatch("curiosities")({ _id: "halloween_achievement", icon: "moon", name: "Truco o trato", description: "Juega un partido el 31 de octubre", metric: "halloweenMatch", threshold: 1, points: 10 }),
    inMatch("curiosities")({ _id: "leapDay_achievement", name: "Cada cuatro años", description: "Juega un partido un 29 de febrero", metric: "leapDayMatch", threshold: 1, points: 30 }),
]
