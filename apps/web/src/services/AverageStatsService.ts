import FetchService from "@services/FetchService"
import AverageStatsEntity from "@/model/AverageStatsEntity"
import { tpcsApi } from "@/lib/api"

export default class AverageStatsService extends FetchService<AverageStatsEntity[]> {
    constructor() {
        super([])
    }

    protected async load() {
        return (await tpcsApi.averages.getAll()).map((a) => new AverageStatsEntity(a))
    }
}
