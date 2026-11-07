import { authClient, type User } from "@/lib/auth"
import { tpcsApi } from "@/lib/api"
import { accountsLoginUrl } from "@/lib/accounts"
import { UserRole, type IClubMember } from "@trueno-proclub-services/shared"
import { computed, ref } from "vue"

/**
 * Sesión en la web del club. Iniciar sesión y todo lo de la cuenta (ajustes, Twitch,
 * vincular jugador, borrar la cuenta) se hace en accounts.casemuro.stream: la cookie es
 * de .casemuro.stream, así que la sesión de allí vale aquí directamente.
 */

/** Sesión de Better Auth (lo que devuelve `useSession().data`): usuario + datos de la sesión */
export interface Session {
    user: User
    session: { id: string; userId: string; expiresAt: Date | string; token?: string }
}

// Jugador de la cuenta, compartido entre islas: el de este club (members.userId) y el EA ID
// vinculado aunque no juegue aquí (la vinculación es global, una cuenta = un jugador)
const _myMember = ref<IClubMember | null>(null)
const _myPlayerId = ref<string | null>(null)
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

    const user = computed<User | null>(() => session.value?.user ?? null)
    const isLoggedIn = computed(() => !!user.value)
    const isAdmin = computed(() => user.value?.role === UserRole.admin)

    const myMember = computed(() => _myMember.value)
    /** EA ID vinculado a la cuenta (juegue o no en este club) */
    const myPlayerId = computed(() => _myPlayerId.value)
    /** Ya se sabe si la cuenta tiene jugador ("null" puede ser "sin vincular" o "cargando") */
    const myMemberLoaded = computed(() => _myMemberLoaded.value)

    async function loadMyMember(force = false) {
        if (!isLoggedIn.value) { _myMember.value = null; _myPlayerId.value = null; return null }
        if (_myMemberLoaded.value && !force) return _myMember.value
        try {
            // Una sola petición: EA ID vinculado y, si juega aquí, su miembro de este club
            const identity = await tpcsApi.members.getMyIdentity()
            _myPlayerId.value = identity?.playerId ?? null
            _myMember.value = identity && "member" in identity
                ? identity.member ?? null
                : await tpcsApi.members.getMine() // api antiguo sin `member`
        } catch (e) {
            // api sin /members/me/identity: lo de siempre
            console.warn("[useAuth] identity unavailable", e)
            _myMember.value = await tpcsApi.members.getMine().catch(() => null)
            _myPlayerId.value = _myMember.value?.playerId ?? null
        }
        _myMemberLoaded.value = true
        return _myMember.value
    }

    /** Lleva al login de accounts; al terminar se vuelve a `returnTo` (por defecto, esta misma página) */
    function login(returnTo?: string) {
        window.location.href = accountsLoginUrl(returnTo)
    }

    async function logout() {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => window.location.reload()
            }
        })
    }

    return {
        user,
        session,
        isLoggedIn,
        isAdmin,
        isPending,
        myMember,
        myPlayerId,
        myMemberLoaded,
        loadMyMember,
        login,
        logout,
        error: sessionState.value?.error,
    }
}
