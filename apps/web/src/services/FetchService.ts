import { computed, type Ref, ref } from "vue"
import { ApiError } from "@/lib/api"

/**
 * Estado reactivo de una carga de datos (loading / status / error / data).
 * Las subclases solo definen `load()`; el resto (errores, estados) es común.
 */
export default abstract class FetchService<T = any> {
    protected data: Ref<T>
    public status: Ref<number>
    protected error: Ref<string>
    public isloading: Ref<boolean>

    constructor(initial: T) {
        this.data = ref(initial) as Ref<T>
        this.isloading = ref<boolean>(true)
        this.status = ref<number>(101)
        this.error = ref<string>("")
    }

    getData(): Ref<T> {
        return this.data
    }

    getStatus(): Ref<number> {
        return this.status
    }

    getError(): Ref<string> {
        return this.error
    }

    getHasError(): Ref<boolean> {
        return computed(() => this.status.value !== 200)
    }

    /** Llamada al api + transformación al modelo de la web */
    protected abstract load(): Promise<T>

    async fetch(): Promise<void> {
        this.isloading.value = true
        try {
            this.data.value = await this.load()
            this.status.value = 200
            this.error.value = ""
        } catch (e) {
            if (e instanceof ApiError) {
                this.status.value = e.httpStatus || 503
                this.error.value = e.code
            } else {
                this.status.value = 500
                this.error.value = e instanceof Error ? e.message : String(e)
            }
            console.error(`[${this.constructor.name}]`, e)
        } finally {
            this.isloading.value = false
        }
    }
}
