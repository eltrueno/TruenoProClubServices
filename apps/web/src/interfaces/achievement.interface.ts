export interface IAchievementDefinition {
    _id: string;
    name: string;
    description?: string;
    category: "gamesPlayed" | "goals" | "assists" | "redCards" | "passesMade" | "passesSuccess" | "manOfTheMatch" | "hattricks" | "pokers" | "cleanSheets" | "saves" | "minutesPlayed" | "pass_accuracy" | "shot_accuracy" | "totwBest" | "totwWorst";
    scope: "cumulative" | "match";
    type: "official" | "friendly" | "general";
    mode: "infinite" | "unique";
    step?: number;
    threshold?: number;
    exact?: number;
}

export interface IAchievementUnlocked {
    playerName: string;
    achievementId: string;
    reached?: number;
    unlockedAt: Date;
    matchId?: string;
}
