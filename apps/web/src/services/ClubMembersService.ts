import FetchService from "@services/FetchService"
import ClubMemberEntity from "@/model/ClubMemberEntity"
import { tpcsApi } from "@/lib/api"

export default class ClubMembersService extends FetchService<ClubMemberEntity[]> {
    constructor() {
        super([])
    }

    protected async load() {
        return (await tpcsApi.members.getAll()).map((m) => new ClubMemberEntity(m))
    }
}
