import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import AverageStatsEntity from "@/model/AverageStatsEntity";

export default class AverageStatsService extends FetchService {

    constructor() {
        super()
        this.data = ref<Array<AverageStatsEntity>>([])
    }

    getData(): Ref<Array<AverageStatsEntity>> {
        return this.data
    }

    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/playeraverages"
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                this.data.value = new AverageStatsEntity(json.response)
            } else try {
                this.error.value = json.status.message
            } catch (e) {
                this.error.value = response.statusText
            }
        } catch (error) {
            this.error.value = error
        } finally {
            this.isloading.value = false
        }
    }
}