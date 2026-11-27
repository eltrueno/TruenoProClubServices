/**
 * El menú de arriba (nav.navbar) va pegado arriba y, en móvil y tablet, se esconde al bajar y vuelve
 * al subir (Navbar.astro pone `data-nav-hidden` en <html>). Las barras pegadas debajo (pestañas de las
 * fichas, filtros de plantilla y partidos) usan en CSS `--nav-top`: el alto del menú, o 0 si está
 * escondido. Estas funciones son lo mismo para los cálculos en JS.
 */

/** Hasta dónde se esconde el menú al bajar (por debajo de lg: ahí la pantalla es corta y cuenta cada px) */
export const NAV_HIDE_MQ = "(max-width: 1023.98px)"

export const navHeight = (): number => document.querySelector<HTMLElement>("nav.navbar")?.offsetHeight ?? 64

export const navHidden = (): boolean => document.documentElement.hasAttribute("data-nav-hidden")

/** Lo que tapa ahora el menú por arriba (0 si está escondido) */
export const navTop = (): number => (navHidden() ? 0 : navHeight())

/**
 * Lo que tapará el menú al llegar a `y` con un scroll programado: bajando, en móvil, se esconde; subiendo
 * vuelve. Para calcular a dónde ir sin que quede un hueco (o algo tapado) al terminar.
 */
export const navTopFor = (y: number): number => {
    if (y > scrollY + 4 && matchMedia(NAV_HIDE_MQ).matches) return 0
    if (y < scrollY - 4) return navHeight()
    return navTop()
}
