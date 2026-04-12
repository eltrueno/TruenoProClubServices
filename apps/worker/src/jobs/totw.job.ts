import cron from "node-cron"
import { calculateAndSaveTOTW } from "@services/totw.service"
import { TOTWModel, MemberTotwAppearancesModel } from "@models/totw.model"
import { getISOWeek, getISOWeekYear, subWeeks, isAfter, setHours, setMinutes, setSeconds, endOfISOWeek } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import dotenv from "dotenv"
dotenv.config()

const FORCE_RECALCULATE = process.env.FORCE_RECALCULATE === "true"
const TIMEZONE = process.env.TZ || "Europe/Madrid"
const TOTW_CRON_SCHEDULE = process.env.TOTW_CRON_SCHEDULE || "0 21 * * 0"

const getLatestCompletedWeekKey = () => {
    const now = new Date()
    const tzNow = toZonedTime(now, TIMEZONE)
    
    // Determine this week's Sunday 21:00
    let thisSunday21 = endOfISOWeek(tzNow)
    thisSunday21 = setHours(thisSunday21, 21)
    thisSunday21 = setMinutes(thisSunday21, 0)
    thisSunday21 = setSeconds(thisSunday21, 0)

    // If we are currently past Sunday 21:00, the "completed" week is the one ending today
    // Otherwise, it's the week that ended last Sunday
    const targetDate = isAfter(tzNow, thisSunday21) ? tzNow : subWeeks(tzNow, 1)
    
    const week = getISOWeek(targetDate)
    const year = getISOWeekYear(targetDate)
    return `${year}-${String(week).padStart(2, "0")}`
}

const getCurrentWeekKey = () => {
    const now = new Date()
    const tzNow = toZonedTime(now, TIMEZONE)
    const week = getISOWeek(tzNow)
    const year = getISOWeekYear(tzNow)
    return `${year}-${String(week).padStart(2, "0")}`
}

export const checkMissedTOTW = async (force = false) => {
    const week = getLatestCompletedWeekKey()

    const existing = await TOTWModel.findOne({ weekIso: week })

    if (force || !existing) {
        if (force && existing) {
            console.info(`[TOTW] Forced recalculate: Cleaning up existing records for week ${week}...`)
            await TOTWModel.deleteOne({ weekIso: week })
            await MemberTotwAppearancesModel.deleteMany({ isoWeek: week })
        } else if (!existing) {
            console.info(`[TOTW] Missed calculation detected for week ${week}, running now...`)
        }

        await calculateAndSaveTOTW(week)
    } else {
        console.info(`[TOTW] Week ${week} already calculated, skipping startup check.`)
    }
}

export const scheduleTOTWJob = () => {
    console.log("[TOTW] TOTW job scheduled")
    
    if (FORCE_RECALCULATE) {
        console.info("[TOTW] Force recalculate enabled, checking latest finished week...")
        checkMissedTOTW(true)
    } else {
        console.log("[TOTW] Force recalculate disabled, running standard startup check...")
        checkMissedTOTW(false)
    }

    console.log(`[TOTW] Cron schedule set to: ${TOTW_CRON_SCHEDULE} in ${TIMEZONE}`);
    cron.schedule(TOTW_CRON_SCHEDULE, async () => {
        console.info("[TOTW] Calculating team of the week...")
        const week = getCurrentWeekKey()
        await calculateAndSaveTOTW(week)
        console.info("[TOTW] Done")
    }, {
        timezone: TIMEZONE
    })
}