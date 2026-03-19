import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import AchievementDefinitionEntity from "@/model/AchievementDefinitionEntity";
export default class AchievementDefService extends FetchService {

    constructor() {
        super()
        this.data = ref<Array<AchievementDefinitionEntity>>(undefined)
    }

    getData(): Ref<Array<AchievementDefinitionEntity>> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/achievements"
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                let parsed: Array<AchievementDefinitionEntity> = []
                for (var achievement in json.response) {
                    var parsedAchievement = new AchievementDefinitionEntity(json.response[achievement])
                    parsed.push(parsedAchievement)
                }
                this.data.value = parsed;
            } else this.error.value = response.statusText;
        } catch (error) {
            console.log(error)
            this.error.value = error
        } finally {
            this.isloading.value = false;
        }
    }
}