import MatchModel from "@models/match.model"
import dotenv from 'dotenv'
dotenv.config()

const CLUBID: number = Number(process.env.CLUBID || '101456');

const getById = async (id: number) => {
    const response = await MatchModel.find({ matchId: id })
    return response
}

const getLatestByMatchTypeLimit = async (matchType: "league" | "playoff", limit: number) => {
    const response = await MatchModel.find({ matchType: matchType }).sort({ timestamp: -1 }).limit(limit)
    return response
}

const getLatestByPlayer = async (playerName: string, limit: number) => {
    const response = await MatchModel.find({
        $or: [
            {
                "localClub.id": CLUBID,
                "localClub.players.playername": playerName
            },
            {
                "awayClub.id": CLUBID,
                "awayClub.players.playername": playerName
            }
        ]
    }).sort({ timestamp: -1 }).limit(limit)
    return response
}

const getLatestLimit = async (limit: number) => {
    const response = await MatchModel.find({}).sort({ timestamp: -1 }).limit(limit)
    return response
}

const getAll = async () => {
    const response = await MatchModel.find({})
    return response
}

export { getById, getLatestByMatchTypeLimit, getLatestByPlayer, getLatestLimit, getAll }