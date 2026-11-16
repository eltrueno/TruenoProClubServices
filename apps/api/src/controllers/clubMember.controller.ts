import * as ClubMemberService from "../services/clubMember.service.js"
import * as PlayerStatsService from "../services/playerStats.service.js"
import * as PlayerIdentityService from "../services/playerIdentity.service.js"
import * as IdentityCleanupService from "../services/identityCleanup.service.js"
import * as AccountAchievementsService from "../services/accountAchievements.service.js"
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

const MAX_USER_IDS = 100

/**
 * Jugador vinculado a cada cuenta: `?ids=a,b` -> `[{ userId, playerId }]` (solo las vinculadas).
 * Público, como el `userId` que ya traen los miembros. La vinculación es global, así que
 * responde igual el api de cualquier club. Lo usa el auth service para sus consultas con token.
 */
async function getPlayersByUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const raw = typeof req.query.ids === "string" ? req.query.ids : ""
        const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))]
        if (ids.length === 0 || ids.length > MAX_USER_IDS) return next(new Error("ERROR_BAD_REQUEST"))
        const response = await PlayerIdentityService.getByUserIds(ids)
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MEMBER"))
    }
}

export { getAllMembers, getMemberProfileById, getAllPlayerStats, getAllPlayerStatsByType, getPlayersByUsers }
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

/**
 * Jugador de la cuenta con sesión en una sola petición: el EA ID vinculado (global, juegue o
 * no en este club) y su miembro en este club si juega aquí. Distingue "sin vincular" de
 * "vinculado pero sin partidos aquí", que /members/me no distingue (null en los dos casos).
 */
async function getMyIdentity(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) return next(new Error("ERROR_BAD_REQUEST"))
        const identity = await PlayerIdentityService.getByUserId(req.user.id)
        const member = identity ? await ClubMemberService.getByUserId(req.user.id) : null
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: { playerId: identity?.playerId ?? null, member: member ?? null }
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MEMBER"))
    }
}

/**
 * La cuenta con sesión deja su jugador libre (y retira su solicitud pendiente). Lo usa
 * accounts justo antes de borrar la cuenta, para que el jugador no se quede vinculado a una
 * cuenta que ya no existe. Volver a vincularlo exige una solicitud aprobada por un admin.
 */
async function unlinkMyIdentity(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) return next(new Error("ERROR_BAD_REQUEST"))
        const result = await IdentityCleanupService.unlinkUser(req.user.id)
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            response: { unlinked: result.unlinked > 0 }
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_UPDATING_MEMBER"))
    }
}

/**
 * Logros de cuenta y puntos de la cuenta con sesión. Los de cuenta se conservan aunque se
 * desvincule el jugador; los puntos de club solo salen mientras haya jugador vinculado.
 */
async function getMyAchievements(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) return next(new Error("ERROR_BAD_REQUEST"))
        const identity = await PlayerIdentityService.getByUserId(req.user.id)
        const response = await AccountAchievementsService.getFor(req.user.id, identity?.playerId ?? null)
        if (!response) return next(new Error("ERROR_GETTING_MEMBER"))
        res.json({
            status: {
                code: 200,
                message: "Ok"
            },
            // `clubId`: el de ESTE club, para que quien llame sepa de qué club son los puntos de `points.clubs`
            response: { playerId: identity?.playerId ?? null, clubId: Number(process.env.CLUBID) || null, ...response }
        })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_GETTING_MEMBER"))
    }
}

export { getMyMember, getMyIdentity, unlinkMyIdentity, getMyAchievements }
