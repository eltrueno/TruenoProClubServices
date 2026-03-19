import cron from "node-cron"
import { calculateAndSaveTOTW } from "@services/totw.service"
import { TOTWModel } from "@models/totw.model"

import dotenv from "dotenv"
dotenv.config()

const FORCE_RECALCULATE = process.env.FORCE_RECALCULATE === "true"

const getISOWeekKey = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)

    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

    const year = d.getUTCFullYear()

    return `${year}-${String(week).padStart(2, "0")}`
}

const getPreviousWeekKey = () => {
    const now = new Date()
    const lastWeek = new Date(now)
    lastWeek.setDate(now.getDate() - 7)
    return getISOWeekKey(lastWeek)
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
    cron.schedule("0 0 * * 1", async () => {
        console.info("[TOTW] Calculating team of the week...")
        const week = getPreviousWeekKey()
        await calculateAndSaveTOTW(week)
        console.info("[TOTW] Done")
    })
}