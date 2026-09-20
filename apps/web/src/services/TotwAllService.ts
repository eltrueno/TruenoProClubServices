import FetchService from "@services/FetchService"
import TotwEntity from "@/model/totw/TotwEntity"
import { tpcsApi } from "@/lib/api"

export default class TotwAllService extends FetchService<TotwEntity[]> {
    constructor() {
        super([])
    }

    protected async load() {
        return (await tpcsApi.totw.getAll()).map((t) => new TotwEntity(t))
    }
}
