import { TOTWModel, MemberTotwAppearancesModel } from "@models/totw.model"
import MatchModel from "@models/match.model"
import { processTOTWAchievements } from "@services/achievement.service"
import { startOfISOWeek, endOfISOWeek } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import dotenv from "dotenv"
dotenv.config()

const TIMEZONE = process.env.TZ || "Europe/Madrid"

const TOTW_SLOTS = {
    goalkeeper: 1,
    defender: 3,
    midfielder: 5,
    forward: 2
}

const getWeekRangeFromKey = (weekKey: string) => {
    const [yearStr, weekStr] = weekKey.split("-")
    const year = Number(yearStr)
    const week = Number(weekStr)

    const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
    const madridDate = toZonedTime(simple, TIMEZONE)

    const start = startOfISOWeek(madridDate)
    const end = endOfISOWeek(madridDate)

    return { start, end }
}

const getTopPlayersByPosition = async (weekStartTimestamp: number, weekEndTimestamp: number, position: string, limit: number, excludedPlayers: string[], descOrder: boolean) => {
    const result = await MatchModel.aggregate([
        {
            $match: {
                timestamp: { $gte: weekStartTimestamp, $lte: weekEndTimestamp }
            }
        },
        {
            $addFields: {
                clubPlayers: {
                    $cond: [
                        { $eq: ["$localTeam", true] },
                        "$localClub.players",
                        "$awayClub.players"
                    ]
                }
            }
        },
        { $unwind: "$clubPlayers" },
        { $match: { "clubPlayers.position": position } },
        {
            $group: {
                _id: "$clubPlayers.playername",
                avgRating: { $avg: "$clubPlayers.rating" },
                gamesPlayed: { $sum: 1 },
                position: { $last: "$clubPlayers.position" },
                secondsPlayed: { $sum: "$clubPlayers.secondsPlayed" },
                shots: { $sum: "$clubPlayers.shots" },
                goals: { $sum: "$clubPlayers.goals" },
                assists: { $sum: "$clubPlayers.assists" },
                redCards: { $sum: "$clubPlayers.redCards" },
                goalsConceded: { $sum: "$clubPlayers.goalsConceded" },
                cleanSheets: { $sum: { $cond: ["$clubPlayers.cleanSheet", 1, 0] } },
                manOfTheMatch: { $sum: { $cond: ["$clubPlayers.manOfTheMatch", 1, 0] } },
                saves: { $sum: "$clubPlayers.saves" },
                passesMade: { $sum: "$clubPlayers.passesMade" },
                passesSuccess: { $sum: "$clubPlayers.passesSuccess" },
                tacklesMade: { $sum: "$clubPlayers.tacklesMade" },
                tacklesSuccess: { $sum: "$clubPlayers.tacklesSuccess" }
            }
        },
        {
            $match: {
                gamesPlayed: { $gte: 2 },
                _id: { $nin: excludedPlayers }
            }
        },
        {
            $addFields: {
                minutesPlayed: { $round: [{ $divide: ["$secondsPlayed", 60] }, 0] },
                shotAccuracy: {
                    $round: [{
                        $multiply: [
                            { $cond: [{ $gt: ["$shots", 0] }, { $divide: ["$goals", "$shots"] }, 0] },
                            100
                        ]
                    }, 2]
                },
                passAccuracy: {
                    $round: [{
                        $multiply: [
                            { $cond: [{ $gt: ["$passesMade", 0] }, { $divide: ["$passesSuccess", "$passesMade"] }, 0] },
                            100
                        ]
                    }, 2]
                },
                tackleAccuracy: {
                    $round: [{
                        $multiply: [
                            { $cond: [{ $gt: ["$tacklesMade", 0] }, { $divide: ["$tacklesSuccess", "$tacklesMade"] }, 0] },
                            100
                        ]
                    }, 2]
                }
            }
        },
        { $sort: { avgRating: descOrder ? -1 : 1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                playerName: "$_id",
                avgRating: { $round: ["$avgRating", 2] },
                gamesPlayed: 1,
                minutesPlayed: 1,
                position: 1,
                shots: 1,
                goals: 1,
                shotAccuracy: 1,
                assists: 1,
                redCards: 1,
                goalsConceded: 1,
                manOfTheMatch: 1,
                cleanSheets: 1,
                saves: 1,
                passesMade: 1,
                passesSuccess: 1,
                passAccuracy: 1,
                tacklesMade: 1,
                tacklesSuccess: 1,
                tackleAccuracy: 1
            }
        }
    ])
    return result
}

const addTOTWAppearances = async (players: { playerName: string, position: string, avgRating: number }[],
    isoWeek: string, type: "best" | "worst" = "best") => {
    if (!players.length) return

    const docs = players.map(p => ({
        playerName: p.playerName,
        position: p.position,
        rating: p.avgRating,
        isoWeek: isoWeek,
        type
    }))

    await MemberTotwAppearancesModel.insertMany(docs, { ordered: false })
}


export const calculateAndSaveTOTW = async (weekKey: string) => {
    const { start, end } = getWeekRangeFromKey(weekKey)
    const startTimestamp = Math.floor(start.getTime() / 1000)
    const endTimestamp = Math.floor(end.getTime() / 1000)

    let selectedPlayers: string[] = []
    const bestPlayers = []
    const worstPlayers = []

    //best players
    for (const [position, limit] of Object.entries(TOTW_SLOTS)) {
        const positionPlayers = await getTopPlayersByPosition(startTimestamp, endTimestamp, position, limit, selectedPlayers, true)
        positionPlayers.forEach(p => selectedPlayers.push(p.playerName))
        bestPlayers.push(...positionPlayers)
    }
    selectedPlayers = []
    //worst players
    for (const [position, limit] of Object.entries(TOTW_SLOTS)) {
        const positionPlayers = await getTopPlayersByPosition(startTimestamp, endTimestamp, position, limit, selectedPlayers, false)
        positionPlayers.forEach(p => selectedPlayers.push(p.playerName))
        worstPlayers.push(...positionPlayers)
    }

    if (bestPlayers.length === 0 && worstPlayers.length === 0) {
        console.info("[TOTW] No matches found for the week", weekKey, "skipping...")
        return
    }

    const weekNumber = (await TOTWModel.countDocuments()) + 1
    await TOTWModel.create({ weekNumber, weekIso: weekKey, bestPlayers, worstPlayers })
    await addTOTWAppearances(bestPlayers, weekKey, "best")
    await addTOTWAppearances(worstPlayers, weekKey, "worst")

    const affectedPlayers = [...new Set([...bestPlayers, ...worstPlayers].map(p => p.playerName))]
    await processTOTWAchievements(affectedPlayers)

    console.info("[TOTW] Team of the week created successfully for week", weekNumber, "(", weekKey, ")")
}