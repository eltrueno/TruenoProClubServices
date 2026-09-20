import FetchService from "@services/FetchService"
import PlayerProfileEntity from "@/model/PlayerProfileEntity"
import { tpcsApi } from "@/lib/api"

export default class PlayerProfileService extends FetchService<PlayerProfileEntity | undefined> {
    constructor(private playerId: string) {
        super(undefined)
    }

    protected async load() {
        const { member, stats, achievements, totw } = await tpcsApi.members.getProfile(this.playerId)
        return new PlayerProfileEntity(member, stats, achievements, totw)
    }
}
