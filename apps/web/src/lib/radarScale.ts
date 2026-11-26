/**
 * "Zoom" de los radares (Estadísticas y Comparador). Con la escala completa cada eje va de 0 a su
 * máximo razonable (10 en la nota, 100 en los porcentajes…) y las diferencias pequeñas apenas se
 * ven. Con la ajustada, cada eje llega hasta un poco más que el mayor valor que se pinta en él, así
 * que se nota quién gana en cada eje (a cambio, la forma ya no se compara entre ejes).
 */
export type RadarScale = "full" | "fit"

/**
 * Tope de cada eje. `series`: los valores de cada conjunto (un array por conjunto, uno por eje);
 * `fullMax`: el tope de la escala completa de cada eje.
 */
export function radarAxisMax(series: number[][], fullMax: number[], scale: RadarScale): number[] {
    if (scale === "full") return fullMax
    return fullMax.map((full, i) => {
        const top = Math.max(0, ...series.map((s) => (Number.isFinite(s[i]) ? s[i] : 0)))
        // Un 15 % por encima del mayor, sin pasar del tope real ni quedarse en casi nada (todo a 0)
        return Math.min(full, Math.max(top * 1.15, full * 0.1))
    })
}

/** Valor de 0 a 100 dentro de su eje */
export const radarNorm = (v: number, max: number) => Math.max(0, Math.min(100, ((Number.isFinite(v) ? v : 0) / (max || 1)) * 100))
