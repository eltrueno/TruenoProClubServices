import FetchService from "@services/FetchService"
import AchievementDefinitionEntity from "@/model/AchievementDefinitionEntity"
import { tpcsApi } from "@/lib/api"

export default class AchievementDefService extends FetchService<AchievementDefinitionEntity[]> {
    constructor() {
        super([])
    }

    protected async load() {
        return (await tpcsApi.achievements.getDefinitions()).map((d) => new AchievementDefinitionEntity(d))
    }
}
