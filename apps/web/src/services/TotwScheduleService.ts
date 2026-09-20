import FetchService from "@services/FetchService"
import { tpcsApi } from "@/lib/api"

type Schedule = { cron: string; timezone: string; nextDate: string | null }

export default class TotwScheduleService extends FetchService<Schedule | undefined> {
    constructor() {
        super(undefined)
    }

    protected async load() {
        return tpcsApi.totw.getSchedule()
    }
}
