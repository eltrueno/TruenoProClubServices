import { detectPenalties } from "@trueno-proclub-services/eafcapi"
import type { IMatch, MatchResult } from "@trueno-proclub-services/shared"

/**
 * Partidos guardados como "a penaltis" con la detección antigua, que no miraba si el partido había
 * acabado en empate: dos clubes con goles de más (p. ej. un gol en propia cada uno) pasaban por tanda.
 * Se vuelve a pasar la detección actual sobre lo guardado: el marcador guardado era el agregado de los
 * jugadores y `penaltiesScore` lo que sobraba de `clubs.goals`. Devuelve el `$set`/`$unset` para
 * arreglarlo, o null si está bien.
 */
export const penaltyPatch = (m: IMatch): { $set: Record<string, unknown>; $unset?: Record<string, ""> } | null => {
    if (!m.winnerByPen) return null
    const L = m.localClub, A = m.awayClub
    const aggL = Number(L.matchStats.goals) || 0, aggA = Number(A.matchStats.goals) || 0
    const penL = Number(L.penaltiesScore) || 0, penA = Number(A.penaltiesScore) || 0

    // Lo que habría venido de EA (la prórroga ya se comprobó al guardarlo)
    const raw = {
        clubs: { l: { goals: String(aggL + penL) }, a: { goals: String(aggA + penA) } },
        aggregate: { l: { goals: aggL }, a: { goals: aggA } },
    } as never
    const det = detectPenalties(raw, "l", "a", false)

    const ours = m.localTeam === false ? "a" : "l"
    const theirs = ours === "l" ? "a" : "l"
    const resultOf = (us: number, them: number): MatchResult => (us > them ? "win" : us < them ? "loose" : "tie")

    if (!det.hasPenalties) {
        // No hubo tanda: el marcador bueno es el de EA (agregado + lo que sobraba)
        const goals = { l: aggL + penL, a: aggA + penA }
        return {
            $set: {
                winnerByPen: false,
                result: resultOf(goals[ours], goals[theirs]),
                "localClub.matchStats.goals": goals.l,
                "awayClub.matchStats.goals": goals.a,
            },
            $unset: { "localClub.penaltiesScore": "", "awayClub.penaltiesScore": "" },
        }
    }

    // Tanda de verdad, pero con goles en propia que el agregado no contaba: se corrige marcador y tanda
    const real = det.realScores!, pens = det.scores!
    if (real.l === aggL && real.a === aggA && pens.l === penL && pens.a === penA) return null
    return {
        $set: {
            result: resultOf(pens[ours], pens[theirs]),
            "localClub.matchStats.goals": real.l,
            "awayClub.matchStats.goals": real.a,
            "localClub.penaltiesScore": pens.l,
            "awayClub.penaltiesScore": pens.a,
        },
    }
}
