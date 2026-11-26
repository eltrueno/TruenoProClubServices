import { onBeforeUnmount, ref, watch, type Ref } from "vue"

/**
 * Segunda barra pegada bajo la de pestañas de la ficha (los controles de Estadísticas, el "vs" del
 * Comparador). Mientras se ve, la de pestañas no redondea su borde de abajo ni lleva sombra: las dos
 * parecen una sola lámina. Estado de módulo: lo pone la pestaña y lo lee PlayerDetail.
 */
export const subBarActive = ref(false)

/** La pestaña avisa de cuándo su barra está pegada (y lo quita al irse) */
export function useStickySubBar(active: Ref<boolean>) {
    watch(active, (v) => { subBarActive.value = v }, { immediate: true })
    onBeforeUnmount(() => { subBarActive.value = false })
}
