import { computed } from "vue"
import type { PlayerPosition } from "@trueno-proclub-services/shared"
import PlayerStatsEntity from "@/model/PlayerStatsEntity"
import { tpcsApi } from "@/lib/api"
import { createCachedResource } from "./cachedResource"

export type StatsByType = { official: PlayerStatsEntity[]; friendly: PlayerStatsEntity[] }

// Stats de todos los jugadores (un doc por jugador y posición), oficial / amistoso
const resource = createCachedResource<StatsByType>({ official: [], friendly: [] }, async () => {
    const { official, friendly } = await tpcsApi.members.getAllStats()
    return {
        official: official.map((s) => new PlayerStatsEntity(s)),
        friendly: friendly.map((s) => new PlayerStatsEntity(s))
    }
})

// Posiciones jugadas por jugador (oficiales + amistosos), la más jugada primero
const positions = computed(() => {
    const games = new Map<string, Record<string, number>>()
    for (const s of [...resource.data.value.official, ...resource.data.value.friendly]) {
        if (!s.playerId) continue
        const byPos = games.get(s.playerId) ?? {}
        byPos[s.position] = (byPos[s.position] ?? 0) + s.gamesPlayed
        games.set(s.playerId, byPos)
    }
    const result = new Map<string, PlayerPosition[]>()
    for (const [playerId, byPos] of games) {
        result.set(playerId, Object.entries(byPos).sort((a, b) => b[1] - a[1]).map(([p]) => p) as PlayerPosition[])
    }
    return result
})

/** Stats de jugadores con caché compartida; `positionsOf(id)` para el picker y filtros */
export function usePlayerStats() {
    const positionsOf = (playerId: string): PlayerPosition[] => positions.value.get(playerId) ?? []
    return {
        stats: resource.data,
        loading: resource.loading,
        status: resource.status,
        error: resource.error,
        hasError: resource.hasError,
        loaded: resource.loaded,
        load: resource.load,
        positions,
        positionsOf
    }
}
