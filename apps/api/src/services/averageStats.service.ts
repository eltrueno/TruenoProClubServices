import { AverageStatsModel } from "@models/averageStats.model"

export const getAll = async () => {
    return AverageStatsModel.find({}, { _id: 0, __v: 0 })
}

export const getByPosition = async (position: string) => {
    return AverageStatsModel.findOne({ position }, { _id: 0, __v: 0 })
}