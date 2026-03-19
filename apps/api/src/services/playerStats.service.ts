import { PlayerStatsOfficialModel, PlayerStatsFriendlyModel } from "@models/playerStats.model"

const getAll = async () => {
    const [official, friendly] = await Promise.all([
        PlayerStatsOfficialModel.find({}, { _id: 0 }),
        PlayerStatsFriendlyModel.find({}, { _id: 0 })
    ])
    return { official, friendly }
}

const getAllByType = async (type: "official" | "friendly") => {
    const response = await (type === "official" ? PlayerStatsOfficialModel : PlayerStatsFriendlyModel).find({}, { _id: 0 })
    return response
}

const getByName = async (playerName: string, type?: "official" | "friendly") => {
    if (type) {
        const response = await (type === "official" ? PlayerStatsOfficialModel : PlayerStatsFriendlyModel).findOne({ playerName }, { _id: 0 })
        return response
    }
    const [official, friendly] = await Promise.all([
        PlayerStatsOfficialModel.findOne({ playerName }, { _id: 0 }),
        PlayerStatsFriendlyModel.findOne({ playerName }, { _id: 0 })
    ])
    return { "official": official, "friendly": friendly }
}

export { getAll, getAllByType, getByName }