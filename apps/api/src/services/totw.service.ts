import { TOTWModel, MemberTotwAppearancesModel } from "src/models/totw.model";
import { CronExpressionParser } from "cron-parser";

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

export const getSchedule = () => {
    const cron = process.env.TOTW_CRON_SCHEDULE || "0 21 * * 0";
    const timezone = process.env.TZ || "Europe/Madrid";
    
    try {
        const interval = CronExpressionParser.parse(cron, { tz: timezone } as any);
        const nextDate = interval.next().toDate();
        return {
            cron,
            timezone,
            nextDate: nextDate.toISOString()
        };
    } catch (err) {
        console.error("Error parsing TOTW cron schedule:", err);
        return {
            cron,
            timezone,
            nextDate: null
        };
    }
}