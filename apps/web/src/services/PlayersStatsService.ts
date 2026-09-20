import FetchService from "@services/FetchService"
import PlayerStatsEntity from "@/model/PlayerStatsEntity"
import { tpcsApi } from "@/lib/api"

type StatsByType = { official: PlayerStatsEntity[]; friendly: PlayerStatsEntity[] }

/** Stats de todos los jugadores, un doc por jugador y posición, separadas en oficial / amistoso */
export default class PlayersStatsService extends FetchService<StatsByType> {
    constructor() {
        super({ official: [], friendly: [] })
    }

    protected async load() {
        const { official, friendly } = await tpcsApi.members.getAllStats()
        return {
            official: official.map((s) => new PlayerStatsEntity(s)),
            friendly: friendly.map((s) => new PlayerStatsEntity(s))
        }
    }
}
