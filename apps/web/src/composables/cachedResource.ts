import { computed, ref, type Ref } from "vue"
import { ApiError } from "@/lib/api"

export interface CachedResource<T> {
    data: Ref<T>
    loading: Ref<boolean>
    /** HTTP status de la última carga (101 = aún no cargado) */
    status: Ref<number>
    error: Ref<string>
    hasError: Ref<boolean>
    loaded: Ref<boolean>
    /** Carga una vez y comparte; `force` vuelve a pedir */
    load: (force?: boolean) => Promise<void>
}

/**
 * Recurso remoto con caché de módulo: la primera isla que lo pide dispara el fetch y
 * las demás reutilizan la misma promesa / datos (también entre navegaciones con ClientRouter).
 */
export function createCachedResource<T>(initial: T, loader: () => Promise<T>): CachedResource<T> {
    const data = ref(initial) as Ref<T>
    const loading = ref(false)
    const status = ref(101)
    const error = ref("")
    const loaded = ref(false)
    let pending: Promise<void> | null = null

    const load = async (force = false) => {
        if (loaded.value && !force) return
        if (pending) return pending
        loading.value = true
        pending = loader()
            .then((value) => {
                data.value = value
                status.value = 200
                error.value = ""
                loaded.value = true
            })
            .catch((e) => {
                if (e instanceof ApiError) {
                    status.value = e.httpStatus || 503
                    error.value = e.code
                } else {
                    status.value = 500
                    error.value = e instanceof Error ? e.message : String(e)
                }
                console.error("[cachedResource]", e)
            })
            .finally(() => {
                loading.value = false
                pending = null
            })
        return pending
    }

    const hasError = computed(() => !loading.value && status.value !== 101 && status.value !== 200)

    return { data, loading, status, error, hasError, loaded, load }
}

/** Caché de recursos parametrizados (p. ej. un partido por id) */
export function createCachedResourceMap<T>(initial: T, loader: (key: string) => Promise<T>) {
    const cache = new Map<string, CachedResource<T>>()
    return (key: string): CachedResource<T> => {
        let r = cache.get(key)
        if (!r) {
            r = createCachedResource(initial, () => loader(key))
            cache.set(key, r)
        }
        return r
    }
}
