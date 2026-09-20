import { AchievementDefinitionModel, AchievementUnlockedModel } from "@trueno-proclub-services/shared/models"

const getAllDefinitions = async () => {
    return await AchievementDefinitionModel.find({}, { __v: 0, createdAt: 0, updatedAt: 0 })
}

const getUnlockedByPlayerId = async (playerId: string) => {
    const response = await AchievementUnlockedModel.aggregate([
        { $match: { playerId } },
        {
            $lookup: {
                from: "achievements_definitions",
                localField: "achievementId",
                foreignField: "_id",
                as: "definition"
            }
        },
        {
            $addFields: {
                definition: { $arrayElemAt: ["$definition", 0] }
            }
        },
        {
            $unset: [
                "definition._id",
                "definition.__v",
                "definition.createdAt",
                "definition.updatedAt"
            ]
        },
        {
            $project: {
                _id: 0,
                playerId: 1,
                playerName: 1,
                achievementId: 1,
                reached: 1,
                unlockedAt: 1,
                matchId: 1,
                definition: 1
            }
        }
    ]);
    return response
}

export { getAllDefinitions, getUnlockedByPlayerId }