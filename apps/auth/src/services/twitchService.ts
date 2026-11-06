import { TWITCH_SCOPES } from "@trueno-proclub-services/auth"
import type { User, TwitchSyncResult, TwitchUser } from "@trueno-proclub-services/auth"
import { UserRole } from "@trueno-proclub-services/shared"
import { accountModel } from "../models/accountModel.js"
import { PROTECTED_ROLES, userModel } from "../models/userModel.js"
import { readToken, writeToken } from "./tokenCrypto.js"

function minutes(name: string, fallback: number): number {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Pasado este tiempo desde la última sincronización correcta, los datos se consideran viejos */
export const TWITCH_SYNC_STALE_MS = minutes("TWITCH_SYNC_STALE_MINUTES", 360) * 60_000
/** Tras un intento que falla, no se vuelve a probar en segundo plano antes de este tiempo */
export const TWITCH_SYNC_RETRY_MS = minutes("TWITCH_SYNC_RETRY_MINUTES", 10) * 60_000
/** Mínimo entre dos sincronizaciones pedidas a mano (el botón ya espera 60 s en la web) */
const MANUAL_MIN_INTERVAL_MS = 30_000

async function fetchTwitchAPI(url: string, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    }
  })
}

// Twitch rota el refresh token en cada renovación: dos renovaciones a la vez del mismo
// token hacen que una falle. Se comparte la que esté en marcha.
const refreshing = new Map<string, Promise<string | null>>()

function refreshTwitchToken(account: any): Promise<string | null> {
  const key = String(account._id ?? account.id)
  const running = refreshing.get(key)
  if (running) return running

  const job = (async () => {
    // Ilegible (p. ej. ha cambiado BETTER_AUTH_SECRET) = no se puede renovar: tocará reconectar
    const refreshToken = await readToken(account.refreshToken).catch(() => null)
    if (!refreshToken) return null
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
      })
    })
    if (!response.ok) return null

    const data = await response.json()
    // Se guardan cifrados, como los guarda Better Auth al iniciar sesión
    await accountModel.updateTokens(account._id, {
      accessToken: await writeToken(data.access_token),
      refreshToken: await writeToken(data.refresh_token),
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000)
    })
    return data.access_token as string
  })().finally(() => refreshing.delete(key))

  refreshing.set(key, job)
  return job
}

/**
 * Lanza las peticiones con el token guardado; si alguna da 401, renueva el token y repite.
 * `unauthorized` = tras renovar sigue dando 401 (o no se pudo renovar): el token no vale.
 */
async function fetchTwitchWithRefresh(
  urls: string[],
  account: any,
  accessToken: string
): Promise<{ unauthorized: boolean; responses: Response[] | null }> {
  let responses = await Promise.all(urls.map(url => fetchTwitchAPI(url, accessToken)))

  if (responses.some(r => r.status === 401)) {
    const newToken = await refreshTwitchToken(account)
    if (!newToken) return { unauthorized: true, responses: null }
    responses = await Promise.all(urls.map(url => fetchTwitchAPI(url, newToken)))
    if (responses.some(r => r.status === 401)) return { unauthorized: true, responses: null }
  }

  return { unauthorized: false, responses }
}

/** Better Auth guarda los scopes concedidos separados por comas (o espacios, según versión) */
function hasRequiredScopes(scope: string | null | undefined): boolean {
  if (!scope) return true // cuentas antiguas sin el dato: se comprueba con la propia llamada
  const granted = new Set(scope.split(/[\s,]+/).filter(Boolean))
  return TWITCH_SCOPES.every((s) => granted.has(s))
}

// ── Role resolution

function resolveRole(isFollowing: boolean, isSub: boolean, currentRole: string): string {
  if (PROTECTED_ROLES.includes(currentRole)) return currentRole
  if (isSub) return UserRole.subscriber
  if (isFollowing) return UserRole.follower
  return UserRole.visitor
}

// ── Public service

export type TwitchSyncError =
  | { code: "NO_TWITCH_ACCOUNT" }
  | { code: "MISSING_CHANNEL_ID" }
  /** Token caducado, revocado o sin los permisos necesarios: hay que volver a iniciar sesión */
  | { code: "TOKEN_EXPIRED" }
  /** Twitch falló en las dos consultas (follow y sub): no se ha cambiado nada */
  | { code: "FOLLOW_CHECK_FAILED"; status: number; details: unknown }
  /** Sincronización manual pedida otra vez demasiado pronto */
  | { code: "TOO_SOON"; retryAfterSeconds: number }

export type TwitchSyncResponse =
  | { ok: true; data: TwitchSyncResult }
  | { ok: false; error: TwitchSyncError }

async function readJson(res: Response): Promise<any> {
  try { return await res.json() } catch { return null }
}

async function doSync(user: User, attemptAt: Date): Promise<TwitchSyncResponse> {
  const failed = async (error: TwitchSyncError): Promise<TwitchSyncResponse> => {
    await userModel.markTwitchSyncAttempt(user.id, attemptAt)
    return { ok: false, error }
  }
  const needsReauth = async (): Promise<TwitchSyncResponse> => {
    await userModel.markTwitchNeedsReauth(user.id, attemptAt)
    return { ok: false, error: { code: "TOKEN_EXPIRED" } }
  }

  const account = await accountModel.findTwitchAccount(user.id)
  const twitchId = user.twitchId || account?.accountId

  if (!account || !twitchId) return failed({ code: "NO_TWITCH_ACCOUNT" })

  const broadcasterId = process.env.TWITCH_CHANNEL_ID
  if (!broadcasterId) return { ok: false, error: { code: "MISSING_CHANNEL_ID" } }

  // Inicios de sesión de antes de pedir los permisos en el servidor: el token no los tiene
  if (!hasRequiredScopes(account.scope)) return needsReauth()

  // Si no se puede descifrar (p. ej. ha cambiado BETTER_AUTH_SECRET), es como si no hubiera token
  let accessToken: string | null
  try {
    accessToken = await readToken(account.accessToken)
  } catch {
    accessToken = null
  }
  if (!accessToken) return needsReauth()

  const urls = [
    `https://api.twitch.tv/helix/channels/followed?user_id=${twitchId}&broadcaster_id=${broadcasterId}`,
    `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${broadcasterId}&user_id=${twitchId}`,
    `https://api.twitch.tv/helix/users?id=${twitchId}`,
  ]

  let fetched: { unauthorized: boolean; responses: Response[] | null }
  try {
    fetched = await fetchTwitchWithRefresh(urls, account, accessToken)
  } catch (err) {
    // red caída, Twitch no responde, refresh token ilegible...
    return failed({ code: "FOLLOW_CHECK_FAILED", status: 502, details: String(err) })
  }
  if (fetched.unauthorized || !fetched.responses) return needsReauth()

  const [followRes, subRes, userRes] = fetched.responses
  const [followData, subData, userData] = await Promise.all([readJson(followRes), readJson(subRes), readJson(userRes)])

  // Cada dato solo se cambia si Twitch ha respondido bien. Un error (429, 5xx...) ya no
  // cuenta como "no sigue" / "no es sub": se conserva lo que había.
  const followKnown = followRes.ok && typeof followData?.total === "number"
  // subscriptions/user: 200 = es sub, 404 = no lo es, cualquier otra cosa = no se sabe
  const subKnown = subRes.ok || subRes.status === 404

  if (!followKnown && !subKnown) {
    return failed({ code: "FOLLOW_CHECK_FAILED", status: followRes.status, details: followData })
  }

  const isFollowing = followKnown ? followData.total > 0 : !!user.twitchFollowing
  const isSub = subKnown ? subRes.ok && !!subData?.data?.length : !!user.twitchSub
  const subTier: string | null = subKnown
    ? (isSub ? subData.data[0].tier ?? null : null)
    : (user.twitchSubTier ?? null)
  const twitchUser: TwitchUser | undefined = userRes.ok ? userData?.data?.[0] : undefined
  const syncedAt = new Date()

  const role = await userModel.applyTwitchSync(user.id, {
    twitchId,
    twitchFollowing: isFollowing,
    twitchSub: isSub,
    twitchSubTier: subTier,
    twitchSyncedAt: syncedAt,
    twitchSyncAttemptAt: attemptAt,
    twitchNeedsReauth: false,
    name: twitchUser?.display_name ?? user.name,
    image: twitchUser?.profile_image_url ?? user.image,
  } as Partial<User>, resolveRole(isFollowing, isSub, user.role ?? "visitor"))

  return {
    ok: true,
    data: {
      twitchFollowing: isFollowing,
      twitchSub: isSub,
      twitchSubTier: subTier,
      role,
      twitchSyncedAt: syncedAt.toISOString(),
      partial: !followKnown || !subKnown,
    }
  }
}

// Si llegan dos sincronizaciones del mismo usuario a la vez (login + panel), se comparte una
const inFlight = new Map<string, Promise<TwitchSyncResponse>>()
// Último intento por usuario, en memoria: frena los reintentos antes de que se guarde en Mongo
const lastAttempt = new Map<string, number>()

type SyncState = Partial<User> & {
  twitchSyncedAt?: Date | string | null
  twitchSyncAttemptAt?: Date | string | null
  twitchNeedsReauth?: boolean | null
}

function msSince(value: Date | string | number | null | undefined): number {
  if (value === null || value === undefined) return Infinity
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? Date.now() - t : Infinity
}

export const twitchService = {
  syncTwitchData(user: User): Promise<TwitchSyncResponse> {
    const running = inFlight.get(user.id)
    if (running) return running
    const attemptAt = new Date()
    lastAttempt.set(user.id, attemptAt.getTime())
    const job = doSync(user, attemptAt).finally(() => inFlight.delete(user.id))
    inFlight.set(user.id, job)
    return job
  },

  /** Sincronización pedida por el usuario (botón): igual, pero con un mínimo entre peticiones */
  syncTwitchDataManual(user: User): Promise<TwitchSyncResponse> {
    const running = inFlight.get(user.id)
    if (running) return running
    const since = msSince(lastAttempt.get(user.id))
    if (since < MANUAL_MIN_INTERVAL_MS) {
      return Promise.resolve({
        ok: false,
        error: { code: "TOO_SOON", retryAfterSeconds: Math.ceil((MANUAL_MIN_INTERVAL_MS - since) / 1000) }
      })
    }
    return twitchService.syncTwitchData(user)
  },

  /**
   * ¿Toca refrescar en segundo plano? Tiene Twitch, el token vale, la última sincronización
   * correcta es vieja y no se ha intentado hace poco (si Twitch está caído no se insiste en
   * cada carga de página).
   */
  isStale(user: SyncState & { id?: string }): boolean {
    if (!user.twitchId || user.twitchNeedsReauth) return false
    if (msSince(user.twitchSyncedAt) <= TWITCH_SYNC_STALE_MS) return false
    const attempt = Math.min(msSince(user.twitchSyncAttemptAt), user.id ? msSince(lastAttempt.get(user.id)) : Infinity)
    return attempt > TWITCH_SYNC_RETRY_MS
  },
}
