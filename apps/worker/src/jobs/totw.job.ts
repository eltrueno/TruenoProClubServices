import cron from "node-cron"
import { calculateAndSaveTOTW } from "@services/totw.service"
import { TOTWModel } from "@models/totw.model"
import { getISOWeek, getISOWeekYear, subWeeks } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import dotenv from "dotenv"
dotenv.config()

const FORCE_RECALCULATE = process.env.FORCE_RECALCULATE === "true"
const TIMEZONE = process.env.TZ || "Europe/Madrid"
const TOTW_CRON_SCHEDULE = process.env.TOTW_CRON_SCHEDULE || "0 21 * * 0"

const getPreviousWeekKey = () => {
    const now = new Date()
    const tzNow = toZonedTime(now, TIMEZONE)
    const lastWeek = subWeeks(tzNow, 1)
    const week = getISOWeek(lastWeek)
    const year = getISOWeekYear(lastWeek)
    return `${year}-${String(week).padStart(2, "0")}`
}

const getCurrentWeekKey = () => {
    const now = new Date()
    const tzNow = toZonedTime(now, TIMEZONE)
    const week = getISOWeek(tzNow)
    const year = getISOWeekYear(tzNow)
    return `${year}-${String(week).padStart(2, "0")}`
}

export const checkMissedTOTW = async () => {
    const week = getPreviousWeekKey()

    const existing = await TOTWModel.findOne({ weekIso: week })

    if (!existing) {
        console.info("[TOTW] Missed calculation detected, running now...")
        await calculateAndSaveTOTW(week)
    }
}

export const scheduleTOTWJob = () => {
    console.log("[TOTW] TOTW job scheduled")
    if (FORCE_RECALCULATE) {
        console.info("[TOTW] Force recalculate enabled, running now...")
        checkMissedTOTW()
    } else console.log("[TOTW] Force recalculate disabled, skipping...")
    // Schedule basado en variable de entorno (por defecto Domingos a las 21:00)
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