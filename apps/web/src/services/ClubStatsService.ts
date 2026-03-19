import { ref, type Ref } from "vue";
import ClubStats from "@models/ClubStats";
import FetchService from "@services/FetchService";
export default class ClubStatsService extends FetchService {

    constructor() {
        super()
        this.data = ref<ClubStats>(undefined)
    }

    getData(): Ref<ClubStats> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/club"
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200 && json.status == 200) {
                let parsed: ClubStats = new ClubStats(json.response);
                this.data.value = parsed;
            } else this.error.value = response.statusText
        } catch (error) {
            console.log(error)
            this.error.value = error
        } finally {
            this.isloading.value = false;
        }
    }
}
