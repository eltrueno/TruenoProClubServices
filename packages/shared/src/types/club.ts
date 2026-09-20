/** Caché interna en Mongo de la info + stats globales del club (origen: EA) */
export interface IClubStats {
    bestDivision: number
    bestFinishGroup: number
    gamesPlayed: number
    gamesPlayedPlayoff: number
    goals: number
    goalsAgainst: number
    promotions: number
    relegations: number
    wins: number
    ties: number
    losses: number
    winstreak: number
    unbeatenstreak: number
    skill: number
    reputationtier: number
}

export interface IClub {
    clubId: number
    regionId: number
    name: string
    stats: IClubStats
    updatedAt?: Date | string
}
