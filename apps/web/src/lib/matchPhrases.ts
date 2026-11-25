import type { MatchResult } from "@trueno-proclub-services/shared"
import type MatchPlayerEntity from "../model/match/MatchPlayerEntity"

/**
 * La frase con gracia del partido de un jugador.
 *
 * Cada regla que encaja con sus números propone frases con una puntuación (lo llamativo que es: un
 * póker puntúa más que un 85% de pases). Gana lo más llamativo: se elige entre las que están cerca de
 * la mejor, y no al azar en cada render sino con una semilla (partido + jugador), así que a cada
 * jugador le toca siempre la misma frase en ese partido. Mira también su equipo ese día (si fue el
 * que más pases dio, si ganaron, si se perdió con él jugando de 9…). Sin Vue ni DOM.
 */

export interface PhraseContext {
    /** Todos los de su equipo en ese partido (él incluido) */
    teammates: MatchPlayerEntity[]
    /** Resultado de su equipo */
    result: MatchResult
    goalsFor: number
    goalsAgainst: number
    /** Para que la frase no cambie entre renders: id del partido */
    seed: string | number
}

interface Candidate { text: string; score: number }

/** Hash pequeño y estable de un texto (FNV-1a) */
const hash = (s: string) => {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
    return h >>> 0
}

const rate = (ok: number, total: number) => (total > 0 ? (ok / total) * 100 : null)

export function playerPhrase(p: MatchPlayerEntity, ctx?: PhraseContext): string {
    const out: Candidate[] = []
    const add = (score: number, ...texts: string[]) => texts.forEach((text) => out.push({ text, score }))

    const team = ctx?.teammates ?? [p]
    const others = team.filter((x) => x.playerId !== p.playerId)
    const maxOf = (f: (x: MatchPlayerEntity) => number) => Math.max(0, ...others.map(f))
    const isTop = (f: (x: MatchPlayerEntity) => number) => f(p) > 0 && f(p) > maxOf(f)
    const teamTotal = (f: (x: MatchPlayerEntity) => number) => team.reduce((s, x) => s + f(x), 0)

    const gk = p.position === "goalkeeper"
    const passAcc = rate(p.passesSuccess, p.passesMade)
    const tackleAcc = rate(p.tacklesSuccess, p.tacklesMade)
    const mins = p.minutesPlayed
    const won = ctx?.result === "win", lost = ctx?.result === "loose"
    const goalsFor = ctx?.goalsFor ?? 0, goalsAgainst = ctx?.goalsAgainst ?? 0
    const teamRatingAvg = team.length ? teamTotal((x) => x.rating) / team.length : p.rating

    // ── Rojas ──
    if (p.redCards > 0) {
        add(70, "Se fue a la ducha antes de tiempo", "El árbitro le enseñó el camino al vestuario", "Partido corto... demasiado corto")
        if (lost) add(80, "Roja y derrota: la tarde redonda")
    }

    // ── Goles ──
    if (p.goals >= 5) add(100, `${p.goals} goles. Hoy era ilegal defenderle`, "Desató el caos en la defensa rival", "Que alguien llame a la policía, esto es un atraco")
    else if (p.goals === 4) add(95, "No tiene cartas pero... póker", "Hizo lo que quiso en el área", "Cuatro. Ni en el FIFA en principiante")
    else if (p.goals === 3) add(90, "Hat-trick de manual. El balón se va a su casa", "Se llevó el balón a casa", "Tres goles y la sensación de que pudieron ser más")
    else if (p.goals === 2) add(70, "Doblete, y a cenar", "Dos zarpazos letales", "Marcó dos y miró a la grada como si nada")
    else if (p.goals === 1) {
        if (p.shots === 1) add(65, "Un tiro, un gol. Cirujano", "Le sobró con una ocasión")
        else add(35, "Dejó su firma en el marcador", "Gol y a celebrarlo con calma")
        if (goalsFor === 1 && won) add(85, "Su gol valió una victoria", "1-0 con su gol: oro puro")
    }
    if (p.goals > 0 && goalsFor > 0 && p.goals === goalsFor && goalsFor >= 2) add(88, `Todos los goles del equipo llevan su nombre`, "Él solito contra el mundo")
    if (p.goals > 0 && lost) add(40, "Marcó, pero no bastó", "Su gol no sirvió para sumar")

    // ── Tiros ──
    if (p.goals === 0 && p.shots >= 6) add(60, `${p.shots} tiros y ni uno dentro`, "Tiró hasta las botas", "Disparó mucho a puerta... a la puerta de su casa", "Hoy no veía la portería, quizás tenía el monitor apagado")
    else if (p.shots >= 10) add(55, "Tenía permiso para tirar desde donde fuera", `${p.shots} tiros. El portero rival aún tiene pesadillas`)
    if (p.goals >= 2 && p.shots > 0 && p.goals / p.shots >= 0.75) add(75, "Puntería de francotirador", "Cada tiro, un susto")
    if (p.goals === 0 && p.shots >= 3 && p.shots < 6) add(30, "Lo intentó, pero la portería se movía", "Chutó para las stats")

    // ── Asistencias ──
    if (p.assists >= 4) add(92, "Repartiendo fútbol como si fuera Navidad", "En modo Kevin De Bruyne")
    else if (p.assists === 3) add(85, "Hat-trick de asistencias", "Hoy jugó para los demás", "Tres pases de gol. Los delanteros le deben una cena")
    else if (p.assists === 2) add(65, "Doblete de asistencias", "Generoso con el gol", "Puso dos caramelos")
    else if (p.assists === 1 && p.goals === 0) add(35, "Trabajo sucio que no sale en portada", "El pase de antes del gol, que nadie recuerda")
    if (p.goals >= 1 && p.assists >= 1) add(70 + p.goals * 5 + p.assists * 5, "Marcó y dio de marcar: partido completo", "Gol y asistencia. Lo hizo todo")

    // ── Pases (los de campo) ──
    if (!gk) {
        if (p.passesMade >= 40) add(60, "Se ha creído Xavi Hernández", `${p.passesMade} pases. El balón no quería separarse de él`)
        else if (isTop((x) => x.passesMade) && p.passesMade >= 20) add(45, "Todo pasaba por sus botas", "El metrónomo del equipo")
        if (passAcc !== null && p.passesMade >= 15 && passAcc >= 95) add(62, "No falló ni un pase (casi)", "Precisión quirúrgica", "Director de orquesta")
        else if (passAcc !== null && p.passesMade >= 20 && passAcc >= 88) add(30, "Más preciso que un reloj suizo")
        if (passAcc !== null && p.passesMade >= 10 && passAcc <= 50) add(50, "Hoy el balón quemaba", "Hoy jugó para el rival", "Ha perdido más balones que móviles se 'pierden' en Barcelona")
        if (p.passesMade < 5 && mins >= 45) add(55, "Ni ha olido el balón", "Ha tocado menos balón que el chat de case tetas", "Supuestamente ha jugado, pero no lo parece")

        // ── Defensa ──
        if (p.tacklesSuccess >= 8) add(65, "Robó más balones que un carterista", "Por su zona no pasaba ni el aire")
        else if (isTop((x) => x.tacklesSuccess) && p.tacklesSuccess >= 4) add(42, "El que más recuperó: el pulmón del equipo")
        if (tackleAcc !== null && p.tacklesMade >= 5 && tackleAcc >= 80) add(55, "Muralla defensiva", "Entraba y salía con el balón, siempre")
        if (tackleAcc !== null && p.tacklesMade >= 4 && tackleAcc <= 25) add(48, "Pegó como un leñador, sin apuntar", "Entró a todo... y a nada")
        if (p.position === "defender" && goalsAgainst === 0) add(58, "Portería a cero: la defensa firmó el partido", "Ni un gol encajado con él atrás")
        if (p.position === "defender" && goalsAgainst >= 4) add(52, "Hoy la defensa fue de mantequilla", "Por su banda entraban hasta los aficionados")
        if (p.position === "forward" && p.goals === 0 && p.shots <= 1 && mins >= 60) add(50, "Un 9 sin goles ni tiros: desaparecido", "Lo buscaron en el área y no estaba")
    }

    // ── Portero ──
    if (gk) {
        const faced = p.saves + p.goalsConceded
        if (p.saves >= 10) add(90, `${p.saves} paradas. Partido de superhéroe bajo palos`, "Sacó todo lo que le tiraron")
        else if (p.saves >= 7) add(70, "Hoy parecía un muro", "Portería blindada")
        else if (p.saves >= 4) add(45, "Seguro bajo palos", "Paradas de mucho mérito")
        if (goalsAgainst === 0 && p.saves >= 3) add(75, "Paradas clave para dejar la portería a cero", "Cerró la puerta con llave")
        else if (goalsAgainst === 0) add(50, "Portería a cero sin despeinarse", "Espectador de lujo")
        if (p.goalsConceded >= 5) add(70, "Le hicieron más goles que paradas hizo", "Difícil día para el portero", "Hoy recogió más balones de la red que el utillero")
        else if (p.goalsConceded >= 3 && p.saves <= 1) add(60, "Hoy no era su día")
        if (faced >= 6 && p.saves / faced >= 0.85) add(72, `Paró ${Math.round((p.saves / faced) * 100)}% de lo que le llegó`)
        if (p.reflexSaves >= 2) add(55, "Reflejos de gato")
        if (p.ballDiveSaves >= 3) add(55, "Voló más que un avión de Ryanair")
    }

    // ── MVP y nota ──
    if (p.manOfTheMatch) {
        add(p.rating >= 9 ? 82 : 60, "MVP del partido", "El mejor sobre el campo")
        if (lost) add(80, "MVP en una derrota: hizo lo que pudo")
        if (p.rating >= 9) add(84, "MVP indiscutible")
    }
    if (p.rating >= 9.8) add(98, "Partido perfecto", "Exhibición absoluta. Nota de videojuego")
    else if (p.rating >= 8.5) add(66, "Clase magistral, fútbol champagne", "Partido de altos vuelos")
    if (lost && p.rating >= 8) add(64, "Lo mejor de una tarde para olvidar", "Él cumplió; el resto, otra historia")
    if (won && goalsFor - goalsAgainst >= 4 && p.rating >= 7) add(40, "Goleada y a disfrutar")
    if (p.rating <= 4.5) add(75, "Partido para olvidar...", "Mejor pasar página", "Que no salga en el resumen")
    else if (p.rating < 6 && p.rating < teamRatingAvg - 1) add(50, "Por debajo del resto del equipo", "Hoy no le salió nada")

    // ── Cholismo (rojiblanco de corazón) ──
    // Ganar 1-0 o por la mínima sin encajar: autobús aparcado
    if (won && goalsAgainst === 0 && goalsFor === 1 && (gk || p.position === "defender")) add(86, "Aparcó el autobús y se llevó los tres puntos", "1-0 y a casa. El Cholo estaría orgulloso", "Cholismo puro: defender, sufrir y ganar")
    else if (won && goalsAgainst === 0 && (gk || p.position === "defender")) add(60, "Partido a partido... y a cero", "Bloque bajo, cero goles y a celebrar")
    if (!gk && p.tacklesSuccess >= 6 && tackleAcc !== null && tackleAcc >= 60) add(64, "Corrió como si jugara en el Metropolitano", "Intensidad de Cholo en la banda", "Cholismo en vena: a por cada balón")
    if (won && goalsFor - goalsAgainst === 1 && p.rating >= 7.5) add(50, "Partido a partido. Hoy tocaba sufrir y ganar")
    if (lost && goalsFor > 0 && goalsAgainst - goalsFor === 1 && p.rating >= 7) add(45, "Nunca dejes de creer... aunque hoy no llegara")
    if (p.goals >= 1 && won && goalsFor - goalsAgainst === 1 && p.position === "forward") add(68, "Gol a lo Niño Torres: el que vale partidos")
    if (gk && p.saves >= 6 && goalsAgainst <= 1) add(78, "Hoy era Oblak bajo palos", "Paradas a lo Oblak: con cara de no pasa nada")
    if (!gk && p.passesMade >= 35 && passAcc !== null && passAcc >= 85) add(58, "Manejó el partido como Koke en sus mejores tardes")
    if (p.goals >= 1 && p.assists >= 1 && p.position !== "defender") add(76, "Partido de Griezmann: marca, asiste y lo hace todo")

    // ── Minutos ──
    if (mins < 20) add(45, "Cameo rápido pero intenso", "Entró, vio y se fue")
    else if (mins >= 115) add(15, "120 minutos en las piernas")

    if (!out.length) add(1, "Buen partido, sólido", "Cumplió sin hacer ruido", "Hizo su trabajo")

    // Lo más llamativo (con un poco de margen para variar entre frases parecidas)
    const best = Math.max(...out.map((c) => c.score))
    const pool = out.filter((c) => c.score >= best * 0.85)
    const pick = pool[hash(`${ctx?.seed ?? ""}:${p.playerId}`) % pool.length]
    return pick.text
}

/** Lo que hace falta del partido para su frase (desde nuestro lado) */
export interface MatchPhraseInput {
    matchId: number
    result: MatchResult
    goalsFor: number
    goalsAgainst: number
    shotsFor: number
    shotsAgainst: number
    passesFor: number
    passesAgainst: number
    redsFor: number
    redsAgainst: number
    penalties?: { for: number; against: number } | null
    dnf: boolean
    extraTime: boolean
    voided: boolean
    rivalName: string
    /** el rival es el otro club de la comunidad */
    derby: boolean
}

/**
 * La frase del partido, con el mismo sistema que la de los jugadores: lo más llamativo gana y a cada
 * partido le toca siempre la misma.
 */
export function matchPhrase(m: MatchPhraseInput): string {
    const out: Candidate[] = []
    const add = (score: number, ...texts: string[]) => texts.forEach((text) => out.push({ text, score }))
    const { result, goalsFor: gf, goalsAgainst: ga } = m
    const won = result === "win", lost = result === "loose", tied = result === "tie"
    const diff = gf - ga
    const possession = m.passesFor + m.passesAgainst ? (m.passesFor / (m.passesFor + m.passesAgainst)) * 100 : 50

    if (m.voided) add(100, "Partido fantasma: se jugó, pero no cuenta", "Como si no hubiera pasado. Literalmente")
    if (m.dnf) add(95, won ? "El rival se desconectó. Victoria por incomparecencia" : "Se cayó la conexión y con ella el partido", won ? "Se fueron antes de tiempo. Tres puntos de regalo" : "Hoy perdió el router")

    // Penaltis y prórroga
    if (m.penalties) {
        if (won) add(92, "Sufrimiento hasta el último penalti, y premio", "Desde los once metros no se falla", "La lotería de los penaltis sonrió")
        else if (lost) add(92, "Se perdió en la lotería de los penaltis", "Tanto esfuerzo para caer desde los once metros")
    } else if (m.extraTime) add(70, won ? "Ganado en la prórroga, con el depósito en reserva" : lost ? "Hasta el 120 y sin premio" : "120 minutos y nadie quiso ceder")

    // Marcador
    if (won && diff >= 6) add(96, `${gf}-${ga}. Esto ya es abuso`, "Goleada histórica. Que alguien pare el partido", "Al rival le pasó un tren por encima")
    else if (won && diff >= 4) add(85, "Goleada y a casa", `Paseo: ${gf}-${ga}`, "Exhibición de principio a fin")
    else if (won && diff >= 2) add(55, "Victoria clara, sin sustos", "Trabajo bien hecho")
    else if (won && diff === 1) add(60, "Por la mínima, pero cuentan igual", "Sufriendo, como debe ser", "Partido a partido: hoy tocaba sufrir y ganar")
    if (won && ga === 0 && gf === 1) add(84, "1-0 y autobús aparcado. Cholismo puro", "Gol, candado y a casa")
    else if (won && ga === 0) add(62, "Victoria y portería a cero: partido redondo")
    if (won && ga >= 3) add(70, `Se ganó ${gf}-${ga}: ganar sí, defender ya otro día`, "Victoria loca: muchos goles y pocos nervios... o al revés")

    if (tied && gf === 0) add(65, "0-0: los porteros cobraron horas extra", "Mucho centro del campo y poca portería", "Empate a nada. Partido de ajedrez")
    else if (tied && gf >= 3) add(80, `${gf}-${ga}: un partido de locos`, "Empate de infarto, nadie defendió")
    else if (tied) add(45, "Reparto de puntos", "Ni para ti ni para mí")

    if (lost && diff <= -4) add(85, "Noche para olvidar", "Mejor no hablar de esto", "Hoy no salió nada. Nada de nada")
    else if (lost && diff === -1) add(55, "Se escapó por un gol", "Faltó un pelín para rascar algo", "Nunca dejes de creer... aunque hoy no llegara")
    else if (lost) add(45, "Hoy tocó perder", "Día gris, a por el siguiente")
    if (lost && gf >= 3) add(68, `Marcar ${gf} y perder: el fútbol es así de cruel`)

    // Cómo se jugó
    if (won && possession <= 40) add(66, "Sin balón, pero con colmillo: contragolpe y a casa", "Le dejamos el balón y les ganamos igual")
    if (lost && possession >= 62) add(62, "Mucho balón y poco premio", "Dominar no es ganar")
    if (possession >= 68) add(48, `${Math.round(possession)}% del balón. El rival corrió detrás de la pelota toda la tarde`)
    if (m.shotsFor >= 15 && gf <= 1) add(60, `${m.shotsFor} tiros para ${gf === 0 ? "nada" : "un gol"}. Hoy la portería era diminuta`)
    if (won && m.shotsAgainst >= m.shotsFor * 2 && m.shotsAgainst >= 8) add(64, "Nos tiraron de todo y aguantamos", "Se sufrió, pero se ganó")
    if (m.redsFor >= 2) add(66, "Se acabó jugando con menos gente que en un 5 contra 5")
    else if (m.redsFor === 1) add(40, lost ? "La roja lo cambió todo" : "Con uno menos y aun así")
    if (m.redsAgainst >= 1 && won) add(38, "El rival se quedó con menos y lo aprovechamos")

    // ── Cholismo (rojiblanco de corazón) ──
    if (won && diff === 1 && ga >= 1) add(64, "Partido a partido. Se sufrió, se ganó", "Sufrir es nuestra forma de ganar", "Si se cree y se trabaja, se puede")
    if (won && ga === 0 && possession <= 45) add(82, "Menos balón, cero goles encajados, tres puntos. Manual del Cholo", "Bloque bajo, contra y a casa. Simeone aprueba")
    if (won && m.shotsAgainst >= m.shotsFor && ga <= 1) add(58, "Defender como el Atleti: con los dientes apretados")
    if (lost && diff === -1 && gf >= 1) add(52, "Nunca dejes de creer: la próxima cae")
    if (tied && gf === 0 && m.shotsAgainst >= 8) add(70, "Un 0-0 de los que gustan en el Calderón")
    if (won && diff >= 4) add(70, "Goleada en modo Metropolitano en noche de Champions")
    if (lost && diff <= -3) add(50, "Coraje y corazón... hoy faltó lo otro")
    if (m.penalties && won) add(93, "Penaltis y victoria: sangre fría rojiblanca", "Desde los once metros, corazón y cabeza")
    if (m.penalties && lost) add(93, "Penaltis... ese trauma rojiblanco que nunca se va", "Se cayó en los penaltis. A levantarse, como siempre")

    if (m.derby) add(won ? 90 : lost ? 88 : 75, won ? "El derbi es nuestro" : lost ? "El derbi se fue al otro lado" : "Derbi igualado: nadie presume esta semana",
        won ? "Esta semana se presume en el grupo" : lost ? "Toca aguantar las bromas toda la semana" : "Tablas en el derbi")

    if (!out.length) add(1, "Partido sin historia", "Un partido más")
    const best = Math.max(...out.map((c) => c.score))
    const pool = out.filter((c) => c.score >= best * 0.85)
    return pool[hash(`match:${m.matchId}`) % pool.length].text
}
