import { IMatchPlayer } from "@interfaces/matchPlayer.interface"
import MatchPlayerDTO from "./matchPlayer.dto"
import dotenv from "dotenv"
import { IMatch } from "srcinterfaces/match.interface";

dotenv.config()
const CLUBID: number = Number(process.env.CLUBID) || 290776;

export default class MatchDTO implements IMatch {
    matchId: number
    matchType: "league" | "playoff" | "friendly" = "league"
    timestamp: number
    result: "loose" | "tie" | "win"
    winnerByDnf: Boolean
    winnerByPen?: Boolean = false
    localTeam?: Boolean
    localClub: {
        id: number
        name: string
        matchStats: {
            goals: number,
            shots: number,
            passesMade: number,
            passesSuccess: number,
            redCards: number,
            tacklesMade: number,
            tackleSuccess: number,
        }
        players: IMatchPlayer[]
    }
    awayClub: {
        id: number
        name: string
        matchStats: {
            goals: number,
            shots: number,
            passesMade: number,
            passesSuccess: number,
            redCards: number,
            tacklesMade: number,
            tackleSuccess: number,
        }
        players: IMatchPlayer[]
    }

    constructor(rawdata?: any) {
        this.matchId = Number(rawdata.matchId)
        this.timestamp = rawdata.timestamp
        this.matchType = rawdata.matchType ?? "league"

        const ownClubID: string = CLUBID.toString()
        let opponentClubID: string = "";
        for (var c in rawdata.clubs) {
            if (c.toString() != ownClubID) opponentClubID = c.toString();
        }
        this.localTeam = (Object.keys(rawdata.clubs)[0].toString() === ownClubID)
        this.winnerByDnf = Boolean(Number(rawdata.clubs[Object.keys(rawdata.clubs)[0]].winnerByDnf)
            || Number(rawdata.clubs[Object.keys(rawdata.clubs)[1]].winnerByDnf))

        const ownBelow = Object.keys(rawdata.players[ownClubID]).filter(p => Number(rawdata.players[ownClubID][p].secondsPlayed) < 2000).length
        const opponentBelow = Object.keys(rawdata.players[opponentClubID]).filter(p => Number(rawdata.players[opponentClubID][p].secondsPlayed) < 2000).length

        const ownMajorityBelow = ownBelow / rawdata.players[ownClubID].length > 0.7
        const opponentMajorityBelow = opponentBelow / rawdata.players[opponentClubID].length > 0.7

        if ((ownMajorityBelow || opponentMajorityBelow) && this.matchType === "friendly") {
            this.winnerByDnf = true
        }

        const rawdataLocalClub = rawdata.clubs[this.localTeam ? ownClubID : opponentClubID]
        const rawdataAggregateLocal = rawdata.aggregate[this.localTeam ? ownClubID : opponentClubID]
        const rawdataAwayClub = rawdata.clubs[this.localTeam ? opponentClubID : ownClubID]
        const rawdataAggregateAway = rawdata.aggregate[this.localTeam ? opponentClubID : ownClubID]

        const goalsOwn = Number(rawdata.clubs[ownClubID].goals)
        const scoreOwn = Number(rawdata.clubs[ownClubID].score)
        const goalsOpponent = Number(rawdata.clubs[opponentClubID].goals)
        const scoreOpponent = Number(rawdata.clubs[opponentClubID].score)

        const aggregateGoalsOwn = Number(rawdata.aggregate[ownClubID].goals)
        const aggregateScoreOwn = Math.floor(rawdata.aggregate[ownClubID].SCORE)
        const aggregateGoalsOpponent = Number(rawdata.aggregate[opponentClubID].goals)
        const aggregateScoreOpponent = Math.floor(rawdata.aggregate[opponentClubID].SCORE)

        if (scoreOwn > scoreOpponent) {
            this.result = "win"
        } else if (scoreOwn < scoreOpponent) {
            this.result = "loose"
        } else {
            this.result = "tie"
        }

        /*if (scoreOwn > goalsOwn || goalsOpponent > scoreOpponent) {
            this.winnerByPen = true
        }*/


        // DNF en amistosos
        if (this.matchType === "friendly" || this.matchType === "playoff") {
            const MIN_SECONDS = 2400
            const EXTRA_TIME_SECONDS = 7000

            const ownPlayers = rawdata.players[ownClubID] || {}
            const opponentPlayers = rawdata.players[opponentClubID] || {}

            const isDNF = (players: any, minSecs: number) => {
                const list = Object.values(players)
                if (list.length === 0) return false
                const below = list.filter((p: any) => Number(p.secondsPlayed) < minSecs).length
                return (below / list.length) > 0.6
            }

            // DNF por jugadores con pocos segundos
            if (isDNF(ownPlayers, MIN_SECONDS) || isDNF(opponentPlayers, MIN_SECONDS)) {
                if (this.matchType === "friendly") this.winnerByDnf = true
                console.log("DNF")
            }

            const playedExtraTime = (players: any) => {
                const list = Object.values(players)
                if (list.length === 0) return false
                const above = list.filter((p: any) => Number(p.secondsPlayed) >= EXTRA_TIME_SECONDS).length
                return (above / list.length) > 0.5
            }

            // DNF por aggregate diferente a goles (lógica original)
            const reachedThreeGoals = goalsOwn === 3 || goalsOpponent === 3
            const aggregateDifferent = Number(rawdata.aggregate[ownClubID].goals) !== goalsOwn
                || Number(rawdata.aggregate[opponentClubID].goals) !== goalsOpponent

            if (!this.winnerByDnf && reachedThreeGoals && aggregateDifferent) {
                if (this.matchType == "friendly" && (isDNF(ownPlayers, 2880) || isDNF(opponentPlayers, 2880))) {
                    this.winnerByDnf = true
                }

            }


            if (playedExtraTime(ownPlayers) || playedExtraTime(opponentPlayers)) {
                this.winnerByPen = true
            }
        }

        const realGoalsOwn = this.winnerByPen
            ? Number(rawdata.aggregate[ownClubID].goals)
            : goalsOwn
        const realGoalsOpponent = this.winnerByPen
            ? Number(rawdata.aggregate[opponentClubID].goals)
            : goalsOpponent

        const rawdataLocalPlayers = rawdata.players[this.localTeam ? ownClubID : opponentClubID]
        let localClubPlayers: Array<IMatchPlayer> = []
        for (var rawdataPl in rawdataLocalPlayers) {
            var parsedPl = new MatchPlayerDTO(rawdataLocalPlayers[rawdataPl])
            localClubPlayers.push(parsedPl)
        }
        this.localClub = {
            id: Number(rawdataLocalClub.details.clubId),
            name: rawdataLocalClub.details.name,
            matchStats: {
                goals: rawdataAggregateLocal.goals,
                shots: rawdataAggregateLocal.shots,
                passesMade: rawdataAggregateLocal.passattempts,
                passesSuccess: rawdataAggregateLocal.passesmade,
                redCards: rawdataAggregateLocal.redcards,
                tacklesMade: rawdataAggregateLocal.tackleattempts,
                tackleSuccess: rawdataAggregateLocal.tacklesmade,
            },
            players: localClubPlayers
        }

        const rawdataAwayPlayers = rawdata.players[this.localTeam ? opponentClubID : ownClubID]
        let awayClubPlayers: Array<IMatchPlayer> = []
        for (var rawdataPl in rawdataAwayPlayers) {
            var parsedPl = new MatchPlayerDTO(rawdataAwayPlayers[rawdataPl])
            awayClubPlayers.push(parsedPl)
        }
        this.awayClub = {
            id: Number(rawdataAwayClub.details.clubId),
            name: rawdataAwayClub.details.name,
            matchStats: {
                goals: rawdataAggregateAway.goals,
                shots: rawdataAggregateAway.shots,
                passesMade: rawdataAggregateAway.passattempts,
                passesSuccess: rawdataAggregateAway.passesmade,
                redCards: rawdataAggregateAway.redcards,
                tacklesMade: rawdataAggregateAway.tackleattempts,
                tackleSuccess: rawdataAggregateAway.tacklesmade,
            },
            players: awayClubPlayers
        }
    }
}