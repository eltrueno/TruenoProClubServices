import type { MqConnection } from "@trueno-proclub-services/mq";
import type { IAchievementUnlocked, IAchievementDefinition } from "@trueno-proclub-services/shared"

export interface IAchievementPublishPayload extends IAchievementUnlocked, Omit<IAchievementDefinition, "_id"> { }

export class UniqueAchievementEvent {
    constructor(private mqManager: MqConnection) { }

    async publish(payload: IAchievementPublishPayload) {
        /*await this.mqManager.publish('player.achievement.unlock.onetime', payload);
        console.info(`[Event System] 'player.achievement.unlock.onetime' event published for ${payload.playerName}: ${payload.achievementId} (${payload.name})`);
        */
    }
}

