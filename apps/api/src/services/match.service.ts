import { MatchModel } from "@trueno-proclub-services/shared/models"
import dotenv from 'dotenv'
dotenv.config()

const CLUBID: number = Number(process.env.CLUBID || '101456');

const getById = async (id: number) => {
    return MatchModel.findOne({ matchId: id })
}

const getLatestByMatchTypeLimit = async (matchType: "league" | "playoff", limit: number) => {
    const response = await MatchModel.find({ matchType: matchType }).sort({ timestamp: -1 }).limit(limit)
    return response
}

const getLatestByPlayer = async (playerId: string, limit: number) => {
    const response = await MatchModel.find({
        $or: [
            {
                "localClub.id": CLUBID,
                "localClub.players.playerId": playerId
            },
            {
                "awayClub.id": CLUBID,
                "awayClub.players.playerId": playerId
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