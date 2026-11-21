/**
 * Paginación de listas en cliente (sin Vue ni DOM, para poder probarlo: test/pagination.test.ts).
 * La usa components/Paginator.vue para los botones y quien pagina una lista para cortarla.
 */

/** Número de páginas (al menos 1) */
export const pageCount = (total: number, size: number) => Math.max(1, Math.ceil(total / Math.max(1, size)))

/** Ajusta una página al rango válido (empieza en 1) */
export const clampPage = (page: number, pages: number) => Math.min(Math.max(1, Math.floor(page) || 1), Math.max(1, pages))

/** La página `page` de una lista, con la página ya ajustada, el total de páginas y el desplazamiento
 *  (útil para numerar: el primero de la página 2 de 20 en 20 es el 21) */
export function paginate<T>(list: T[], page: number, size: number): { items: T[]; page: number; pages: number; offset: number } {
    const pages = pageCount(list.length, size)
    const p = clampPage(page, pages)
    const offset = (p - 1) * size
    return { items: list.slice(offset, offset + size), page: p, pages, offset }
}

export type PageItem = number | "…"

/**
 * Los botones de página: siempre la primera y la última, la actual y `siblings` a cada lado, y "…"
 * donde se salta. Si caben todas sin saltos (pocas páginas), salen todas. El número de botones no
 * cambia al moverse (no bailan): 1 … 4 5 6 … 12 / 1 2 3 4 5 … 12 / 1 … 8 9 10 11 12
 */
export function pageItems(page: number, pages: number, siblings = 1): PageItem[] {
    const slots = siblings * 2 + 5 // primera, última, actual, vecinas y dos huecos
    if (pages <= slots) return Array.from({ length: pages }, (_, i) => i + 1)
    const p = clampPage(page, pages)
    const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
    const edge = slots - 2 // botones seguidos cuando la actual está cerca de un extremo
    if (p <= edge - siblings) return [...range(1, edge), "…", pages]
    if (p >= pages - edge + siblings + 1) return [1, "…", ...range(pages - edge + 1, pages)]
    return [1, "…", ...range(p - siblings, p + siblings), "…", pages]
}
