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
        const aggregateScoreOwn = Math.floor(rawdata.aggregate[ownClubID].SCORE / 10)
        const aggregateGoalsOpponent = Number(rawdata.aggregate[opponentClubID].goals)
        const aggregateScoreOpponent = Math.floor(rawdata.aggregate[opponentClubID].SCORE / 10)

        if (scoreOwn > scoreOpponent) {
            this.result = "win"
        } else if (scoreOwn < scoreOpponent) {
            this.result = "loose"
        } else {
            this.result = "tie"
        }

        if (scoreOwn > goalsOwn || goalsOpponent > scoreOpponent) {
            this.winnerByPen = true
        }

        const reachedThreeGoals = goalsOwn === 3 || goalsOpponent === 3
        const aggregateDifferent =
            aggregateScoreOwn !== goalsOwn || aggregateScoreOpponent !== goalsOpponent

        let dnfRes = false

        if (this.matchType === "friendly" && !this.winnerByDnf && reachedThreeGoals && aggregateDifferent) {
            this.winnerByDnf = true
            dnfRes = true
        }

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
                goals: dnfRes ? aggregateScoreOwn : rawdataLocalClub.goals,
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
                goals: dnfRes ? aggregateScoreOpponent : rawdataAwayClub.goals,
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