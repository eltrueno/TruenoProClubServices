import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import TotwEntity from "@/model/totw/TotwEntity";
export default class TotwAllService extends FetchService {

    constructor() {
        super()
        this.data = ref<Array<TotwEntity>>(undefined)
    }

    getData(): Ref<Array<TotwEntity>> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/totw"
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                let parsed: Array<TotwEntity> = []
                for (var totw in json.response) {
                    var parsedTotw = new TotwEntity(json.response[totw])
                    parsed.push(parsedTotw)
                }
                this.data.value = parsed;
            } else try {
                this.error.value = json.status.message;
            } catch (e) {
                this.error.value = response.statusText;
            }
        } catch (error) {
            console.log(error)
            this.error.value = error
        } finally {
            this.isloading.value = false;
        }
    }
}