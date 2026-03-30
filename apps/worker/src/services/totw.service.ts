import { TOTWModel, MemberTotwAppearancesModel } from "@models/totw.model"
import MatchModel from "@models/match.model"
import { processTOTWAchievements } from "@services/achievement.service"
import { startOfISOWeek, endOfISOWeek } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import dotenv from "dotenv"
import { ITOTWPlayer } from "srcinterfaces/totw.interface"
import { getTOTWProducer } from "@events/index";
dotenv.config()

const TIMEZONE = process.env.TZ || "Europe/Madrid"
const MIN_GAMES_PLAYED = Number(process.env.TOTW_MIN_GAMES_PLAYED) || 5
const MIN_GAMES_FLOOR = Number(process.env.TOTW_MIN_GAMES_FLOOR) || 2

const TOTW_SLOTS = {
    goalkeeper: 1,
    defender: 3,
    midfielder: 5,
    forward: 2
}

const POSITION_ORDER = ['goalkeeper', 'defender', 'forward', 'midfielder'] as const

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

const getTopPlayersByPosition = async (
    weekStart: number,
    weekEnd: number,
    position: string,
    limit: number,
    excludedPlayers: string[],
    descOrder: boolean,
    minGames: number = MIN_GAMES_PLAYED,
    fetchExtra: number = 3,
): Promise<ITOTWPlayer[]> => {
    return MatchModel.aggregate([
        {
            $match: { timestamp: { $gte: weekStart, $lte: weekEnd } }
        },
        {
            $addFields: {
                clubPlayers: {
                    $cond: [{ $eq: ['$localTeam', true] }, '$localClub.players', '$awayClub.players']
                }
            }
        },
        { $unwind: '$clubPlayers' },
        { $match: { 'clubPlayers.position': position } },
        {
            $group: {
                _id: '$clubPlayers.playername',
                avgRating: { $avg: '$clubPlayers.rating' },
                gamesPlayed: { $sum: 1 },
                position: { $last: '$clubPlayers.position' },
                secondsPlayed: { $sum: '$clubPlayers.secondsPlayed' },
                shots: { $sum: '$clubPlayers.shots' },
                goals: { $sum: '$clubPlayers.goals' },
                assists: { $sum: '$clubPlayers.assists' },
                redCards: { $sum: '$clubPlayers.redCards' },
                goalsConceded: { $sum: '$clubPlayers.goalsConceded' },
                cleanSheets: { $sum: { $cond: ['$clubPlayers.cleanSheet', 1, 0] } },
                manOfTheMatch: { $sum: { $cond: ['$clubPlayers.manOfTheMatch', 1, 0] } },
                saves: { $sum: '$clubPlayers.saves' },
                passesMade: { $sum: '$clubPlayers.passesMade' },
                passesSuccess: { $sum: '$clubPlayers.passesSuccess' },
                tacklesMade: { $sum: '$clubPlayers.tacklesMade' },
                tacklesSuccess: { $sum: '$clubPlayers.tacklesSuccess' },
            }
        },
        {
            $match: {
                gamesPlayed: { $gte: minGames },
                _id: { $nin: excludedPlayers },
            }
        },
        {
            $addFields: {
                minutesPlayed: { $round: [{ $divide: ['$secondsPlayed', 60] }, 0] },
                shotAccuracy: {
                    $round: [{
                        $multiply: [
                            { $cond: [{ $gt: ['$shots', 0] }, { $divide: ['$goals', '$shots'] }, 0] },
                            100
                        ]
                    }, 2]
                },
                passAccuracy: {
                    $round: [{
                        $multiply: [
                            { $cond: [{ $gt: ['$passesMade', 0] }, { $divide: ['$passesSuccess', '$passesMade'] }, 0] },
                            100
                        ]
                    }, 2]
                },
                tackleAccuracy: {
                    $round: [{
                        $multiply: [
                            { $cond: [{ $gt: ['$tacklesMade', 0] }, { $divide: ['$tacklesSuccess', '$tacklesMade'] }, 0] },
                            100
                        ]
                    }, 2]
                },
            }
        },
        // Desempate: rating -> partidos jugados -> goles
        { $sort: { avgRating: descOrder ? -1 : 1, gamesPlayed: -1, goals: -1 } },
        { $limit: limit + fetchExtra },
        {
            $project: {
                _id: 0,
                playerName: '$_id',
                avgRating: { $round: ['$avgRating', 2] },
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
                tackleAccuracy: 1,
            }
        }
    ])
}

const fillPositionSlot = async (
    weekStart: number,
    weekEnd: number,
    position: string,
    limit: number,
    hardExcluded: string[],
    softExcluded: string[],
    descOrder: boolean,
): Promise<ITOTWPlayer[]> => {

    const label = `${position} (${descOrder ? 'best' : 'worst'})`

    const phases = [
        { minGames: MIN_GAMES_PLAYED, excluded: [...hardExcluded, ...softExcluded], desc: 'condiciones ideales' },
        { minGames: Math.ceil(MIN_GAMES_PLAYED / 2), excluded: [...hardExcluded, ...softExcluded], desc: 'minGames reducido' },
        { minGames: MIN_GAMES_FLOOR, excluded: [...hardExcluded, ...softExcluded], desc: 'minGames mínimo' },
        { minGames: MIN_GAMES_FLOOR, excluded: [...softExcluded], desc: 'sin hardExcluded' },
        { minGames: MIN_GAMES_FLOOR, excluded: [], desc: 'sin exclusiones' },
    ]

    for (const [i, phase] of phases.entries()) {
        const candidates = await getTopPlayersByPosition(
            weekStart, weekEnd, position, limit,
            phase.excluded, descOrder, phase.minGames
        )

        const players = candidates.slice(0, limit)

        if (i > 0) {
            console.warn(`[TOTW] ${label} — fase ${i + 1} (${phase.desc}): ${players.length}/${limit}`)
        }

        if (players.length === limit) return players

        if (i === phases.length - 1) {
            if (players.length > 0) {
                console.warn(`[TOTW] ${label} — slot incompleto: ${players.length}/${limit}`)
            } else {
                console.warn(`[TOTW] ${label} — sin candidatos disponibles`)
            }
            return players
        }
    }

    return []
}

interface ExcludedProfile {
    playerName: string;
    position: string;
}

const buildTeam = async (
    weekStart: number,
    weekEnd: number,
    descOrder: boolean,
    hardExcludedProfiles: ExcludedProfile[] = [],
): Promise<ITOTWPlayer[]> => {
    const team: ITOTWPlayer[] = []
    const softSelected: string[] = []

    for (const position of POSITION_ORDER) {
        const hardExclThisSlot = hardExcludedProfiles
            .filter(p => p.position === position)
            .map(p => p.playerName)

        const players = await fillPositionSlot(
            weekStart, weekEnd, position, TOTW_SLOTS[position],
            hardExclThisSlot, softSelected, descOrder
        )
        players.forEach(p => softSelected.push(p.playerName))
        team.push(...players)
    }

    return team
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


export const calculateAndSaveTOTW = async (weekKey: string): Promise<void> => {
    const { start, end } = getWeekRangeFromKey(weekKey)
    const weekStart = Math.floor(start.getTime() / 1000)
    const weekEnd = Math.floor(end.getTime() / 1000)

    const bestPlayers = await buildTeam(weekStart, weekEnd, true)
    
    const hardExcludedProfiles = bestPlayers.map(p => ({
        playerName: p.playerName,
        position: p.position
    }))
    
    const worstPlayers = await buildTeam(weekStart, weekEnd, false, hardExcludedProfiles)

    if (!bestPlayers.length && !worstPlayers.length) {
        console.info('[TOTW] No matches found for week', weekKey, '— skipping')
        return
    }

    const weekNumber = (await TOTWModel.countDocuments()) + 1

    const totw = await TOTWModel.create({ weekNumber, weekIso: weekKey, bestPlayers, worstPlayers })
    await addTOTWAppearances(bestPlayers, weekKey, 'best')
    await addTOTWAppearances(worstPlayers, weekKey, 'worst')

    const affected = [...new Set([...bestPlayers, ...worstPlayers].map(p => p.playerName))]
    await processTOTWAchievements(affected)

    await getTOTWProducer().publish(totw)

    console.info('[TOTW] Created successfully — week', weekNumber, `(${weekKey})`)
}