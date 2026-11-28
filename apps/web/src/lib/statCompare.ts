/**
 * Comparar stats tal y como se ven. Quién gana, el empate y la diferencia se sacan de los valores ya
 * redondeados a los decimales con los que se escriben: así nunca gana uno con los dos mostrando
 * "0,15", ni sale un "−0,0" en rojo. Y las tasas pequeñas (goles o rojas por partido, porcentajes de
 * un dígito) llevan algún decimal más, para que dos valores distintos no se vean iguales.
 */

export const roundTo = (v: number, d: number): number => {
    const f = 10 ** d
    return Math.round((Number.isFinite(v) ? v : 0) * f) / f
}

/** a − b con los dos ya redondeados a `d` decimales (0 si se ven iguales) */
export const shownDiff = (a: number, b: number, d: number): number => roundTo(roundTo(a, d) - roundTo(b, d), d)

/** Quién gana tal y como se ve: "a", "b" o null si se ven iguales (empate) */
export const shownWinner = (a: number, b: number, d: number, lowerBetter = false): "a" | "b" | null => {
    const diff = shownDiff(a, b, d)
    if (diff === 0) return null
    return (diff > 0) !== lowerBetter ? "a" : "b"
}

/**
 * Decimales para una tasa: `base`, o más si los valores son pequeños (por debajo de 1, al menos 2;
 * por debajo de 0,1, 3). Para porcentajes (`pct`), 0 o 1 si los dos quedan por debajo de 10 %.
 */
export function smartDecimals(values: number[], base: number, pct = false): number {
    const top = Math.max(0, ...values.map((v) => Math.abs(Number.isFinite(v) ? v : 0)))
    if (pct) return top > 0 && top < 10 ? Math.max(base, 1) : base
    if (top > 0 && top < 0.1) return Math.max(base, 3)
    if (top > 0 && top < 1) return Math.max(base, 2)
    return base
}

/** "+0,4" / "−1" / "±0" de una diferencia ya redondeada */
export const signedText = (diff: number, d: number): string =>
    `${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${Math.abs(diff).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })}`
