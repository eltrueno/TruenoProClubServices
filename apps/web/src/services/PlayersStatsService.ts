import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import PlayerStatsEntity from "@/model/PlayerStatsEntity";
export default class PlayersStatsService extends FetchService {

    private type: 'official' | 'friendly' | 'all'

    constructor(type?: 'official' | 'friendly') {
        super()
        this.type = type ?? 'all'
        this.data = ref<Record<string, PlayerStatsEntity[]>>({});
    }

    getData(): Ref<Record<string, PlayerStatsEntity[]>> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/members/stats"

            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {

                for (const type in json.response) {

                    const parsed: PlayerStatsEntity[] = json.response[type].map(
                        (m: any) => new PlayerStatsEntity(m)
                    )

                    this.data.value[type] = parsed
                }

            } else {
                this.error.value = response.statusText
            }

        } catch (error) {
            console.log(error)
            this.error.value = error
        } finally {
            this.isloading.value = false
        }
    }


}