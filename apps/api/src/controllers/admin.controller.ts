import type { NextFunction, Request, Response } from "express"
import type { IClubMemberAdminPatch } from "@trueno-proclub-services/shared"
import * as ClubMemberService from "../services/clubMember.service.js"

const isHttpUrl = (value: string) => {
    try {
        const u = new URL(value)
        return u.protocol === "https:" || u.protocol === "http:"
    } catch {
        return false
    }
}

/**
 * PATCH /admin/members/:playerId  { imageUrl?: string | null, userId?: string | null }
 * `null` desvincula; un campo ausente no se toca.
 */
async function patchMember(req: Request, res: Response, next: NextFunction) {
    try {
        const playerId = String(req.params.playerId)
        const body = (req.body ?? {}) as Record<string, unknown>
        const patch: IClubMemberAdminPatch = {}

        if ("imageUrl" in body) {
            if (body.imageUrl === null || body.imageUrl === "") patch.imageUrl = null
            else if (typeof body.imageUrl === "string" && isHttpUrl(body.imageUrl)) patch.imageUrl = body.imageUrl
            else return next(new Error("ERROR_BAD_REQUEST"))
        }

        if ("userId" in body) {
            if (body.userId === null || body.userId === "") patch.userId = null
            else if (typeof body.userId === "string") patch.userId = body.userId
            else return next(new Error("ERROR_BAD_REQUEST"))
        }

        if (Object.keys(patch).length === 0) return next(new Error("ERROR_BAD_REQUEST"))

        const updated = await ClubMemberService.adminPatch(playerId, patch)
        if (!updated) return next(new Error("ERROR_NOT_FOUND"))

        res.json({ status: { code: 200, message: "Ok" }, response: updated })
    } catch (err) {
        console.error(err)
        next(new Error("ERROR_UPDATING_MEMBER"))
    }
}

export { patchMember }
