import type ClubMatchEntity from "../model/match/ClubMatchEntity"

/**
 * Vista calendario de /partidos: una rejilla de días al estilo de la de contribuciones de GitHub
 * (columnas = semanas de lunes a domingo, filas = días). Cada día se pinta por su resultado (más
 * victorias que derrotas, verde; al revés, rojo; igualado, gris) y con más intensidad cuantos más
 * partidos hubo. Sin Vue ni DOM (test/matchCalendar.test.ts).
 */

type Match = Pick<ClubMatchEntity, "matchId" | "timestamp" | "result" | "counts">

/** Cómo fue el día: ganó más que perdió, al revés, igualado, o solo nulos */
export type DayTone = "win" | "loss" | "even" | "void"

export interface CalendarDay<T> {
    /** aaaa-mm-dd (hora local) */
    key: string
    date: Date
    /** sus partidos, del primero al último del día */
    items: T[]
    wins: number
    ties: number
    losses: number
    /** 0 sin partidos; 1-4 según cuántos (4 = 4 o más) */
    level: 0 | 1 | 2 | 3 | 4
    tone: DayTone | null
}

export interface CalendarMonth { label: string; /** columna (semana) donde empieza */ col: number }

export interface MatchCalendar<T> {
    /** semanas de lunes a domingo; cada una con sus 7 días */
    weeks: CalendarDay<T>[][]
    months: CalendarMonth[]
    /** días con partidos, del más reciente al más antiguo */
    activeDays: CalendarDay<T>[]
}

const pad = (n: number) => String(n).padStart(2, "0")
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
/** Lunes de la semana de `d` */
const mondayOf = (d: Date) => {
    const s = startOfDay(d)
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
    return s
}
const MONTH_SHORT = new Intl.DateTimeFormat("es-ES", { month: "short" })

/** Tono de un día por su balance (los nulos no cuentan, como en el resto de la web) */
export function dayTone(r: { wins: number; ties: number; losses: number }, total: number): DayTone | null {
    if (!total) return null
    if (r.wins + r.ties + r.losses === 0) return "void"
    return r.wins > r.losses ? "win" : r.losses > r.wins ? "loss" : "even"
}

/**
 * Calendario de una lista de partidos (en cualquier orden): de la semana del primero a la del último,
 * o hasta `until` (p. ej. hoy) si es más tarde. Sin partidos, null.
 */
export function buildCalendar<T extends Match>(list: T[], until?: Date): MatchCalendar<T> | null {
    if (!list.length) return null
    const byDay = new Map<string, T[]>()
    let first = Infinity, last = -Infinity
    for (const m of list) {
        const d = new Date(m.timestamp * 1000)
        const k = dayKey(d)
        const l = byDay.get(k)
        if (l) l.push(m)
        else byDay.set(k, [m])
        first = Math.min(first, m.timestamp)
        last = Math.max(last, m.timestamp)
    }
    const start = mondayOf(new Date(first * 1000))
    const lastDate = new Date(last * 1000)
    const end = mondayOf(until && until > lastDate ? until : lastDate)
    end.setDate(end.getDate() + 6)

    const weeks: CalendarDay<T>[][] = []
    const months: CalendarMonth[] = []
    for (const cur = new Date(start); cur <= end; ) {
        const week: CalendarDay<T>[] = []
        for (let i = 0; i < 7; i++) {
            const date = new Date(cur)
            const items = (byDay.get(dayKey(date)) ?? []).slice().sort((a, b) => a.timestamp - b.timestamp)
            const r = { wins: 0, ties: 0, losses: 0 }
            for (const m of items) {
                if (!m.counts) continue
                if (m.result === "win") r.wins++
                else if (m.result === "loose") r.losses++
                else r.ties++
            }
            const level = Math.min(items.length, 4) as CalendarDay<T>["level"]
            week.push({ key: dayKey(date), date, items, ...r, level, tone: dayTone(r, items.length) })
            // Etiqueta del mes en la semana donde cae su día 1 (y en la primera columna)
            if (date.getDate() === 1 || (weeks.length === 0 && i === 0)) {
                const label = MONTH_SHORT.format(date).replace(".", "")
                if (!months.length || months[months.length - 1].col !== weeks.length) months.push({ label, col: weeks.length })
                else months[months.length - 1].label = label
            }
            cur.setDate(cur.getDate() + 1)
        }
        weeks.push(week)
    }
    // Si el primer mes y el segundo quedan pegados (el 1 cae en la segunda columna), solo el segundo
    if (months.length > 1 && months[1].col - months[0].col < 2) months.shift()
    const activeDays = weeks.flat().filter((d) => d.items.length).reverse()
    return { weeks, months, activeDays }
}
