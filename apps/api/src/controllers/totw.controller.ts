import * as TOTWService from "src/services/totw.service"
import { Request, Response, NextFunction } from "express"

export const getLatestTOTW = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await TOTWService.getLatest()
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_TOTW"))
    }
}

export const getSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = TOTWService.getSchedule()
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_TOTW_SCHEDULE"))
    }
}

export const getTOTWByWeek = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const week = String(req.params.week)
        if (!week) {
            return next(new Error("ERROR_BAD_REQUEST"))
        }
        let iso = false
        try {
            const weekNumber = Number(week)
            if (!Number.isInteger(weekNumber)) iso = true
        } catch (err) {
            iso = true
        }

        const response = iso ? await TOTWService.getByWeekIso(week) : await TOTWService.getByWeekNumber(Number(week))
        if (!response) return next(new Error("ERROR_NOT_FOUND"))
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        return next(new Error("ERROR_GETTING_TOTW"))
    }
}

export const getAllTOTWS = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await TOTWService.getAll()
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_TOTW"))
    }
}

export const getAllAppearances = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await TOTWService.getAllAppearances()
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_TOTW"))
    }
}

export const getAppearancesByWeek = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const week = String(req.params.week)
        if (!week) {
            return next(new Error("ERROR_BAD_REQUEST"))
        }

        const response = await TOTWService.getAppearancesByWeek(week)
        if (!response) return next(new Error("ERROR_NOT_FOUND"))
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        return next(new Error("ERROR_GETTING_TOTW"))
    }
}
