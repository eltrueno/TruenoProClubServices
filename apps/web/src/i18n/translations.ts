export enum Division {
    Elite = 1,
    Primera = 2,
    Segunda = 3,
    Tercera = 4,
    Cuarta = 5,
    Quinta = 6
}

export enum Reputation {
    HometownHeroes = 0,
    EmergingStars = 1,
    WellKnown = 2,
    WorldRenown = 3
}

export enum FinishGroup {
    Champion = 1,
    RunnerUp = 2,
    Competitive = 3,
    MidTable = 4,
    AlsoRan = 5,
    Participant = 6
}

export enum Position {
    midfielder = "midfielder",
    forward = "forward",
    defender = "defender",
    goalkeeper = "goalkeeper",
}

export enum Result {
    loose = "loose",
    tie = "tie",
    win = "win"
}

export enum AchievementType {
    played = "partidos jugados",
    goals = "goles",
    assists = "asistencias",
    redcards = "tarjetas rojas",
    passes = "pases",
    motm = "mejor del partido"
}

export enum MatchType {
    official = "official",
    friendly = "friendly",
    playoff = "playoff",
    league = "league"
}

export const translateMatchType = (matchType: MatchType | string): string => {
    const map: Record<MatchType, string> = {
        [MatchType.official]: "Oficial",
        [MatchType.friendly]: "Amistoso",
        [MatchType.playoff]: "Playoff",
        [MatchType.league]: "Liga"
    };
    return map[matchType as MatchType] || matchType;
}

// Translations using maps to simulate future i18n behavior
export const translateDivision = (division: number): string => {
    const map: Record<number, string> = {
        [Division.Elite]: "Élite",
        [Division.Primera]: "Primera",
        [Division.Segunda]: "Segunda",
        [Division.Tercera]: "Tercera",
        [Division.Cuarta]: "Cuarta",
        [Division.Quinta]: "Quinta"
    };
    return map[division] || Division[division];
}

export const translateMatchResult = (result: Result | string): string => {
    const map: Record<Result, string> = {
        [Result.loose]: "Derrota",
        [Result.tie]: "Empate",
        [Result.win]: "Victoria"
    };
    return map[result as Result] || result;
}

export const translatePosition = (position: Position | string): string => {
    const map: Record<Position, string> = {
        [Position.midfielder]: "Centrocampista",
        [Position.forward]: "Delantero",
        [Position.defender]: "Defensa",
        [Position.goalkeeper]: "Portero"
    };
    return map[position as Position] || position;
}

export const translateReputation = (reputation: number): string => {
    const map: Record<number, string> = {
        [Reputation.HometownHeroes]: "Héroes Locales",
        [Reputation.EmergingStars]: "Estrellas Emergentes",
        [Reputation.WellKnown]: "Reconocidos",
        [Reputation.WorldRenown]: "Fama Mundial"
    };
    return map[reputation] || Reputation[reputation];
}

export const translateFinishGroup = (finishGroup: number): string => {
    const map: Record<number, string> = {
        [FinishGroup.Champion]: "Campeón",
        [FinishGroup.RunnerUp]: "Subcampeón",
        [FinishGroup.Competitive]: "Competitivo",
        [FinishGroup.MidTable]: "Mitad de Tabla",
        [FinishGroup.AlsoRan]: "También Participó",
        [FinishGroup.Participant]: "Participante"
    };
    return map[finishGroup] || FinishGroup[finishGroup];
}
