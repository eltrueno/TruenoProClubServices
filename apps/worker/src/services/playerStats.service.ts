import { IMatch } from "@interfaces/match.interface"
import { IMatchPlayer } from "@interfaces/matchPlayer.interface"
import MatchModel from "@models/match.model"
import { PlayerStatsOfficialModel, PlayerStatsFriendlyModel } from "@models/playerstats.model"
import { processAchievements, recalculateAllTOTWAchievements } from "@services/achievement.service"
import { Model } from "mongoose"

/**
 * Returns the right stats model based on match type:
 * league + playoff → official
 * friendly → friendly
 */
function getStatsModel(matchType: string): Model<any> {
    return matchType === "friendly" ? PlayerStatsFriendlyModel : PlayerStatsOfficialModel
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
            saves: player.saves || 0,
            manOfTheMatch: player.manOfTheMatch ? 1 : 0,
            hattricks: isHattrick ? 1 : 0,
            pokers: isPoker ? 1 : 0,
        }

        const positionKey = `playedPositions.${player.position}`

        await StatsModel.updateOne(
            { playerName: player.playername },
            {
                $inc: {
                    ...incFields,
                    [positionKey]: 1
                }
            },
            { upsert: true }
        )

        await recomputeMostPlayedPosition(player.playername, StatsModel)

        if (!skipAchievements) {
            const updatedStats = await StatsModel.findOne({ playerName: player.playername }).lean()
            if (updatedStats) {
                await processAchievements(player.playername, updatedStats,
                    { matchType: match.matchType === "friendly" ? "friendly" : "official", matchObj: match },
                    silentAchievements)
            }
        }
    }
}

/**
 * After updating playedPositions, recalculates and saves mostPlayedPosition.
 */
const recomputeMostPlayedPosition = async (playerName: string, StatsModel: Model<any>) => {
    const doc = await StatsModel.findOne({ playerName })
    if (!doc || !doc.playedPositions) return;

    const posMap: any = doc.playedPositions
    let maxPos = "unknown"
    let maxCount = 0

    // Mongoose Map support
    if (posMap instanceof Map) {
        posMap.forEach((count: number, pos: string) => {
            if (count > maxCount) {
                maxCount = count
                maxPos = pos
            }
        })
    } else {
        // Plain object fallback
        for (const pos in posMap) {
            if (posMap[pos] > maxCount) {
                maxCount = posMap[pos]
                maxPos = pos
            }
        }
    }

    await StatsModel.updateOne(
        { playerName },
        { $set: { mostPlayedPosition: maxPos } }
    )
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

    const allMatches = await MatchModel.find({}).sort({ timestamp: 1 }) // Process matches chronologically
    for (const match of allMatches) {
        await accumulateStatsFromMatch(match as unknown as IMatch, clubId, false, false)
    }

    await recalculateAllTOTWAchievements()

    console.info("[Stats] Full recalculation done.")
}

export { accumulateStatsFromMatch, recalculateAllPlayerStats }
