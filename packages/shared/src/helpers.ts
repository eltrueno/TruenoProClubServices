/** Utilidades puras compartidas por api y worker. */

/** Número finito y > 0, si no undefined. Para no pisar datos buenos con "0"/"" de EA. */
export const positiveNumberOrUndefined = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : undefined
}

/** String no vacío, si no undefined. */
export const nonEmptyStringOrUndefined = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined
    const s = value.trim()
    return s.length > 0 ? s : undefined
}

/** Elimina las claves con valor undefined (para construir `$set` sin pisar campos). */
export const compactObject = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>

/** Número finito (0 incluido), si no undefined. Para campos donde 0 es válido (p. ej. proPos = portero). */
export const finiteNumberOrUndefined = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
}

/**
 * Un jugador que aparece en un partido con 0 segundos (no llegó a entrar) se
 * guarda en el partido para poder verlo, pero NO cuenta para sus stats,
 * medias, logros ni TOTW. Mismo criterio en worker y web.
 */
export const countsForPlayerStats = (player: { secondsPlayed?: number | null }): boolean =>
    Number(player?.secondsPlayed) > 0
