import FetchService from "@services/FetchService"
import ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { tpcsApi } from "@/lib/api"

/** Partidos en los que aparece un jugador (incluye los de 0 segundos; filtrarlos es cosa de la vista) */
export default class ClubMatchByPlayerService extends FetchService<ClubMatchEntity[]> {
    constructor(private playerId: string, private limit?: number) {
        super([])
    }

    protected async load() {
        return (await tpcsApi.matches.getByPlayer(this.playerId, this.limit)).map((m) => new ClubMatchEntity(m))
    }
}
