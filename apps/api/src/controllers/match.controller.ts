import {
    getById,
    getLatestByMatchTypeLimit,
    getLatestByPlayer,
    getLatestLimit, getAll
} from "@services/match.service"
import { NextFunction, Request, Response } from "express"

async function getAllMatches(req: Request, res: Response, next: NextFunction) {
    try {
        const response = await getAll()
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MATCHES"))
    }
}

async function getAllMatchesOrdered(req: Request, res: Response, next: NextFunction) {
    try {
        const limitFilter: number = Number(req.query.limit)
        const response = await getLatestLimit(limitFilter)
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MATCHES"))
    }
}

async function getMatchesByPlayer(req: Request, res: Response, next: NextFunction) {
    try {
        const limitFilter: number = Number(req.query.limit)
        const playerName: string = req.params.playerName
        if (playerName === null || playerName === undefined || playerName === "") return next(new Error("ERROR_BAD_REQUEST"))
        const response = await getLatestByPlayer(playerName, limitFilter)
        if (!response || response.length === 0) return next(new Error("ERROR_NOT_FOUND"))
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MATCHES"))
    }
}

async function getMatchesByTypeOrdered(req: Request, res: Response, next: NextFunction) {
    try {
        const limitFilter: number = Number(req.query.limit)
        const type: "league" | "playoff" = <"league" | "playoff">(req.params.type) ?? next(new Error("ERROR_BAD_REQUEST"))
        const response = await getLatestByMatchTypeLimit(type, limitFilter)
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MATCHES"))
    }
}

async function getMatchById(req: Request, res: Response, next: NextFunction) {
    try {
        const id: number = Number(req.params.id);
        if (isNaN(id) || !Number.isInteger(id) || id <= 0) return next(new Error("ERROR_BAD_REQUEST"));
        const response = await getById(id)
        if (!response || response === null || response === undefined || response.length === 0) return next(new Error("ERROR_NOT_FOUND"))
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MATCHES"))
    }
}

export { getAllMatches, getAllMatchesOrdered, getMatchById, getMatchesByTypeOrdered, getMatchesByPlayer }