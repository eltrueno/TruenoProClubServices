import * as AchievementsService from "../services/achievements.service.js"
import * as AccountAchievementsService from "../services/accountAchievements.service.js"
import { Request, Response, NextFunction } from "express"

const getAllDefinitions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await AchievementsService.getAllDefinitions()
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_ACHIEVEMENT_DEFINITIONS"))
    }
}


/** Definiciones de los logros de cuenta (comunes a todos los clubes; salen del repo, no de la DB) */
const getAccountDefinitions = (_req: Request, res: Response) => {
    res.json({
        status: {
            code: 200,
            message: "Ok"
        },
        response: AccountAchievementsService.getDefinitions()
    })
}

export { getAllDefinitions, getAccountDefinitions }