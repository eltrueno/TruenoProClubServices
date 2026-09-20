import type { IAchievementDefinition, AchievementCategory, AchievementScope, AchievementType, AchievementMode } from "@trueno-proclub-services/shared"

export default class AchievementDefinitionEntity implements IAchievementDefinition {
    _id: string;
    name: string;
    description?: string;
    category: AchievementCategory;
    scope: "cumulative" | "match";
    type: "official" | "friendly" | "general";
    mode: "infinite" | "unique";
    step?: number;
    threshold?: number;
    exact?: number;

    constructor(achievementDefinition: IAchievementDefinition) {
        Object.assign(this, achievementDefinition)
    }
}

