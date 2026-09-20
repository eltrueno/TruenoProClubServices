import FetchService from "@services/FetchService"
import type { ITOTW } from "@trueno-proclub-services/shared"
import { tpcsApi } from "@/lib/api"

/** Una semana concreta (número o ISO "2026-13") o, sin argumento, la última */
export default class TotwService extends FetchService<ITOTW | undefined> {
    constructor(private week?: number | string) {
        super(undefined)
    }

    protected async load() {
        const totw = this.week ? await tpcsApi.totw.getByWeek(String(this.week)) : await tpcsApi.totw.getLatest()
        return totw
    }
}
