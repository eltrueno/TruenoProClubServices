import { computed, ref } from "vue"
import { authClient, type User } from "@/lib/auth"
import { CLUBS, SITE_URL } from "@/config/site"
import { ApiError, authApi, clubApi, type ITwitchSyncResult } from "@/lib/api"
import { watchSessionWithRetry, type SessionRetry } from "@/lib/sessionRetry"

// Tras sincronizar con Twitch se sobreescriben los campos del usuario sin esperar a la sesión nueva
const _userOverride = ref<Partial<User> | null>(null)
// Si el auth no responde, better-auth puede quedarse en isPending para siempre
const SESSION_PENDING_TIMEOUT_MS = 6000
const _pendingTimedOut = ref(false)
if (typeof window !== "undefined") setTimeout(() => { _pendingTimedOut.value = true }, SESSION_PENDING_TIMEOUT_MS)
// Reintentos de get-session (ver lib/sessionRetry): uno para toda la página, aunque useAccount se use en varias islas
let _sessionRetry: SessionRetry | null = null

/**
 * Better Auth solo deja borrar la cuenta con una sesión reciente (`session.freshAge`, 24 h por
 * defecto). Se comprueba antes con un margen para no soltar el jugador y que luego el borrado
 * se rechace a medias.
 */
const FRESH_SESSION_MS = 23 * 3600_000

/** URL de esta web para la vuelta de Twitch: siempre a /login, que decide a dónde seguir */
export const loginReturnUrl = (redirect?: string | null) =>
    `${SITE_URL}/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`

export function useAccount() {
    const sessionState = authClient.useSession()
    if (!_sessionRetry && typeof window !== "undefined") _sessionRetry = watchSessionWithRetry(sessionState)
    const retrying = computed(() => _sessionRetry?.retrying.value ?? false)

    const user = computed<User | null>(() => {
        const base = (sessionState.value?.data?.user as User | undefined) ?? null
        return base && _userOverride.value ? ({ ...base, ..._userOverride.value } as User) : base
    })
    // Mientras se reintenta tras un fallo, la página sigue "comprobando sesión". Si ya había
    // sesión cargada (falla un refresco en segundo plano) no se toca nada: se reintenta por detrás.
    const hasSession = computed(() => !!sessionState.value?.data)
    const isPending = computed(() =>
        (retrying.value && !hasSession.value) || ((sessionState.value?.isPending ?? false) && !_pendingTimedOut.value))
    const isLoggedIn = computed(() => !!user.value)
    const sessionCreatedAt = computed(() => (sessionState.value?.data?.session as { createdAt?: Date | string } | undefined)?.createdAt)
    // Caído de verdad solo cuando han fallado todos los reintentos
    const authUnavailable = computed(() => !!sessionState.value?.error && !retrying.value && !hasSession.value)

    /**
     * Login con Twitch a página completa (sin popup). Twitch vuelve a /login, que ve la
     * sesión y sigue hasta `redirect` (la web del club desde la que se vino).
     */
    async function loginWithTwitch(redirect?: string | null) {
        await authClient.signIn.social({
            provider: "twitch",
            callbackURL: loginReturnUrl(redirect),
            errorCallbackURL: `${SITE_URL}/login?error=twitch${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`,
        })
    }

    /** Sincroniza follow/sub/rol. Si el token de Twitch ya no vale, devuelve "reauth" */
    async function syncTwitch(): Promise<ITwitchSyncResult | "reauth"> {
        try {
            const data = await authApi.twitchSync()
            _userOverride.value = {
                twitchFollowing: data.twitchFollowing,
                twitchSub: data.twitchSub,
                twitchSubTier: data.twitchSubTier,
                twitchSyncedAt: data.twitchSyncedAt ?? new Date().toISOString(),
                twitchNeedsReauth: false,
                role: data.role,
            }
            return data
        } catch (e) {
            if (e instanceof ApiError && e.code === "TWITCH_TOKEN_EXPIRED") {
                _userOverride.value = { twitchNeedsReauth: true }
                return "reauth"
            }
            throw e
        }
    }

    async function logout() {
        await authClient.signOut()
        window.location.href = "/login"
    }

    /**
     * Suelta el jugador vinculado antes de borrar la cuenta: la vinculación vive en la base
     * compartida de los clubes, que el auth no toca al borrar. Basta con que responda un api
     * (la base es la misma); si no responde ninguno, la limpieza diaria del api lo hará.
     */
    async function releasePlayer(): Promise<void> {
        for (const club of CLUBS) {
            try {
                await clubApi(club).unlinkMe()
                return
            } catch (e) {
                console.warn(`[cuenta] No se pudo desvincular en ${club.name}`, e)
            }
        }
    }

    /**
     * Borra la cuenta. Better Auth exige una sesión reciente: si es antigua hay que volver a
     * entrar (`"reauth"`) y no se toca nada. Si es reciente, primero se suelta el jugador.
     */
    async function deleteAccount(): Promise<"deleted" | "reauth"> {
        const created = new Date(sessionCreatedAt.value ?? 0).getTime()
        if (!Number.isFinite(created) || Date.now() - created > FRESH_SESSION_MS) return "reauth"

        await releasePlayer()
        const { error } = await authClient.deleteUser({})
        if (error) {
            if (error.code === "SESSION_EXPIRED" || error.status === 401) return "reauth"
            throw new Error(error.message || "No se ha podido eliminar la cuenta")
        }
        return "deleted"
    }

    return { user, isPending, isLoggedIn, authUnavailable, loginWithTwitch, syncTwitch, logout, deleteAccount }
}
