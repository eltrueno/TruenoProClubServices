import FetchService from "@services/FetchService"
import ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { tpcsApi } from "@/lib/api"

export default class ClubMatchesService extends FetchService<ClubMatchEntity[]> {
    constructor() {
        super([])
    }

    protected async load() {
        return (await tpcsApi.matches.getAll()).map((m) => new ClubMatchEntity(m))
    }
}
