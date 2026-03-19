import { ref, type Ref } from "vue";
import FetchService from "@services/FetchService";
import ClubMemberEntity from "@/model/ClubMemberEntity";
export default class ClubMembersService extends FetchService {

    constructor() {
        super()
        this.data = ref<Array<ClubMemberEntity>>(undefined)
    }

    getData(): Ref<Array<ClubMemberEntity>> {
        return this.data;
    }


    async fetch(): Promise<void> {
        try {
            const url = "https://api.casemurocity.org/members"
            const response = await fetch(url)
            const json = await response.json()
            this.status.value = response.status

            if (this.status.value == 200) {
                let parsed: Array<ClubMemberEntity> = []
                for (var member in json.response) {
                    var parsedMember = new ClubMemberEntity(json.response[member])
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