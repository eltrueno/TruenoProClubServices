import type { MqConnection } from "@trueno-proclub-services/mq";
import type { IAchievementUnlocked, IAchievementDefinition } from "@trueno-proclub-services/shared"

export interface IMilestonePublishPayload extends IAchievementUnlocked, Omit<IAchievementDefinition, "_id"> { }

export class MilestoneEvent {
    constructor(private mqManager: MqConnection) { }

    async publish(payload: IMilestonePublishPayload) {
        /*await this.mqManager.publish('player.achievement.unlock.milestone', payload);
        console.info(`[Event System] 'player.achievement.unlock.milestone' event published for ${payload.playerName}: ${payload.achievementId} (${payload.name} - Reached: ${payload.reached})`);
        */
    }
}

