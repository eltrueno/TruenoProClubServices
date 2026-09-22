import ClubStats from "@models/ClubStats"
import { ApiError, tpcsApi } from "@/lib/api"
import { createCachedResource } from "./cachedResource"

// Info y stats del club (EA). Caché compartida entre islas del landing.
const resource = createCachedResource<ClubStats | undefined>(undefined, async () => {
    const club = await tpcsApi.club()
    // El api responde sin stats cuando EA no contesta y no hay caché: para la web eso es "no disponible"
    if (!club || club.stats?.gamesPlayed === undefined) throw new ApiError("CLUB_UNAVAILABLE", "Club data unavailable", 503)
    return new ClubStats(club)
})

export function useClub() {
    return {
        club: resource.data,
        loading: resource.loading,
        status: resource.status,
        error: resource.error,
        hasError: resource.hasError,
        loaded: resource.loaded,
        load: resource.load
    }
}
