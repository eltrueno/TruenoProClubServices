import { createHmac } from "node:crypto"
import express, { Router } from "express"
import type { AuthType } from "@trueno-proclub-services/auth"
import { db } from "../db/index.js"

/**
 * Login de DESARROLLO: entrar como un usuario de prueba sin pasar por Twitch, para
 * probar accounts y las webs en local (Twitch no deja volver a localhost sin registrar la
 * URL, y el auth de producción no admite peticiones desde localhost).
 *
 * Solo existe si se cumplen las TRES cosas a la vez (ver isDevLoginEnabled):
 *   DEVMODE=true · DEV_LOGIN=true · BETTER_AUTH_URL apunta a localhost
 * Así no puede quedarse encendido por error en producción. Lo arranca `pnpm dev:local`.
 */

export function isDevLoginEnabled(): boolean {
  if (process.env.DEVMODE !== "true" || process.env.DEV_LOGIN !== "true") return false
  try {
    const host = new URL(process.env.BETTER_AUTH_URL || "").hostname
    return host === "localhost" || host === "127.0.0.1"
  } catch {
    return false
  }
}

interface Preset {
  id: string
  label: string
  role: string
  twitchFollowing: boolean
  twitchSub: boolean
  twitchSubTier: string | null
  color: string
}

const PRESETS: Preset[] = [
  { id: "visitante", label: "Visitante", role: "visitor", twitchFollowing: false, twitchSub: false, twitchSubTier: null, color: "#64748b" },
  { id: "seguidor", label: "Seguidor", role: "follower", twitchFollowing: true, twitchSub: false, twitchSubTier: null, color: "#0ea5e9" },
  { id: "sub", label: "Sub (nivel 1)", role: "subscriber", twitchFollowing: true, twitchSub: true, twitchSubTier: "1000", color: "#9146ff" },
  { id: "admin", label: "Admin", role: "admin", twitchFollowing: true, twitchSub: false, twitchSubTier: null, color: "#c80d0d" },
]

/** Avatar de mentira (SVG en data URI) para no depender de nada externo */
const avatar = (p: Preset) =>
  "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${p.color}"/>` +
    `<text x="32" y="41" font-family="Arial" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${p.label.charAt(0)}</text></svg>`
  )

export function createDevRoutes(auth: AuthType): Router {
  const router = Router()

  router.get("/status", (_req, res) => {
    res.json({ devLogin: true, presets: PRESETS.map(({ id, label, role }) => ({ id, label, role })) })
  })

  router.post("/login", express.json(), async (req, res) => {
    const preset = PRESETS.find((p) => p.id === req.body?.preset)
    if (!preset) return res.status(400).json({ status: "error", message: "Unknown preset", code: "UNKNOWN_PRESET" })

    try {
      const ctx = await auth.$context
      const email = `${preset.id}@dev.local`
      const profile = {
        name: `Dev ${preset.label}`,
        image: avatar(preset),
        role: preset.role,
        twitchFollowing: preset.twitchFollowing,
        twitchSub: preset.twitchSub,
        twitchSubTier: preset.twitchSubTier,
        twitchSyncedAt: new Date(),
        twitchNeedsReauth: false,
      }

      const found = await ctx.internalAdapter.findUserByEmail(email)
      let userId = found?.user.id
      if (!userId) {
        const created = await ctx.internalAdapter.createUser({ email, emailVerified: true, name: profile.name })
        userId = created.id
      }
      // Se reaplica siempre: así el preset vuelve a su estado aunque se haya tocado al probar
      await db.collection("user").updateOne({ email }, { $set: profile })

      const session = await ctx.internalAdapter.createSession(userId)
      // Cookie firmada igual que la firma Better Auth (HMAC-SHA256 del token con el secreto)
      const signature = createHmac("sha256", ctx.secret).update(session.token).digest("base64")
      res.cookie(ctx.authCookies.sessionToken.name, `${session.token}.${signature}`, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        expires: new Date(session.expiresAt),
      })
      res.json({ status: "success", user: { id: userId, email, ...profile } })
    } catch (err) {
      console.error("[dev] login error:", err)
      res.status(500).json({ status: "error", message: "Dev login failed" })
    }
  })

  return router
}
