import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import PlayerProfileEntity from "@/model/PlayerProfileEntity";
export default class PlayerProfileService extends FetchService {

    private playerName: string

    constructor(playerName: string) {
        super()
        this.playerName = playerName
        this.data = ref<PlayerProfileEntity>(undefined)
    }

    getData(): Ref<PlayerProfileEntity> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/members/" + this.playerName
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                let parsed: Array<PlayerProfileEntity> = []
                for (var lmember in json.response) {
                    const { member, stats, achievements } = json.response[lmember]
                    var parsedMember = new PlayerProfileEntity(member, stats, achievements)
                    parsed.push(parsedMember)
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