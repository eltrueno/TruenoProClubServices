import { TOTWModel, MemberTotwAppearancesModel } from "src/models/totw.model";

export const getLatest = async () => {
    return TOTWModel.findOne({}, { _id: 0, __v: 0 }).sort({ weekNumber: -1 })
}

export const getByWeekNumber = async (weekNumber: number) => {
    return TOTWModel.findOne({ weekNumber }, { _id: 0, __v: 0 })
}

export const getByWeekIso = async (weekIso: string) => {
    return TOTWModel.findOne({ weekIso }, { _id: 0, __v: 0 })
}

export const getAll = async () => {
    return TOTWModel.find({}, { _id: 0, __v: 0 }).sort({ weekNumber: -1 })
}

export const getAllAppearances = async () => {
    return MemberTotwAppearancesModel.find({}, { _id: 0, __v: 0 }).sort({ weekNumber: -1 })
}

export const getAppearancesByWeek = async (isoWeek: string) => {
    return MemberTotwAppearancesModel.find({ isoWeek }, { _id: 0, __v: 0 })
}

export const getAppearancesByPlayer = async (playerName: string) => {
    return MemberTotwAppearancesModel.find({ playerName }, { _id: 0, __v: 0 }).sort({ weekNumber: -1 })
}

export const getAppearancesByPlayerAndWeek = async (playerName: string, isoWeek: string) => {
    return MemberTotwAppearancesModel.findOne({ playerName, isoWeek }, { _id: 0, __v: 0 })
}