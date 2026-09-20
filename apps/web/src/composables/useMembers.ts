import { computed, ref } from "vue"
import type { IClubMember } from "@trueno-proclub-services/shared"
import { tpcsApi } from "@/lib/api"
import { playerImage } from "@/lib/playerImage"

// Caché de módulo: la lista de miembros se pide una vez por página y la comparten todas las islas
const members = ref<IClubMember[]>([])
const loaded = ref(false)
let pending: Promise<void> | null = null

/**
 * Miembros del club indexados por playerId, para resolver foto / nombre actual
 * desde sitios que solo tienen el id (partidos, TOTW, logros).
 */
export function useMembers() {
    const byId = computed(() => new Map(members.value.map((m) => [m.playerId, m])))

    async function load(force = false) {
        if (loaded.value && !force) return
        if (pending) return pending
        pending = tpcsApi.members.getAll()
            .then((list) => { members.value = list; loaded.value = true })
            .catch((e) => console.error("[useMembers]", e))
            .finally(() => { pending = null })
        return pending
    }

    const memberFor = (playerId: string | undefined | null) => (playerId ? byId.value.get(playerId) : undefined)
    const imageFor = (playerId: string | undefined | null) => playerImage(memberFor(playerId))

    return { members, loaded, load, memberFor, imageFor }
}
