import type { IPlayerStats } from "@/interfaces/playerStats.interface";
import { Position } from "@/i18n/translations"

export default class PlayerStatsEntity implements IPlayerStats {
    playerName: string;
    gamesPlayed: number;
    minutesPlayed: number;
    wins: number;
    losses: number;
    ties: number;
    goals: number;
    assists: number;
    shots: number;
    redCards: number;
    passesMade: number;
    passesSuccess: number;
    ratingSum: number;
    tacklesMade: number;
    tacklesSuccess: number;
    cleanSheets: number;
    manOfTheMatch: number;
    goalsConceded: number;
    hattricks: number;
    pokers: number;
    saves: number;
    mostPlayedPosition: Position;
    playedPositions: Record<Position, number>;

    ratingAve: number;
    goalsPerMatch: number;
    assistsPerMatch: number;
    hattricksPerMatch: number;
    pokersPerMatch: number;
    goalsPlusAssists: number;
    goalsPlusAssistsPerMatch: number;
    passesMadePerMatch: number;
    passSuccessRate: number;
    tackleSuccessRate: number;
    shotSuccessRate: number;
    manOfTheMatchPercent: number;
    winRate: number;
    savesPerMatch: number;
    cleanSheetsPercent: number;
    goalsConcededPerMatch: number;

    constructor(stats: IPlayerStats) {
        Object.assign(this, stats)
        this.computeAggregatedStats()
    }

    computeAggregatedStats() {
        this.ratingAve = this.gamesPlayed ? this.ratingSum / this.gamesPlayed : 0
        this.goalsPerMatch = this.gamesPlayed ? this.goals / this.gamesPlayed : 0
        this.assistsPerMatch = this.gamesPlayed ? this.assists / this.gamesPlayed : 0
        this.hattricksPerMatch = this.gamesPlayed ? this.hattricks / this.gamesPlayed : 0
        this.pokersPerMatch = this.gamesPlayed ? this.pokers / this.gamesPlayed : 0

        this.goalsPlusAssists = this.goals + this.assists
        this.goalsPlusAssistsPerMatch = this.gamesPlayed ? this.goalsPlusAssists / this.gamesPlayed : 0

        this.passesMadePerMatch = this.gamesPlayed ? this.passesMade / this.gamesPlayed : 0
        this.passSuccessRate = this.passesMade ? (this.passesSuccess / this.passesMade) * 100 : 0

        this.tackleSuccessRate = this.tacklesMade ? (this.tacklesSuccess / this.tacklesMade) * 100 : 0
        this.shotSuccessRate = this.shots ? (this.goals / this.shots) * 100 : 0

        this.manOfTheMatchPercent = this.gamesPlayed ? (this.manOfTheMatch / this.gamesPlayed) * 100 : 0
        this.winRate = this.gamesPlayed ? (this.wins / this.gamesPlayed) * 100 : 0

        this.savesPerMatch = this.gamesPlayed ? this.saves / this.gamesPlayed : 0
        this.cleanSheetsPercent = this.gamesPlayed ? (this.cleanSheets / this.gamesPlayed) * 100 : 0

        this.goalsConcededPerMatch = this.gamesPlayed ? this.goalsConceded / this.gamesPlayed : 0
    }

}