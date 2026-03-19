import * as AchievementsService from "@services/achievements.service"
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


export { getAllDefinitions }