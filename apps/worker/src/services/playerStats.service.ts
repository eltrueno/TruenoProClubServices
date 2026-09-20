import { countsForPlayerStats, type IMatch, type IMatchPlayer, type IPlayerStats } from "@trueno-proclub-services/shared"
import { MatchModel, PlayerStatsOfficialModel, PlayerStatsFriendlyModel } from "@trueno-proclub-services/shared/models"
import { processAchievements, recalculateAllTOTWAchievements } from "./achievement.service.js"
import { Model } from "mongoose"

/**
 * Returns the right stats model based on match type:
 * league + playoff → official
 * friendly → friendly
 */
function getStatsModel(matchType: string): Model<IPlayerStats> {
    return matchType === "friendly" ? PlayerStatsFriendlyModel : PlayerStatsOfficialModel
}

const SUMMABLE_FIELDS = [
    "gamesPlayed", "minutesPlayed", "wins", "losses", "ties", "goals", "assists", "shots", "redCards",
    "passesMade", "passesSuccess", "ratingSum", "tacklesMade", "tacklesSuccess", "cleanSheets",
    "goalsConceded", "manOfTheMatch", "hattricks", "pokers", "saves"
] as const

/**
 * Totales de un jugador sumando todas sus posiciones (los logros acumulativos
 * son del jugador, no de la posición).
 */
async function getPlayerTotals(StatsModel: Model<IPlayerStats>, playerId: string) {
    const docs = await StatsModel.find({ playerId }).lean()
    if (docs.length === 0) return null
    const totals: Record<string, number> = {}
    for (const field of SUMMABLE_FIELDS) {
        totals[field] = docs.reduce((acc, d) => acc + (Number(d[field]) || 0), 0)
    }
    return totals
}

/**
 * Called after inserting a new match.
 * Increments stats for each of our club's players
 */
const accumulateStatsFromMatch = async (match: IMatch, clubId: number, skipAchievements = false, silentAchievements = false) => {
    const StatsModel = getStatsModel(match.matchType)
    const isLocal = Number(match.localClub.id) === Number(clubId)
    const ourPlayers: IMatchPlayer[] = isLocal ? match.localClub.players : match.awayClub.players

    const isWin = match.result === "win"
    const isLoss = match.result === "loose"
    const isTie = match.result === "tie"

    for (const player of ourPlayers) {
        if (!player.playerId) continue
        // 0 segundos jugados: se guarda en el partido pero no altera stats ni logros
        if (!countsForPlayerStats(player)) continue
        const isHattrick = player.goals === 3
        const isPoker = player.goals >= 4

        const incFields: Record<string, number> = {
            gamesPlayed: 1,
            minutesPlayed: Math.round((player.secondsPlayed || 0) / 60),
            wins: isWin ? 1 : 0,
            losses: isLoss ? 1 : 0,
            ties: isTie ? 1 : 0,
            goals: player.goals || 0,
            assists: player.assists || 0,
            shots: player.shots || 0,
            redCards: player.redCards || 0,
            passesMade: player.passesMade || 0,
            passesSuccess: player.passesSuccess || 0,
            ratingSum: player.rating || 0,
            tacklesMade: player.tacklesMade || 0,
            tacklesSuccess: player.tacklesSuccess || 0,
            cleanSheets: player.cleanSheet ? 1 : 0,
            goalsConceded: player.goalsConceded || 0,
            saves: player.saves || 0,
            manOfTheMatch: player.manOfTheMatch ? 1 : 0,
            hattricks: isHattrick ? 1 : 0,
            pokers: isPoker ? 1 : 0,
        }

        await StatsModel.updateOne(
            { playerId: player.playerId, position: player.position },
            {
                $inc: incFields,
                // playerName se refresca en cada partido: siempre el último gamertag visto
                $set: { playerName: player.playerName },
                $setOnInsert: { playerId: player.playerId, position: player.position }
            },
            { upsert: true }
        )

        if (!skipAchievements) {
            const totals = await getPlayerTotals(StatsModel, player.playerId)
            if (totals) {
                await processAchievements(player.playerId, player.playerName, totals,
                    { matchType: match.matchType === "friendly" ? "friendly" : "official", matchObj: match },
                    silentAchievements)
            }
        }
    }
}

/**
 * Full recalculation from scratch for ALL players, for both official and friendly.
 * Idempotent: replaces all stats with a fresh calculation from the match history.
 * Safe to call at startup.
 */
const recalculateAllPlayerStats = async (clubId: number) => {
    console.info("[Stats] Starting full recalculation from match history...")

    await PlayerStatsOfficialModel.deleteMany({})
    await PlayerStatsFriendlyModel.deleteMany({})

    const allMatches = await MatchModel.find({}).sort({ timestamp: 1 }).lean() // Process matches chronologically
    for (const match of allMatches) {
        await accumulateStatsFromMatch(match as unknown as IMatch, clubId, false, false)
    }

    await recalculateAllTOTWAchievements()

    console.info("[Stats] Full recalculation done.")
}

export { accumulateStatsFromMatch, recalculateAllPlayerStats }
