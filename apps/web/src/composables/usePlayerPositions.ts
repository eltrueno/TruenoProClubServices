import { ref } from "vue"
import type { PlayerPosition } from "@trueno-proclub-services/shared"
import { tpcsApi } from "@/lib/api"

// Posiciones jugadas por cada jugador (oficiales + amistosos), ordenadas por partidos.
// Se cargan una vez y se comparten entre islas (picker de jugadores en varias páginas).
const _positions = ref<Map<string, PlayerPosition[]>>(new Map())
let _loading: Promise<void> | null = null

export function usePlayerPositions() {
    const load = () => {
        if (!_loading) {
            _loading = tpcsApi.members.getAllStats()
                .then(({ official, friendly }) => {
                    const games = new Map<string, Record<string, number>>()
                    for (const s of [...official, ...friendly]) {
                        const byPos = games.get(s.playerId) ?? {}
                        byPos[s.position] = (byPos[s.position] ?? 0) + s.gamesPlayed
                        games.set(s.playerId, byPos)
                    }
                    const result = new Map<string, PlayerPosition[]>()
                    for (const [playerId, byPos] of games) {
                        result.set(playerId, (Object.entries(byPos).sort((a, b) => b[1] - a[1]).map(([p]) => p)) as PlayerPosition[])
                    }
                    _positions.value = result
                })
                .catch((e) => { console.warn("[usePlayerPositions] stats unavailable", e); _loading = null })
        }
        return _loading
    }

    const positionsOf = (playerId: string): PlayerPosition[] => _positions.value.get(playerId) ?? []

    return { positions: _positions, positionsOf, load }
}
