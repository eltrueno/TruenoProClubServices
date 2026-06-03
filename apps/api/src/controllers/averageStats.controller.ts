import * as AverageStatsService from "@services/averageStats.service"
import { Request, Response, NextFunction } from "express"

export const getAllAverages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await AverageStatsService.getAll()
        res.json({
            status: { code: 200, message: "Ok" },
            response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_AVERAGES"))
    }
}

export const getAverageByPosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const position = String(req.params.position)
        if (!position) return next(new Error("ERROR_BAD_REQUEST"))

        const response = await AverageStatsService.getByPosition(position)
        if (!response) return next(new Error("ERROR_NOT_FOUND"))

        res.json({
            status: { code: 200, message: "Ok" },
            response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_AVERAGES"))
    }
}