import type { IMatch } from "@trueno-proclub-services/shared"
import { MatchModel } from "@trueno-proclub-services/shared/models"
import { accumulateStatsFromMatch } from "./playerStats.service.js"
import { upsertMembersFromMatch } from "./member.service.js"
import dotenv from "dotenv"

dotenv.config()
const CLUBID: number = Number(process.env.CLUBID) || 290776

const insertOne = async (match: IMatch) => {
    const response = await MatchModel.create({ ...match, _id: match.matchId })

    // Members first (the match is the only source of playerId), then stats + achievements
    try {
        await upsertMembersFromMatch(match, CLUBID)
    } catch (err) {
        console.error("[Members] Failed to upsert members from match:", err)
    }
    try {
        await accumulateStatsFromMatch(match, CLUBID)
    } catch (err) {
        console.error("[Stats] Failed to accumulate stats from match:", err)
    }

    return response
}

const getLatest = async () => {
    return MatchModel.find().sort({ timestamp: -1 }).limit(1)
}

export { insertOne, getLatest }
