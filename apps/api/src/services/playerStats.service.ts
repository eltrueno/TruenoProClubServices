import { PlayerStatsOfficialModel, PlayerStatsFriendlyModel } from "@trueno-proclub-services/shared/models"

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

const getByPlayerId = async (playerId: string, type?: "official" | "friendly") => {
    if (type) {
        const response = await (type === "official" ? PlayerStatsOfficialModel : PlayerStatsFriendlyModel).find({ playerId }, { _id: 0 })
        return response
    }
    const [official, friendly] = await Promise.all([
        PlayerStatsOfficialModel.find({ playerId }, { _id: 0 }),
        PlayerStatsFriendlyModel.find({ playerId }, { _id: 0 })
    ])
    return { "official": official, "friendly": friendly }
}

export { getAll, getAllByType, getByPlayerId }