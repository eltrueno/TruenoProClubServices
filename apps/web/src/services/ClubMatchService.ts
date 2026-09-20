import FetchService from "@services/FetchService"
import ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { tpcsApi } from "@/lib/api"

export default class ClubMatchService extends FetchService<ClubMatchEntity | undefined> {
    constructor(private matchId: number | string) {
        super(undefined)
    }

    protected async load() {
        return new ClubMatchEntity(await tpcsApi.matches.getById(this.matchId))
    }
}
