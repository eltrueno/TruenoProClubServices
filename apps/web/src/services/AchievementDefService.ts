import FetchService from "@services/FetchService"
import type { IAchievementDefinition } from "@trueno-proclub-services/shared"
import { tpcsApi } from "@/lib/api"

export default class AchievementDefService extends FetchService<IAchievementDefinition[]> {
    constructor() {
        super([])
    }

    protected async load() {
        return tpcsApi.achievements.getDefinitions()
    }
}
