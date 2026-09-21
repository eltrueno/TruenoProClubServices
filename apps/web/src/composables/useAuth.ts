import { authClient, SITE_URL, type User } from "@/lib/auth"
import { ApiError, authApi, tpcsApi, type ITwitchSyncResult } from "@/lib/api"
import { UserRole, type IClubMember } from "@trueno-proclub-services/shared"
import { computed, ref } from "vue"

/** Sesión de Better Auth (lo que devuelve `useSession().data`): usuario + datos de la sesión */
export interface Session {
    user: User
    session: { id: string; userId: string; expiresAt: Date | string; token?: string }
}

// Tras sincronizar con Twitch se sobreescriben los campos del usuario sin esperar a la sesión nueva
const _userOverride = ref<User | null>(null)
// Jugador vinculado a la cuenta (members.userId): se carga bajo demanda y se comparte entre islas
const _myMember = ref<IClubMember | null>(null)
const _myMemberLoaded = ref(false)
// Si el auth no responde (caído, CORS...), better-auth puede quedarse en isPending para siempre:
// pasado este tiempo se da la sesión por no iniciada para no dejar la UI en skeleton
const SESSION_PENDING_TIMEOUT_MS = 5000
const _pendingTimedOut = ref(false)
if (typeof window !== "undefined") setTimeout(() => { _pendingTimedOut.value = true }, SESSION_PENDING_TIMEOUT_MS)

export function useAuth() {
    const sessionState = authClient.useSession()

    const session = computed<Session | null>(() => (sessionState.value?.data as Session | null | undefined) ?? null)
    const isPending = computed(() => (sessionState.value?.isPending ?? false) && !_pendingTimedOut.value)
    const isLoggingIn = ref(false)

    const user = computed<User | null>(() => _userOverride.value ?? session.value?.user ?? null)
    const isLoggedIn = computed(() => !!user.value)
    const isAdmin = computed(() => user.value?.role === UserRole.admin)

    const myMember = computed(() => _myMember.value)
    async function loadMyMember(force = false) {
        if (!isLoggedIn.value) { _myMember.value = null; return null }
        if (_myMemberLoaded.value && !force) return _myMember.value
        try {
            _myMember.value = await tpcsApi.members.getMine()
        } catch (e) {
            console.warn("[useAuth] myMember unavailable", e)
            _myMember.value = null
        }
        _myMemberLoaded.value = true
        return _myMember.value
    }


    /** Sincroniza follow/sub/rol con Twitch. Devuelve el resultado, o `null` si hubo que relanzar el login. */
    async function syncTwitch(silent?: boolean): Promise<ITwitchSyncResult | null> {
        let syncData: ITwitchSyncResult
        try {
            syncData = await authApi.twitchSync()
        } catch (e) {
            if (e instanceof ApiError && e.code === "TWITCH_TOKEN_EXPIRED") {
                await loginWithTwitchPopup(true)
                return null
            }
            throw e
        }
        //refresh session
        await authClient.$fetch("/get-session", { method: "GET" })
        if (user.value) {
            _userOverride.value = {
                ...user.value,
                twitchFollowing: syncData.twitchFollowing,
                twitchSub: syncData.twitchSub,
                role: syncData.role,
            }
        }
        if (!silent) window.location.reload()
        return syncData
    }

    async function loginWithTwitch(callbackURL = `${SITE_URL}/login`) {
        await authClient.signIn.social({ provider: "twitch", callbackURL })
    }

    async function waitForTwitchLogin(): Promise<void> {
        const { data } = await authClient.signIn.social({
            provider: "twitch",
            callbackURL: `${SITE_URL}/authcallback`,
            scopes: ["user:read:email", "user:read:follows", "user:read:subscriptions"],
            disableRedirect: true
        })

        if (!data?.url) return

        const width = 600
        const height = 700
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2

        window.open(data.url, "Login con Twitch", `width=${width},height=${height},left=${left},top=${top}`)

        return new Promise<void>((resolve) => {
            window.addEventListener("message", (e) => {
                if (e.origin !== SITE_URL) return
                if (e.data === "auth-success") resolve()
            }, { once: true })
        })
    }

    async function loginWithTwitchPopup(silent?: boolean, callbackURL?: string) {
        isLoggingIn.value = true
        try {
            const { data } = await authClient.signIn.social({
                provider: "twitch",
                callbackURL: `${SITE_URL}/authcallback`,
                scopes: ["user:read:email", "user:read:follows", "user:read:subscriptions"],
                disableRedirect: true
            })

            if (!data?.url) {
                isLoggingIn.value = false
                return
            }

            const width = 600
            const height = 700
            const left = window.screenX + (window.outerWidth - width) / 2
            const top = window.screenY + (window.outerHeight - height) / 2

            window.open(data.url, "Login con Twitch", `width=${width},height=${height},left=${left},top=${top}`)

            // Escucha el mensaje de la página intermedia
            window.addEventListener("message", async (e) => {
                if (e.origin !== SITE_URL) return
                if (e.data === "auth-success") {
                    await authClient.$fetch("/get-session")
                    if (!silent) window.location.href = callbackURL ?? "/micuenta"
                    else window.location.reload()
                }
                isLoggingIn.value = false
            }, { once: true })
        } catch (error) {
            console.error("Login error:", error)
            isLoggingIn.value = false
        }
    }

    async function logout(silent?: boolean, callbackURL?: string) {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: async () => {
                    await authClient.$fetch("/get-session")
                    if (!silent) window.location.href = callbackURL ?? "/login"
                    else window.location.reload()
                }
            }
        })
    }

    async function deleteAccount(silent?: boolean, callbackURL?: string) {
        const { error } = await authClient.deleteUser({})

        if (error?.code === "SESSION_EXPIRED") {
            await waitForTwitchLogin()
            await authClient.deleteUser({
                fetchOptions: {
                    onSuccess: () => {
                        if (!silent) window.location.href = callbackURL ?? "/login"
                    }
                }
            })
            return
        }

        if (!silent) window.location.href = callbackURL ?? "/login"
    }

    return {
        user,
        session,
        isLoggedIn,
        isAdmin,
        isPending,
        myMember,
        loadMyMember,
        syncTwitch,
        loginWithTwitch,
        loginWithTwitchPopup,
        logout,
        deleteAccount,
        isLoggingIn,
        error: sessionState.value?.error,
    }

}