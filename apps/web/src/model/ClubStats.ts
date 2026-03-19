import {
    translateDivision,
    translateFinishGroup,
    translateReputation
} from '@/i18n/translations';
import type { IClub } from '@/interfaces/club.interface';

export default class ClubStats implements IClub {
    clubId: number;
    regionId: number;
    name: string;
    stats: {
        bestDivision: number;
        bestDivisionName: string;
        bestFinishGroup: number;
        bestFinishGroupName: string;
        gamesPlayed: number;
        gamesPlayedPlayoff: number;
        gamesPlayedLeague: number;
        goals: number;
        goalsAgainst: number;
        promotions: number;
        relegations: number;
        wins: number;
        ties: number;
        losses: number;
        winstreak: number;
        unbeatenstreak: number;
        skill: number;
        reputationtier: number;
        reputationName: string;
    };
    updatedAt: string;

    constructor(json: any) {
        this.clubId = Number(json.clubId)
        this.regionId = Number(json.regionId)
        this.name = json.name
        this.stats = {
            bestDivision: Number(json.stats.bestDivision),
            bestFinishGroup: Number(json.stats.bestFinishGroup),
            bestDivisionName: translateDivision(Number(json.stats.bestDivision)),
            bestFinishGroupName: translateFinishGroup(Number(json.stats.bestFinishGroup)),
            gamesPlayed: Number(json.stats.gamesPlayed),
            gamesPlayedPlayoff: Number(json.stats.gamesPlayedPlayoff),
            gamesPlayedLeague: Number(json.stats.gamesPlayed) - Number(json.stats.gamesPlayedPlayoff),
            goals: Number(json.stats.goals),
            goalsAgainst: Number(json.stats.goalsAgainst),
            promotions: Number(json.stats.promotions),
            relegations: Number(json.stats.relegations),
            wins: Number(json.stats.wins),
            ties: Number(json.stats.ties),
            losses: Number(json.stats.losses),
            winstreak: Number(json.stats.winstreak),
            unbeatenstreak: Number(json.stats.unbeatenstreak),
            skill: Number(json.stats.skill),
            reputationtier: Number(json.stats.reputationtier),
            reputationName: translateReputation(Number(json.stats.reputationtier))
        }
        this.updatedAt = json.updatedAt
    }


}
