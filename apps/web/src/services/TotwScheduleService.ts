import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
export default class TotwScheduleService extends FetchService {


    constructor() {
        super()
        this.data = ref<{ timezone: string, nextDate: string }>()
    }

    getData(): Ref<{ timezone: string, nextDate: string }> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/totw/schedule"
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                this.data.value = json.response;
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