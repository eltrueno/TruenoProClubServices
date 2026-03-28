import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import ClubMatchEntity from "@/model/match/ClubMatchEntity";
export default class ClubMatchService extends FetchService {

    private id: string | number

    constructor(id: string | number) {
        super()
        this.id = id
        this.data = ref<ClubMatchEntity>(undefined)
    }

    getData(): Ref<ClubMatchEntity> {
        return this.data;
    }

    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/matches/" + this.id
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                if (json.response[0]) {
                    var parsedMatch = new ClubMatchEntity(json.response[0])
                    this.data.value = parsedMatch;
                }
                else {
                    this.status.value = 404
                    this.error.value = "Match not found"
                }
            } else this.error.value = json.status.message ?? response.statusText
        } catch (error) {
            this.error.value = error
        } finally {
            this.isloading.value = false;
        }
    }
}