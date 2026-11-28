/**
 * Lado de un tooltip de DaisyUI (.tooltip) según dónde esté en la pantalla: arriba por defecto, pero a
 * la derecha si el elemento está pegado al borde izquierdo y a la izquierda si lo está al derecho. Así,
 * en el móvil, un tooltip centrado no se sale por un lado. Se llama al entrar (ratón, foco o toque).
 */
const SIDES = ["tooltip-top", "tooltip-left", "tooltip-right"] as const

export function placeTooltip(e: Event, room = 150): void {
    const el = (e.currentTarget ?? e.target) as HTMLElement | null
    if (!el) return
    const r = el.getBoundingClientRect()
    const side = r.left < room ? "tooltip-right" : innerWidth - r.right < room ? "tooltip-left" : "tooltip-top"
    el.classList.remove(...SIDES)
    el.classList.add(side)
}
