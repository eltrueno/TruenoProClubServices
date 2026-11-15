/** Utilidades puras compartidas por api y worker. */
import { MIN_SECONDS_PLAYED } from "./constants.js"

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
 * Un jugador que juega menos de `MIN_SECONDS_PLAYED` (15') en un partido se guarda en el
 * partido para poder verlo, pero ese partido NO cuenta para sus stats, medias, logros ni
 * TOTW. Mismo criterio en worker y web.
 */
export const countsForPlayerStats = (player: { secondsPlayed?: number | null }): boolean =>
    Number(player?.secondsPlayed) >= MIN_SECONDS_PLAYED

type MatchLike = { localClub: { players: { secondsPlayed?: number | null }[] }, awayClub: { players: { secondsPlayed?: number | null }[] } }

/** Lo más que jugó alguien en el partido (de cualquiera de los dos equipos), en segundos */
export const maxSecondsPlayed = (match: MatchLike): number => {
    let max = 0
    for (const p of [...(match.localClub?.players ?? []), ...(match.awayClub?.players ?? [])]) {
        const s = Number(p?.secondsPlayed)
        if (Number.isFinite(s) && s > max) max = s
    }
    return max
}

/** Nadie de ninguno de los dos equipos llegó a `MIN_SECONDS_PLAYED`: el partido es nulo (si un admin no dice otra cosa) */
export const isShortMatch = (match: MatchLike): boolean => maxSecondsPlayed(match) < MIN_SECONDS_PLAYED

/** El partido cuenta para stats, logros, medias, TOTW y rachas (no es nulo) */
export const countsForStats = (match: { voided?: boolean | null }): boolean => !match?.voided

/**
 * EA devuelve los nombres (jugadores, pros, clubes) como UTF-8 leído como
 * latin1 ("Ã±" en vez de "ñ"). Se corrige en el worker al guardar; la web
 * nunca debe volver a aplicarlo. Si el texto ya es UTF-8 válido se deja igual.
 */
export const fixEaEncoding = (str: string | undefined | null): string => {
    if (!str) return ""
    // Si contiene caracteres fuera de latin1 ya no es mojibake
    if ([...str].some((c) => c.charCodeAt(0) > 255)) return str
    try {
        const bytes = Uint8Array.from([...str], (c) => c.charCodeAt(0))
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    } catch {
        return str
    }
}
