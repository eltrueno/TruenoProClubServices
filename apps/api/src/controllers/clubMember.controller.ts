import * as ClubMemberService from "../services/clubMember.service.js"
import * as PlayerStatsService from "../services/playerStats.service.js"
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

async function getMemberProfileById(req: Request, res: Response, next: NextFunction) {
    try {
        const playerId = String(req.params.playerId)
        if (!playerId) return next(new Error("ERROR_BAD_REQUEST"))
        const response = await ClubMemberService.getProfileById(playerId)
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

export { getAllMembers, getMemberProfileById, getAllPlayerStats, getAllPlayerStatsByType }
async function getMyMember(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) return next(new Error("ERROR_BAD_REQUEST"))
        const response = await ClubMemberService.getByUserId(req.user.id)
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response ?? null
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MEMBER"))
    }
}

export { getMyMember }
