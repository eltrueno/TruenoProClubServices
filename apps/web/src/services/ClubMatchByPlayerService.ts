import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import ClubMatchEntity from "@/model/match/ClubMatchEntity";
export default class ClubMatchService extends FetchService {

    private playerName: string

    constructor(playerName: string) {
        super()
        this.playerName = playerName
        this.data = ref<ClubMatchEntity[]>(undefined)
    }

    getData(): Ref<ClubMatchEntity[]> {
        return this.data;
    }

    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/matches/player/" + this.playerName
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                let parsed: Array<ClubMatchEntity> = []
                for (var match in json.response) {
                    var parsedMatch = new ClubMatchEntity(json.response[match])
                    parsed.push(parsedMatch)
                }
                this.data.value = parsed;
            } else this.error.value = json.status.message ?? response.statusText
        } catch (error) {
            this.error.value = error
        } finally {
            this.isloading.value = false;
        }
    }
}