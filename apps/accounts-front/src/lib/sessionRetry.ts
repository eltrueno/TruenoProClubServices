import { effectScope, ref, watch, type Ref } from "vue"

/**
 * Reintentos de `get-session` cuando falla.
 *
 * A ratos, Cloudflare corta la petición al auth con un 403 sin cabeceras CORS (lo ve el
 * navegador como "CORS") y a los pocos segundos o minutos vuelve a dejar pasar. Sin esto,
 * un solo fallo dejaba la página en "El servicio de cuentas no responde" hasta recargar.
 * Con esto se reintenta solo, esperando cada vez un poco más, y mientras tanto la página
 * sigue en "Comprobando sesión". Solo si fallan todos los intentos se da por caído.
 */

/** Esperas entre intentos (ms): ~30 s en total */
export const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000]

interface SessionStateLike {
    error?: unknown
    refetch?: () => unknown
}

export interface SessionRetry {
    /** true mientras quedan intentos pendientes tras un fallo */
    retrying: Ref<boolean>
    /** true cuando han fallado todos los intentos */
    gaveUp: Ref<boolean>
    stop: () => void
}

export function watchSessionWithRetry(
    state: Ref<SessionStateLike | null | undefined>,
    delays: number[] = RETRY_DELAYS
): SessionRetry {
    const retrying = ref(false)
    const gaveUp = ref(false)
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    // Ámbito propio: el watcher no muere con el componente que lo creó
    const scope = effectScope(true)
    scope.run(() => {
        watch(
            () => state.value?.error,
            (error) => {
                if (!error) {
                    // Respuesta buena (o todavía ninguna): se reinicia la cuenta
                    attempt = 0
                    retrying.value = false
                    gaveUp.value = false
                    if (timer) clearTimeout(timer)
                    return
                }
                if (attempt >= delays.length) {
                    retrying.value = false
                    gaveUp.value = true
                    return
                }
                retrying.value = true
                if (timer) clearTimeout(timer)
                const delay = delays[attempt]
                attempt++
                timer = setTimeout(() => { state.value?.refetch?.() }, delay)
            },
            { immediate: true }
        )
    })

    return {
        retrying,
        gaveUp,
        stop: () => {
            if (timer) clearTimeout(timer)
            scope.stop()
        },
    }
}
