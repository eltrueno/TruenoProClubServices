import FetchService from "@services/FetchService"
import ClubStats from "@models/ClubStats"
import { ApiError, tpcsApi } from "@/lib/api"

export default class ClubStatsService extends FetchService<ClubStats | undefined> {
    constructor() {
        super(undefined)
    }

    protected async load() {
        const club = await tpcsApi.club()
        // El api responde { status: 400 } cuando EA no contesta y no hay caché: lo tratamos como "no disponible"
        // Puede venir solo la info (name/regionId) si EA falló al dar las stats: para la web eso es "no disponible"
        if (!club || club.stats?.gamesPlayed === undefined) throw new ApiError("CLUB_UNAVAILABLE", "Club data unavailable", 503)
        return new ClubStats(club)
    }
}
