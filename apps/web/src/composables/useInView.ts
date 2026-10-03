import { onBeforeUnmount, onMounted, ref, type Ref } from "vue"

/**
 * `true` cuando el elemento entra en pantalla (una sola vez por defecto).
 * Para disparar animaciones que no pueden ir con CSS: contadores, gráficas…
 */
export function useInView(options: { threshold?: number; rootMargin?: string; once?: boolean } = {}) {
    const { threshold = 0.25, rootMargin = "0px 0px -10% 0px", once = true } = options
    const target: Ref<HTMLElement | null> = ref(null)
    const inView = ref(false)
    let observer: IntersectionObserver | null = null

    /** ¿El elemento ya está dentro de la ventana? (sin depender del observer) */
    const isOnScreen = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight)
    }

    onMounted(() => {
        if (!target.value) return
        // Sin IntersectionObserver (o SSR) se da por visible para no ocultar nada
        if (typeof IntersectionObserver === "undefined") { inView.value = true; return }
        // Si ya se ve al montar, no se espera al observer (en pestañas en segundo plano
        // o con el render pausado puede tardar en disparar y dejaría los contadores a 0)
        if (isOnScreen(target.value)) {
            inView.value = true
            if (once) return
        }
        observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        inView.value = true
                        if (once) observer?.disconnect()
                    } else if (!once) {
                        inView.value = false
                    }
                }
            },
            { threshold, rootMargin }
        )
        observer.observe(target.value)
    })

    onBeforeUnmount(() => observer?.disconnect())

    return { target, inView }
}
