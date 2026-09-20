import type { NextFunction, Request, Response } from "express"
import * as LinkRequestService from "../services/linkRequest.service.js"

const ok = (res: Response, response: unknown) => res.json({ status: { code: 200, message: "Ok" }, response })

/** GET /members/me/link-request */
async function getMyLinkRequest(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) return next(new Error("ERROR_BAD_REQUEST"))
        ok(res, await LinkRequestService.getPendingByUser(req.user.id))
    } catch (err) {
        next(err)
    }
}

/** POST /members/me/link-request { playerId } */
async function createMyLinkRequest(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) return next(new Error("ERROR_BAD_REQUEST"))
        const playerId = typeof req.body?.playerId === "string" ? req.body.playerId.trim() : ""
        if (!playerId) return next(new Error("ERROR_BAD_REQUEST"))
        ok(res, await LinkRequestService.create(req.user, playerId))
    } catch (err) {
        const msg = err instanceof Error ? err.message : ""
        if (msg === "ALREADY_LINKED" || msg === "PLAYER_TAKEN") {
            res.status(409).json({ status: { code: 409, message: msg } })
            return
        }
        next(err)
    }
}

/** DELETE /members/me/link-request */
async function cancelMyLinkRequest(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) return next(new Error("ERROR_BAD_REQUEST"))
        ok(res, { cancelled: await LinkRequestService.cancel(req.user.id) })
    } catch (err) {
        next(err)
    }
}

/** GET /admin/link-requests */
async function getPendingLinkRequests(_req: Request, res: Response, next: NextFunction) {
    try {
        ok(res, await LinkRequestService.getAllPending())
    } catch (err) {
        next(err)
    }
}

/** POST /admin/link-requests/:id/approve */
async function approveLinkRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await LinkRequestService.approve(String(req.params.id), req.user!.id)
        if (!result) return next(new Error("ERROR_NOT_FOUND"))
        ok(res, result)
    } catch (err) {
        next(err)
    }
}

/** POST /admin/link-requests/:id/reject */
async function rejectLinkRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await LinkRequestService.reject(String(req.params.id), req.user!.id)
        if (!result) return next(new Error("ERROR_NOT_FOUND"))
        ok(res, result)
    } catch (err) {
        next(err)
    }
}

export { getMyLinkRequest, createMyLinkRequest, cancelMyLinkRequest, getPendingLinkRequests, approveLinkRequest, rejectLinkRequest }
