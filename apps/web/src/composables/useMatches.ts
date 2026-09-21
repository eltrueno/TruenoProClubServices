import { computed } from "vue"
import ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { tpcsApi } from "@/lib/api"
import { createCachedResource, createCachedResourceMap, type CachedResource } from "./cachedResource"

const toEntities = (list: Awaited<ReturnType<typeof tpcsApi.matches.getAll>>) => list.map((m) => new ClubMatchEntity(m))

// Todos los partidos del club (lista de /partidos, últimos partidos del index…)
const all = createCachedResource<ClubMatchEntity[]>([], async () => toEntities(await tpcsApi.matches.getAll()))

const byId = createCachedResourceMap<ClubMatchEntity | undefined>(undefined, async (id) => new ClubMatchEntity(await tpcsApi.matches.getById(id)))

// Partidos de un jugador (incluye los de 0 segundos; filtrarlos es cosa de la vista)
const byPlayer = createCachedResourceMap<ClubMatchEntity[]>([], async (key) => {
    const [playerId, limit] = key.split("|")
    return toEntities(await tpcsApi.matches.getByPlayer(playerId, limit ? Number(limit) : undefined))
})

/**
 * Partidos con caché compartida entre islas y navegaciones.
 * - `matches` + `load()`: lista completa.
 * - `match(id)`: un partido; si la lista ya está cargada se resuelve de ahí sin ir al api.
 * - `playerMatches(playerId)`: partidos de un jugador.
 */
export function useMatches() {
    const match = (id: string | number): CachedResource<ClubMatchEntity | undefined> => {
        const key = String(id)
        const resource = byId(key)
        if (!resource.loaded.value && all.loaded.value) {
            const found = all.data.value.find((m) => String(m.matchId) === key)
            if (found) {
                resource.data.value = found
                resource.status.value = 200
                resource.loaded.value = true
            }
        }
        return resource
    }

    const playerMatches = (playerId: string, limit?: number) => byPlayer(`${playerId}|${limit ?? ""}`)

    const latest = computed(() => [...all.data.value].sort((a, b) => b.timestamp - a.timestamp))

    return {
        matches: all.data,
        latest,
        loading: all.loading,
        status: all.status,
        error: all.error,
        hasError: all.hasError,
        loaded: all.loaded,
        load: all.load,
        match,
        playerMatches
    }
}
