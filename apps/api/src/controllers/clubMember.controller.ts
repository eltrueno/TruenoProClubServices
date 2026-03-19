import * as ClubMemberService from "@services/clubMember.service"
import * as PlayerStatsService from "@services/playerStats.service"
import { NextFunction, Request, Response } from "express"

async function getAllMembers(req: Request, res: Response, next: NextFunction) {
    try {
        const response = await ClubMemberService.getAll()
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MEMBERS"))
    }
}

async function getAllPlayerStats(req: Request, res: Response, next: NextFunction) {
    try {
        const response = await PlayerStatsService.getAll()
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_PLAYERSTATS"))
    }
}

async function getAllPlayerStatsByType(req: Request, res: Response, next: NextFunction) {
    try {
        const type = req.params.type as "official" | "friendly"
        const response = await PlayerStatsService.getAllByType(type)
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_PLAYERSTATS"))
    }
}

async function getMemberProfileByName(req: Request, res: Response, next: NextFunction) {
    try {
        const playername = String(req.params.playername)
        if (!playername) return next(new Error("ERROR_BAD_REQUEST"))
        const response = await ClubMemberService.getProfileByName(playername)
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
        next(new Error("ERROR_GETTING_MEMBER"))
    }
}

export { getAllMembers, getMemberProfileByName, getAllPlayerStats, getAllPlayerStatsByType }