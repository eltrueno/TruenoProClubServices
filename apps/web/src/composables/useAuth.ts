import { authClient } from "@/lib/auth"
import { computed, onMounted, watch } from "vue"

let synced = false

export function useAuth() {
    const sessionState = authClient.useSession()

    const session = computed(() => sessionState.value?.data ?? null)
    const isPending = computed(() => sessionState.value?.isPending ?? false)

    const user = computed(() => session.value?.user ?? null)
    const isLoggedIn = computed(() => !!user.value)

    onMounted(() => {
        watch(isPending, async (pending) => {
            if (!pending && !synced && isLoggedIn.value) {
                synced = true
                console.log("syncing")
                await fetch(`https://auth.casemurocity.org/api/twitch/sync`, {
                    credentials: "include"
                })
                console.log("synced")
            }
        }, { immediate: true })
    })

    async function loginWithTwitch(callbackURL = "https://www.casemurocity.org/login") {
        await authClient.signIn.social({ provider: "twitch", callbackURL })
    }

    async function loginWithTwitchPopup(silent?: boolean, callbackURL?: string) {
        const { data } = await authClient.signIn.social({
            provider: "twitch",
            callbackURL: "https://www.casemurocity.org/authcallback",
            scopes: ["user:read:email", "user:read:follows", "user:read:subscriptions"],
            disableRedirect: true
        })

        if (!data?.url) return

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
        }, { once: true })
    }

    async function logout(silent?: boolean, callbackURL?: string) {
        synced = false
        await authClient.signOut({
            fetchOptions: {
                onSuccess: async () => {
                    await authClient.$fetch("/get-session")
                    if (!silent) window.location.href = callbackURL ?? "/login"
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
        loginWithTwitch,
        loginWithTwitchPopup,
        logout,
        deleteAccount,
        error: sessionState.value?.error,
    }

}