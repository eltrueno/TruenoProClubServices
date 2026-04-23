import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import PlayerProfileEntity from "@/model/PlayerProfileEntity";
export default class PlayerProfileService extends FetchService {

    private playerName: string

    constructor(playerName: string) {
        super()
        this.playerName = playerName
        this.data = ref<PlayerProfileEntity | undefined>(undefined)
    }

    getData(): Ref<PlayerProfileEntity | undefined> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/members/" + this.playerName
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                // Safety check: if response is indexed by playername, extract it
                let responseData = json.response
                if (responseData && !responseData.member && Object.keys(responseData).length > 0) {
                    responseData = responseData[Object.keys(responseData)[0]]
                }

                if (responseData) {
                    const { member, stats, achievements, totw } = responseData
                    const playerProfile = new PlayerProfileEntity(member, stats, achievements, totw)
                    this.data.value = playerProfile
                } else {
                    this.error.value = "Formato de respuesta inválido"
                }
            } else this.error.value = response.statusText
        } catch (error) {
            this.error.value = error
        } finally {
            this.isloading.value = false
        }
    }
}