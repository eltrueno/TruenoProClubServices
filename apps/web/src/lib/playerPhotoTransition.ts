/**
 * Foto del jugador que "vuela" de la plantilla a su ficha (View Transitions del ClientRouter).
 *
 * La ficha se pinta en cliente después de cargar los datos, así que en el momento del cambio de
 * página todavía no existe y la transición no tendría con qué emparejar la foto. Lo que sí existe
 * es el esqueleto estático (fallback del island): justo antes del cambio se rellena su hueco de
 * foto (`data-vt-photo`) con la foto de la tarjeta pulsada y el mismo view-transition-name.
 * Después, el esqueleto del island la recoge (`playerPhotoFor`) para que no desaparezca mientras
 * cargan los datos, y al final la ficha real pinta la suya en ese mismo hueco.
 *
 * El island puede montarse en mitad de la transición (con su código ya en caché, desde la segunda
 * visita) y al montarse sustituye el esqueleto estático: si la foto que vuela estuviera enganchada
 * a ese hueco, se quedaría sin destino y el vuelo se cortaría (se veía "acelerado"). Por eso, tras
 * el cambio de HTML y antes de que el navegador capture la página nueva (`astro:after-swap`), la
 * foto que vuela pasa a una copia del hueco colocada encima, fuera del island, que se quita al
 * terminar la transición; debajo ya está la misma foto en el mismo sitio.
 */

declare global {
    interface Window {
        __tpcsPlayerPhoto?: { id: string; src: string }
    }
}

const nameFor = (playerId: string) => `player-photo-${playerId}`

/** Foto pasada desde la página anterior para este jugador, si la hay */
export function playerPhotoFor(playerId: string | null): string | null {
    if (typeof window === "undefined" || !playerId) return null
    const handoff = window.__tpcsPlayerPhoto
    return handoff?.id === playerId ? handoff.src : null
}

let enabled = false
// Transición en curso hacia una ficha: nombre de la foto y fin de la animación
let pending: { name: string; finished: Promise<void> } | null = null

export function enablePlayerPhotoTransition() {
    if (enabled || typeof document === "undefined") return
    enabled = true

    document.addEventListener("astro:before-swap", (event) => {
        const to = event.to
        if (to.pathname.replace(/\.html$/, "").replace(/\/+$/, "") !== "/jugador") return
        const playerId = to.searchParams.get("id")
        if (!playerId) return

        // La foto con ese nombre en la página que se deja (tarjeta de la plantilla)
        const name = nameFor(playerId)
        const from = [...document.querySelectorAll<HTMLElement>("[style*='player-photo-']")].find((el) => el.style.viewTransitionName === name)
        const fromImg = from instanceof HTMLImageElement ? from : from?.querySelector("img")
        const src = fromImg?.currentSrc || fromImg?.src
        if (!src) return

        const slot = event.newDocument.querySelector<HTMLElement>("[data-vt-photo]")
        const img = slot?.querySelector("img")
        if (!slot || !img) return

        slot.style.viewTransitionName = name
        // Clase para darle al vuelo su propia duración en CSS (::view-transition-group(.player-photo))
        slot.style.setProperty("view-transition-class", "player-photo")
        slot.classList.remove("skeleton", "skeletondark")
        img.src = src
        img.hidden = false
        window.__tpcsPlayerPhoto = { id: playerId, src }
        pending = { name, finished: event.viewTransition.finished }
    })

    // Ya con el HTML nuevo puesto (y antes de capturarlo): la foto que vuela pasa a una copia del hueco
    // fuera del island, para que montarlo a mitad de transición no la deje sin destino
    document.addEventListener("astro:after-swap", () => {
        const current = pending
        pending = null
        if (!current) return
        const slot = document.querySelector<HTMLElement>("[data-vt-photo]")
        if (!slot || slot.style.viewTransitionName !== current.name) return

        const r = slot.getBoundingClientRect()
        const overlay = slot.cloneNode(true) as HTMLElement
        overlay.removeAttribute("data-vt-photo")
        Object.assign(overlay.style, {
            position: "absolute",
            top: `${r.top + window.scrollY}px`,
            left: `${r.left + window.scrollX}px`,
            width: `${r.width}px`,
            height: `${r.height}px`,
            margin: "0",
            zIndex: "40",
            pointerEvents: "none"
        })
        slot.style.viewTransitionName = ""
        slot.style.removeProperty("view-transition-class")
        document.body.appendChild(overlay)
        current.finished.finally(() => overlay.remove())
    })
}
