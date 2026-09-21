import type { NextFunction, Request, Response } from "express"
import type { IClubMemberAdminPatch } from "@trueno-proclub-services/shared"
import * as ClubMemberService from "../services/clubMember.service.js"
import * as ImageStorage from "../services/imageStorage.service.js"

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

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

/**
 * POST /admin/members/:playerId/image  { image: "data:image/png;base64,..." }
 * La web ya manda el PNG recortado a 400x450; aquí se sube a R2 y se guarda la URL en el miembro.
 */
async function uploadMemberImage(req: Request, res: Response, next: NextFunction) {
    try {
        const playerId = String(req.params.playerId)
        if (!ImageStorage.PLAYER_ID_RE.test(playerId)) return next(new Error("ERROR_BAD_REQUEST"))
        // El miembro tiene que existir antes de escribir nada en el bucket
        if (!(await ClubMemberService.exists(playerId))) return next(new Error("ERROR_NOT_FOUND"))

        const image = typeof req.body?.image === "string" ? req.body.image : ""
        const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(image)
        if (!match) return next(new Error("ERROR_BAD_REQUEST"))
        const png = Buffer.from(match[1], "base64")
        if (png.length === 0 || png.length > MAX_IMAGE_BYTES || ImageStorage.sniffImageType(png) !== "image/png") return next(new Error("ERROR_BAD_REQUEST"))

        const imageUrl = await ImageStorage.uploadPlayerImage(playerId, png)
        const updated = await ClubMemberService.adminPatch(playerId, { imageUrl })
        if (!updated) return next(new Error("ERROR_NOT_FOUND"))
        res.json({ status: { code: 200, message: "Ok" }, response: updated })
    } catch (err) {
        if (err instanceof Error && err.message === "IMAGE_STORAGE_NOT_CONFIGURED") {
            res.status(503).json({ status: { code: 503, message: err.message } })
            return
        }
        console.error(err)
        next(new Error("ERROR_UPLOADING_IMAGE"))
    }
}

/**
 * POST /admin/image-proxy  { url }
 * Devuelve la imagen remota (el editor la necesita sin CORS). Es POST+JSON a propósito: obliga
 * al preflight de CORS, así ningún <img src> de otra web puede disparar descargas con la cookie del admin.
 */
async function imageProxy(req: Request, res: Response, next: NextFunction) {
    try {
        const url = typeof req.body?.url === "string" ? req.body.url : ""
        if (!url || url.length > 2048) return next(new Error("ERROR_BAD_REQUEST"))
        const { contentType, body } = await ImageStorage.fetchRemoteImage(url)
        // El tipo sale de la firma del fichero; nosniff + CSP por si alguien abre la respuesta directamente
        res.setHeader("Content-Type", contentType)
        res.setHeader("Content-Length", String(body.length))
        res.setHeader("Content-Disposition", "inline; filename=\"image\"")
        res.setHeader("X-Content-Type-Options", "nosniff")
        res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox")
        res.setHeader("Cache-Control", "no-store")
        res.send(body)
    } catch (err) {
        next(err instanceof Error ? err : new Error("ERROR_FETCHING_IMAGE"))
    }
}

export { patchMember, uploadMemberImage, imageProxy }
