import FetchService from "@services/FetchService"
import type { ITOTW } from "@trueno-proclub-services/shared"
import { tpcsApi } from "@/lib/api"

export default class TotwAllService extends FetchService<ITOTW[]> {
    constructor() {
        super([])
    }

    protected async load() {
        return tpcsApi.totw.getAll()
    }
}
