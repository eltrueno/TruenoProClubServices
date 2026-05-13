import { authClient } from "@/lib/auth"
import { computed, ref } from "vue"

const _userOverride = ref<any>(null)

export function useAuth() {
    const sessionState = authClient.useSession()

    const session = computed(() => sessionState.value?.data ?? null)
    const isPending = computed(() => sessionState.value?.isPending ?? false)
    const isLoggingIn = ref(false)

    const user = computed(() => _userOverride.value ?? session.value?.user ?? null)
    const isLoggedIn = computed(() => !!user.value)


    async function syncTwitch(silent?: boolean) {
        const syncRes = await fetch(`https://auth.casemurocity.org/api/twitch/sync`, { credentials: "include" })
        const syncData = await syncRes.json()
        if (syncData.code === "TWITCH_TOKEN_EXPIRED") {
            await loginWithTwitchPopup(true)
            return
        }
        //refresh session
        await authClient.$fetch("/get-session", { method: "GET" })
        _userOverride.value = {
            ...user.value,
            twitchFollowing: syncData.twitchFollowing,
            twitchSub: syncData.twitchSub,
            role: syncData.role,
        }
        if (!silent) window.location.reload()
        return syncData
    }

    async function loginWithTwitch(callbackURL = "https://www.casemurocity.org/login") {
        await authClient.signIn.social({ provider: "twitch", callbackURL })
    }

    async function loginWithTwitchPopup(silent?: boolean, callbackURL?: string) {
        isLoggingIn.value = true
        try {
            const { data } = await authClient.signIn.social({
                provider: "twitch",
                callbackURL: "https://www.casemurocity.org/authcallback",
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
                if (e.origin !== "https://www.casemurocity.org") return
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
        await authClient.deleteUser({
            fetchOptions: {
                onSuccess: async () => {
                    await authClient.$fetch("/get-session")
                    if (!silent) window.location.href = callbackURL ?? "/login"
                }
            }
        })
    }

    return {
        user,
        session,
        isLoggedIn,
        isPending,
        syncTwitch,
        loginWithTwitch,
        loginWithTwitchPopup,
        logout,
        deleteAccount,
        isLoggingIn,
        error: sessionState.value?.error,
    }

}