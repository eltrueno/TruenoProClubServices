import { IClubMatches, IMatchClubPlayer } from '../model/club'

/**
 * Helpers puros sobre la respuesta cruda de `clubs/matches`.
 * No dependen de nada del proyecto: solo interpretan lo que EA devuelve.
 */

/** Segundos de juego a partir de los cuales consideramos que hubo prórroga (120 min). */
export const EXTRA_TIME_SECONDS = 7000

export interface IMatchPlayerEntry {
	/** personaId de EA: la clave del objeto `players[clubId]`. Es el identificador estable del jugador. */
	playerId: string
	player: IMatchClubPlayer
}

/** Jugadores de un club en un partido, con su id de EA (la clave del objeto). */
export const getMatchPlayers = (match: IClubMatches, clubId: string | number): IMatchPlayerEntry[] => {
	const players = match.players?.[String(clubId)]
	if (!players) return []
	return Object.entries(players).map(([playerId, player]) => ({ playerId, player }))
}

/** "107:1,11:1,111:39" → { "107": 1, "11": 1, "111": 39 } */
export const parseMatchEvents = (raw: string | undefined | null): Record<string, number> => {
	const out: Record<string, number> = {}
	if (!raw) return out
	for (const pair of raw.split(',')) {
		const [code, count] = pair.split(':')
		if (!code) continue
		const n = Number(count)
		if (Number.isFinite(n)) out[code.trim()] = n
	}
	return out
}

/** Ids de los dos clubes del partido, con el nuestro primero. */
export const getMatchClubIds = (match: IClubMatches, ourClubId: string | number): { ourId: string, opponentId: string } => {
	const ourId = String(ourClubId)
	const ids = Object.keys(match.clubs)
	const opponentId = ids.find((id) => id !== ourId) ?? ids[1] ?? ids[0]
	return { ourId, opponentId }
}

/**
 * Marcador forzado por abandono: EA le da 3-0 a quien se queda, así que `clubs.goals`
 * queda en 3-0 y no coincide con el agregado de goles de los jugadores.
 */
const hasForcedDnfScore = (match: IClubMatches, clubIds: string[]): boolean => {
	const forcedResult = clubIds.some((id) => Number(match.clubs[id]?.goals) === 3)
		&& clubIds.some((id) => Number(match.clubs[id]?.goals) === 0)

	const aggregateMismatches = clubIds.some((id) => Number(match.clubs[id]?.goals) !== Number(match.aggregate?.[id]?.goals))

	return forcedResult && aggregateMismatches
}

/**
 * DNF real: EA marca `winnerByDnf`, fuerza el marcador a 3-0 y el agregado
 * de goles de los jugadores no coincide con `clubs.goals`. Las tres a la vez
 * solo ocurren cuando un equipo abandona.
 */
export const detectDnf = (match: IClubMatches, clubIds: string[]): boolean => {
	const anyDnfFlag = clubIds.some((id) => match.clubs[id]?.winnerByDnf === '1')
	if (!anyDnfFlag) return false
	return hasForcedDnfScore(match, clubIds)
}

/** Por debajo de esto (80') el partido no llegó al final: los completos van de 90' a 94' (o 120'). */
export const FULL_TIME_MIN_SECONDS = 80 * 60

/** Lo más que jugó alguien en el partido (de cualquiera de los dos equipos), en segundos. */
export const getMaxSecondsPlayed = (match: IClubMatches): number => {
	let max = 0
	for (const clubPlayers of Object.values(match.players ?? {})) {
		for (const p of Object.values(clubPlayers)) {
			const s = Number(p.secondsPlayed)
			if (Number.isFinite(s) && s > max) max = s
		}
	}
	return max
}

/**
 * Abandono en un amistoso. EA no marca `winnerByDnf` en amistosos, pero sí hace lo demás: el
 * que se va pierde 3-0 (marcador forzado que no cuadra con los goles de los jugadores). Como sin
 * la marca un 3-0 con goles en propia se le parecería, se exige además que el partido se
 * cortara antes del final (nadie llegó al minuto 80).
 */
export const detectFriendlyDnf = (match: IClubMatches, clubIds: string[]): boolean =>
	getMaxSecondsPlayed(match) < FULL_TIME_MIN_SECONDS && hasForcedDnfScore(match, clubIds)

/** Algún jugador del partido superó el umbral de prórroga. */
export const playedExtraTime = (match: IClubMatches, threshold: number = EXTRA_TIME_SECONDS): boolean => {
	for (const clubPlayers of Object.values(match.players ?? {})) {
		for (const p of Object.values(clubPlayers)) {
			if (Number(p.secondsPlayed) >= threshold) return true
		}
	}
	return false
}

export interface IPenaltiesInfo {
	hasPenalties: boolean
	/** goles de la tanda de cada club (clubs.goals − aggregate.goals) */
	scores?: Record<string, number>
	/** marcador real (empate) de cada club, contando los goles en propia que no están en el agregado */
	realScores?: Record<string, number>
}

/**
 * Tanda de penaltis: EA suma los penaltis a `clubs.goals` pero no se los
 * atribuye a ningún jugador, así que `aggregate.goals` se queda con el marcador
 * real. Un gol en propia solo infla un club; una tanda infla los dos. Y una
 * tanda solo puede darse tras prórroga, así que exigimos también eso.
 *
 * Pero los goles en propia también inflan `clubs.goals` (solo al club que se beneficia), así que el
 * sobrante de cada club es tanda + goles en propia a su favor. Para ir a penaltis el partido tuvo que
 * acabar en empate: los goles en propia mínimos que lo igualan son la diferencia de agregados, a
 * favor del que va por detrás. Lo que queda es la tanda, que tiene que tener goles en los dos lados
 * y un ganador; si no sale así, no hubo tanda y el marcador bueno es `clubs.goals`.
 */
export const detectPenalties = (match: IClubMatches, clubId: string, opponentClubId: string, requireExtraTime = true): IPenaltiesInfo => {
	const agg = (id: string) => Number(match.aggregate?.[id]?.goals ?? 0)
	const diff = (id: string) => Number(match.clubs[id]?.goals ?? 0) - agg(id)
	if (!(diff(clubId) > 0 && diff(opponentClubId) > 0) || (requireExtraTime && !playedExtraTime(match))) return { hasPenalties: false }

	// Goles en propia que igualan el marcador (a favor del que va por detrás en el agregado)
	const ownGoals = (id: string, other: string) => Math.max(0, agg(other) - agg(id))
	const pens = (id: string, other: string) => diff(id) - ownGoals(id, other)
	const ours = pens(clubId, opponentClubId)
	const theirs = pens(opponentClubId, clubId)
	if (ours <= 0 || theirs <= 0 || ours === theirs) return { hasPenalties: false }

	const real = Math.max(agg(clubId), agg(opponentClubId))
	return { hasPenalties: true, scores: { [clubId]: ours, [opponentClubId]: theirs }, realScores: { [clubId]: real, [opponentClubId]: real } }
}

/**
 * Marcador real de un club. Normalmente `clubs.goals` (incluye goles en propia
 * del rival). Si hubo DNF o penaltis ese campo está contaminado (3-0 forzado o
 * goles de la tanda) y el marcador real es el agregado de los jugadores.
 */
export const getClubScore = (match: IClubMatches, clubId: string, tainted: boolean): number => {
	const fromAggregate = Number(match.aggregate?.[clubId]?.goals ?? 0)
	const fromClub = Number(match.clubs[clubId]?.goals ?? 0)
	return tainted ? fromAggregate : fromClub
}
