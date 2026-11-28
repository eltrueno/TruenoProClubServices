import { onBeforeUnmount, onMounted, ref } from "vue"

/**
 * Un tooltip de DaisyUI que también abre su etiqueta: en las filas con barra (Estadísticas, la ficha
 * del jugador en el partido) el tooltip va en la barra, pero el nombre de la fila con su (i) también
 * lo abre. Con ratón, al pasar por encima; en el móvil, al tocar el nombre (y se cierra tocando fuera).
 * La barra lleva la clase `tooltip-open` cuando `openKey` es su clave.
 */
export function useLinkedTooltip() {
    const openKey = ref<string | null>(null)

    const label = (key: string) => ({
        onPointerenter: (e: PointerEvent) => { if (e.pointerType === "mouse") openKey.value = key },
        onPointerleave: (e: PointerEvent) => { if (e.pointerType === "mouse" && openKey.value === key) openKey.value = null },
        // Con ratón ya se abre al pasar por encima: el clic solo cuenta al tocar
        onClick: (e: MouseEvent) => {
            if ((e as PointerEvent).pointerType === "mouse") return
            openKey.value = openKey.value === key ? null : key
        },
        "data-tip-label": "",
    })

    // Un toque fuera de las etiquetas lo cierra
    const close = (e: PointerEvent) => {
        if (e.pointerType !== "mouse" && !(e.target as Element | null)?.closest?.("[data-tip-label]")) openKey.value = null
    }
    onMounted(() => addEventListener("pointerdown", close, { passive: true }))
    onBeforeUnmount(() => removeEventListener("pointerdown", close))

    return { openKey, label }
}
