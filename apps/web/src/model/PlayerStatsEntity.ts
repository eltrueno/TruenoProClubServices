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
    savesPercent: number;

    constructor(stats: Partial<IPlayerStats>) {
        // Initialize all numeric fields to 0 to prevent NaN
        this.playerName = ''
        this.gamesPlayed = 0
        this.minutesPlayed = 0
        this.wins = 0
        this.losses = 0
        this.ties = 0
        this.goals = 0
        this.assists = 0
        this.shots = 0
        this.redCards = 0
        this.passesMade = 0
        this.passesSuccess = 0
        this.ratingSum = 0
        this.tacklesMade = 0
        this.tacklesSuccess = 0
        this.cleanSheets = 0
        this.goalsConceded = 0
        this.manOfTheMatch = 0
        this.hattricks = 0
        this.pokers = 0
        this.saves = 0
        this.mostPlayedPosition = Position.midfielder
        this.playedPositions = {} as Record<Position, number>

        // Aggregated (computed) fields
        this.ratingAve = 0
        this.goalsPerMatch = 0
        this.assistsPerMatch = 0
        this.hattricksPerMatch = 0
        this.pokersPerMatch = 0
        this.goalsPlusAssists = 0
        this.goalsPlusAssistsPerMatch = 0
        this.passesMadePerMatch = 0
        this.passSuccessRate = 0
        this.tackleSuccessRate = 0
        this.shotSuccessRate = 0
        this.manOfTheMatchPercent = 0
        this.winRate = 0
        this.savesPerMatch = 0
        this.cleanSheetsPercent = 0
        this.goalsConcededPerMatch = 0
        this.savesPercent = 0

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
        this.savesPercent = (this.saves + this.goalsConceded)
            ? (this.saves / (this.saves + this.goalsConceded)) * 100
            : 0
    }

}