import type { NextFunction, Request, Response } from "express"
import { UserRole, type IAuthUser as User } from "@trueno-proclub-services/shared"

declare global {
    namespace Express {
        interface Request {
            user?: User
        }
    }
}

const AUTH_URL = process.env.AUTH_URL || "https://auth.casemurocity.org"

/**
 * Valida la sesión contra el servicio de auth reenviando la cookie
 * (las cookies de `.casemurocity.org` llegan al api sin más) y exige rol admin.
 */
async function fetchSessionUser(cookieHeader: string): Promise<User | null> {
    const res = await fetch(`${AUTH_URL}/api/auth/get-session`, {
        headers: { cookie: cookieHeader }
    })
    if (!res.ok) return null
    const data = (await res.json()) as { user?: User } | null
    return data?.user ?? null
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await fetchSessionUser(req.headers.cookie ?? "")
        if (!user) {
            res.status(401).json({ status: { code: 401, message: "UNAUTHORIZED" } })
            return
        }
        req.user = user
        next()
    } catch (err) {
        console.error("[auth] Error validating session:", err)
        res.status(502).json({ status: { code: 502, message: "AUTH_UNAVAILABLE" } })
    }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== UserRole.admin) {
        res.status(403).json({ status: { code: 403, message: "FORBIDDEN" } })
        return
    }
    next()
}
