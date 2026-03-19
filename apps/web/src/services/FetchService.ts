import { computed, type Ref, ref } from "vue";
export default abstract class FetchService {
    protected data: Ref<any>
    public status: Ref<number>
    protected error: Ref<string>
    public isloading: Ref<boolean>

    constructor() {
        this.isloading = ref<boolean>(true)
        this.status = ref<number>(101)
        this.error = ref<string>("")
    }

    abstract getData(): Ref<any>

    getStatus(): Ref<number> {
        return this.status
    }

    getError(): Ref<string> {
        return this.error
    }

    getHasError(): Ref<boolean> {
        return computed(() => this.status.value !== 200)
    }

    abstract fetch(): Promise<void>
}