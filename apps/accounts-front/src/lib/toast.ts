import { ref } from "vue"

/**
 * Avisos flotantes comunes a toda la web ("Guardado", errores…). Uno solo para toda la
 * página, aunque haya varias islas de Vue: el estado vive en el módulo.
 *
 * Son un complemento: lo que dicen tiene que verse también en la propia tarjeta (p. ej. el
 * "Guardado" junto al botón). Los de éxito se van solos; los de error se quedan hasta que se
 * cierran. Si el foco está dentro de un aviso, no se cierra solo hasta que salga.
 */
export interface Toast {
    id: number
    kind: "success" | "error" | "info"
    text: string
}

export const toasts = ref<Toast[]>([])
const focused = new Set<number>()
let nextId = 1

export function toast(text: string, kind: Toast["kind"] = "success") {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-2), { id, kind, text }]
    if (kind !== "error") autoDismiss(id, 4000)
}

function autoDismiss(id: number, ms: number) {
    setTimeout(() => {
        // Con el foco dentro, se espera a que salga
        if (focused.has(id)) autoDismiss(id, 1500)
        else dismissToast(id)
    }, ms)
}

export function setToastFocus(id: number, inside: boolean) {
    if (inside) focused.add(id)
    else focused.delete(id)
}

export function dismissToast(id: number) {
    focused.delete(id)
    toasts.value = toasts.value.filter((t) => t.id !== id)
}
