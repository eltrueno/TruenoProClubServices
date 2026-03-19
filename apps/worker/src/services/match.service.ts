import { IMatch } from "@interfaces/match.interface"
import MatchModel from "@models/match.model"
import { accumulateStatsFromMatch } from "@services/playerStats.service"
import dotenv from "dotenv"

dotenv.config()
const CLUBID: number = Number(process.env.CLUBID) || 290776;

const insertOne = async (match: IMatch) => {
    var model = new MatchModel(match)
    model._id = match.matchId
    const response = await MatchModel.create(model)

    // Accumulate stats and process achievements sequentially
    try {
        await accumulateStatsFromMatch(match, CLUBID);
    } catch (err) {
        console.error("[Stats] Failed to accumulate stats from match:", err);
    }

    return response
}

const getLatest = async () => {
    const response = await MatchModel.find().sort({ timestamp: -1 }).limit(1)
    return response
}

export { insertOne, getLatest }