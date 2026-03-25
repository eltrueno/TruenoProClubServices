import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import TotwEntity from "@/model/totw/TotwEntity";
export default class TotwAllService extends FetchService {

    private week?: number | string

    constructor(week?: number | string) {
        super()
        this.data = ref<TotwEntity>()
        this.week = week
    }

    getData(): Ref<TotwEntity> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/totw/" + (this.week ? this.week : "latest")
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                this.data.value = new TotwEntity(json.response);
            } else try {
                this.error.value = json.status.message;
            } catch (e) {
                this.error.value = response.statusText;
            }
        } catch (error) {
            this.error.value = error
        } finally {
            this.isloading.value = false;
        }
    }
}