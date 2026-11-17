import { isHiddenAchievement, rarityFromPoints, type AchievementCategory } from "./constants.js"
import type { IAchievementDefinition } from "./types/achievement.js"

/**
 * Definiciones de los logros DE CUENTA: comunes a todos los clubes y solo para quien tiene su
 * cuenta de casemuro.stream vinculada a su jugador. Al vincularse se reciben de golpe todos
 * los que ya se cumplan, y no se pierden nunca (ni al dejar de ser sub, ni al desvincularse).
 *
 * No se guardan en la base: api y worker las leen de aquí. Los desbloqueos van a la base
 * compartida (`account_achievements_unlocked`). Las métricas las calcula el worker con los
 * datos de la cuenta (auth) y los totales del jugador en cada club (`player_club_totals`):
 * ver accountAchievement.service.ts.
 *
 * Mismo formato que los de club (achievements.definitions.ts). Todos son acumulativos.
 */
type Input = Omit<IAchievementDefinition, "type" | "category" | "rarity" | "hidden" | "scope" | "mode">

const make = (category: AchievementCategory, mode: IAchievementDefinition["mode"]) =>
    (def: Input): IAchievementDefinition => ({ ...def, type: "account", category, scope: "cumulative", mode, rarity: rarityFromPoints(def.points), hidden: isHiddenAchievement(category, rarityFromPoints(def.points)) })

const once = (category: AchievementCategory) => make(category, "unique")
const milestone = (category: AchievementCategory) => make(category, "infinite")

export const ACCOUNT_ACHIEVEMENT_DEFINITIONS: IAchievementDefinition[] = [
    // ---- Tu cuenta ----
    once("account")({ _id: "account_playerLinked", name: "Fichado", description: "Vincula tu cuenta a tu jugador", metric: "playerLinked", threshold: 1, points: 20 }),
    once("account")({ _id: "account_discordLinked", name: "En el grupo", description: "Conecta tu Discord", metric: "discordLinked", threshold: 1, points: 10 }),
    once("account")({ _id: "account_follower", icon: "heart", name: "De la casa", description: "Sigue el canal de Twitch", metric: "twitchFollower", threshold: 1, points: 5 }),
    once("account")({ _id: "account_sub", name: "Socio", description: "Suscríbete al canal de Twitch (con una vez vale)", metric: "twitchSub", threshold: 1, points: 25 }),
    once("account")({ _id: "account_subHighTier", name: "Socio de oro", description: "Suscríbete al canal con nivel 2 o 3", metric: "twitchSubHighTier", threshold: 1, points: 40 }),
    once("account")({ _id: "account_fullPack", name: "Pack completo", description: "Jugador vinculado, Discord conectado, siguiendo el canal y sub, todo a la vez", metric: "fullPack", threshold: 1, points: 30 }),
    once("account")({ _id: "account_age365", icon: "cake", name: "Un año por aquí", description: "Un año con cuenta", metric: "accountAgeDays", threshold: 365, points: 20 }),
    once("account")({ _id: "account_age730", icon: "cake", name: "De toda la vida", description: "Dos años con cuenta", metric: "accountAgeDays", threshold: 730, points: 40 }),

    // ---- Entre clubes ----
    once("global")({ _id: "global_2clubs", name: "Doble agente", description: "Juega en dos clubes de Casemuro", metric: "clubsPlayed", threshold: 2, points: 30 }),
    once("global")({ _id: "global_50each", name: "Arraigado", description: "Juega 50 partidos en cada uno de dos clubes", metric: "minGamesPerClub", threshold: 50, points: 50 }),
    once("global")({ _id: "global_scored2clubs", name: "Goleador en dos escudos", description: "Marca en dos clubes", metric: "clubsScored", threshold: 2, points: 20 }),
    once("global")({ _id: "global_100goalsEach", name: "Killer global", description: "Marca 100 goles en cada uno de dos clubes", metric: "minGoalsPerClub", threshold: 100, points: 100 }),
    once("global")({ _id: "global_sameDay", name: "Mismo día, dos camisetas", description: "Juega con dos clubes el mismo día", metric: "sameDayClubs", threshold: 2, points: 25 }),
    milestone("global")({ _id: "global_games_milestone", name: "Trotamundos", description: "Cada 100 partidos entre todos los clubes", metric: "totalGamesPlayed", step: 100, points: 20 }),
    milestone("global")({ _id: "global_goals_milestone", name: "Pichichi global", description: "Cada 100 goles entre todos los clubes", metric: "totalGoalsScored", step: 100, points: 20 }),
    milestone("global")({ _id: "global_assists_milestone", name: "Asistente global", description: "Cada 100 asistencias entre todos los clubes", metric: "totalAssists", step: 100, points: 20 }),
    milestone("global")({ _id: "global_wins_milestone", name: "Ganador en serie", description: "Cada 100 victorias entre todos los clubes", metric: "totalWins", step: 100, points: 20 }),
    once("global")({ _id: "global_500games", name: "Veterano", description: "Juega 500 partidos entre todos los clubes", metric: "totalGamesPlayed", threshold: 500, points: 75 }),
    once("global")({ _id: "global_1000games", name: "Inmortal", description: "Juega 1000 partidos entre todos los clubes", metric: "totalGamesPlayed", threshold: 1000, points: 150 }),

    // ---- Colección ----
    once("collection")({ _id: "collection_10", name: "Empezando la colección", description: "Desbloquea 10 logros de club", metric: "clubAchievements", threshold: 10, points: 10 }),
    once("collection")({ _id: "collection_25", name: "Coleccionista", description: "Desbloquea 25 logros de club", metric: "clubAchievements", threshold: 25, points: 30 }),
    once("collection")({ _id: "collection_50", name: "Completista", description: "Desbloquea 50 logros de club", metric: "clubAchievements", threshold: 50, points: 75 }),
    once("collection")({ _id: "collection_100", name: "Lo tiene todo", description: "Desbloquea 100 logros de club", metric: "clubAchievements", threshold: 100, points: 150 }),
    milestone("collection")({ _id: "collection_points_milestone", name: "Cazapuntos", description: "Cada 500 puntos en logros de club", metric: "clubPoints", step: 500, points: 25 }),
]
