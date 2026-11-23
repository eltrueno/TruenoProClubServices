import type MatchPlayerEntity from "../model/match/MatchPlayerEntity"

/** Frase con gracia sobre el partido de un jugador (al azar entre las que encajan con sus números) */
export function playerPhrase(player: MatchPlayerEntity): string {

    const phrases: string[] = []

    // Disciplina
    if (player.redCards > 0) {
        phrases.push("❝ Se fue a la ducha antes de tiempo ❞")
        phrases.push("❝ El árbitro le enseñó el camino al vestuario ❞")
        phrases.push("❝ Partido corto... demasiado ❞")
    }

    // GOLES
    if (player.goals >= 5) {
        phrases.push("❝ Hoy era ilegal defenderle ❞")
        phrases.push("❝ Desató el caos en la defensa rival ❞")
    }

    if (player.goals >= 4) {
        phrases.push("❝ No tiene cartas pero... Poker ❞")
        phrases.push("❝ Hizo lo que quiso en el área ❞")
    }

    if (player.goals >= 3) {
        phrases.push("❝ Se llevó el balón a casa ❞")
        phrases.push("❝ Hat trick de manual ❞")
    }

    if (player.goals >= 2) {
        phrases.push("❝ Ha hecho un doblete ❞")
        phrases.push("❝ Dos zarpazos letales ❞")
    }

    if (player.goals === 1 && player.shots === 1) {
        phrases.push("❝ Un tiro, un gol. Cirujano ❞")
    }

    if (player.goals === 0 && player.shots >= 6) {
        phrases.push("❝ Tiró hasta las botas ❞")
        phrases.push("❝ Hoy disparó con los ojos cerrados ❞")
        phrases.push("❝ Disparó mucho a puerta... a la puerta de su casa ❞")
    }

    if (player.shots >= 10) {
        phrases.push("❝ Tenía permiso para tirar desde donde fuera ❞")
    }

    if (player.shotAccuracyPercent >= 90 && player.shots >= 3) {
        phrases.push("❝ Puntería de francotirador ❞")
    }

    if (player.shotAccuracyPercent <= 20 && player.shots >= 3) {
        phrases.push("❝ Chutó hasta desde su casa... para las stats ❞")
        phrases.push("❝ Hoy no veía la portería, quizás su monitor estaba apagado ❞")
    }

    // ASISTENCIAS
    if (player.assists >= 5) {
        phrases.push("❝ Repartiendo fútbol como si fuera Navidad ❞")
    }

    if (player.assists >= 4) {
        phrases.push("❝ En modo Kevin De Bruyne ❞")
    }

    if (player.assists >= 3) {
        phrases.push("❝ Hat trick de asistencias ❞")
        phrases.push("❝ Hoy jugó para los demás ❞")
    }

    if (player.assists >= 2) {
        phrases.push("❝ Doblete de asistencias ❞")
        phrases.push("❝ Generoso con el gol ❞")
    }

    if (player.assists >= 1 && player.goals === 0) {
        phrases.push("❝ Trabajo sucio que no sale en portada ❞")
    }

    // PASES
    if(player.position !== "goalkeeper"){
            if (player.passesMade >= 40) {
        phrases.push("❝ Se ha creído Xavi Hernández ❞")
    }

    if (player.passSuccessRate >= 99) {
        phrases.push("❝ No ha fallado ni un pase ❞")
    }

    if (player.passSuccessRate >= 95 && player.passesMade >= 20) {
        phrases.push("❝ Precisión quirúrgica ❞")
        phrases.push("❝ Director de orquesta ❞")
    }

    if (player.passSuccessRate >= 85) {
        phrases.push("❝ Más preciso que un reloj suizo ❞")
    }

    if (player.passSuccessRate <= 40 && player.passesMade >= 10) {
        phrases.push("❝ Hoy el balón quemaba ❞")
    }

    if (player.passSuccessRate <= 20) {
        phrases.push("❝ No ha dado ni 2 pases seguidos ❞")
        phrases.push("❝ Hoy jugó para el rival ❞")
        phrases.push("❝ Ha perdido más balones que móviles se 'pierden' en Barcelona ❞")
    }

    if(player.passesMade < 5){
        phrases.push("❝ Ni ha olido el balón ❞")
        phrases.push("❝ Ha tocado menos balón que el chat de case tetas ❞")
        phrases.push("❝ Supuestamente ha jugado, pero no lo parece ❞")
    }

        // DEFENSA
    if (player.tacklesMade >= 8) {
        phrases.push("❝ Robó más balones que un carterista ❞")
    }

    if (player.tacklesMade >= 6 && player.tackleSuccessRate >= 80) {
        phrases.push("❝ Muralla defensiva ❞")
    }

    if (player.tackleSuccessRate === 100 && player.tacklesMade >= 3) {
        phrases.push("❝ Entradas perfectas ❞")
    }

    if (player.tackleSuccessRate <= 20 && player.tacklesMade >= 3) {
        phrases.push("❝ Pegó como un leñador, sin apuntar ❞")
    }

    }




    // PORTERO
    if (player.position == "goalkeeper") {

        if (player.saves >= 10) {
            phrases.push("❝ Partido de superhéroe bajo palos ❞")
            phrases.push("❝ Sacó todo lo que le tiraron ❞")
        }

        if (player.saves >= 7) {
            phrases.push("❝ Hoy parecía un muro ❞")
            phrases.push("❝ Portería blindada ❞")
        }

        if (player.saves >= 5) {
            phrases.push("❝ Seguro bajo palos ❞")
            phrases.push("❝ Paradas de mucho mérito ❞")
        }

        if (player.saves >= 3 && player.goalsConceded === 0) {
            phrases.push("❝ Paradas clave para mantener la portería a cero ❞")
        }

        if (player.saves === 0 && player.goalsConceded === 0) {
            phrases.push("❝ Espectador de lujo ❞")
        }

        if (player.saves === 0 && player.goalsConceded >= 3) {
            phrases.push("❝ Hoy no era su día ❞")
        }

        if (player.goalsConceded >= 3) {
            phrases.push("❝ Difícil día para el portero ❞")
        }

          if (player.rating >= 9) {
            phrases.push("❝ Partido de superhéroe bajo palos ❞")
            phrases.push("❝ Imposible de superar ❞")
        } else if (player.rating >= 8) {
            phrases.push("❝ Hoy parecía un muro ❞")
            phrases.push("❝ Portería segura ❞")
        } else if (player.rating >= 7) {
            phrases.push("❝ Cumplió con solvencia ❞")
            phrases.push("❝ Seguro bajo palos ❞")
        } else if (player.rating >= 6) {
            phrases.push("❝ Partido correcto bajo palos ❞")
        } else {
            phrases.push("❝ Hoy no era su día ❞")
        }

    }

    // MVP
    if (player.manOfTheMatch) {
        phrases.push("❝ MVP del partido ❞")
        phrases.push("❝ El mejor sobre el campo ❞")
    }

    if (player.manOfTheMatch && player.rating >= 9) {
        phrases.push("❝ MVP indiscutible ❞")
    }

    // RATING
    if (player.rating >= 9.9) {
        phrases.push("❝ Partido perfecto ❞")
        phrases.push("❝ Exhibición absoluta ❞")
    }

    if (player.rating >= 8.5) {
        phrases.push("❝ Clase magistral, fútbol champagne ❞")
        phrases.push("❝ Partido de altos vuelos ❞")
    }

    if (player.rating <= 4) {
        phrases.push("❝ Partido para olvidar... ❞")
        phrases.push("❝ Mejor pasar página ❞")
    }

    // Jugo poco
    if (player.minutesPlayed < 20) {
        phrases.push("❝ Cameo rápido pero intenso ❞")
    }

    // fallback
    if (phrases.length === 0) {
        phrases.push("❝ Buen partido, sólido ❞")
    }

    return phrases[Math.floor(Math.random() * phrases.length)]
}
