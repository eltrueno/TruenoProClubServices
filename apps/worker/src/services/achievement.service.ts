import { IPlayerStats } from "@interfaces/playerStats.interface";
import { IAchievementDefinition, IAchievementUnlocked } from "@interfaces/achievement.interface";
import { AchievementDefinitionModel, AchievementUnlockedModel } from "@models/achievement.model";
import { getMilestoneProducer, getAchievementProducer } from "@events/index";
import { IMatch } from "@interfaces/match.interface"
import { IMatchPlayer } from "@interfaces/matchPlayer.interface"
import { MemberTotwAppearancesModel } from "@models/totw.model"


function getMatchStatValue(player: IMatchPlayer, category: string): number {
    if (category === "pass_accuracy") {
        if (!player.passesMade || player.passesMade < 10) return -1;
        return Math.floor((player.passesSuccess / player.passesMade) * 100);
    }
    if (category === "shot_accuracy") {
        if (!player.shots || player.shots < 3) return -1;
        return Math.floor((player.goals / player.shots) * 100);
    }

    // Especial handling for cleansheets vs cleanSheet in match object
    if (category === "cleanSheets") return player.cleanSheet ? 1 : 0;

    // Booleans to number conversion automatically
    const val = (player as any)[category];
    if (typeof val === "boolean") return val ? 1 : 0;
    return val || 0;
}

// Core Achievement Checker

/**
 * Receives the current stats + type + optional match context.
 * Loads definitions from DB and checks against current stats or current match.
 */
const checkMemberAchievements = async (
    stats: Pick<IPlayerStats, "gamesPlayed" | "goals" | "assists" | "redCards"
        | "passesMade" | "passesSuccess" | "manOfTheMatch" | "hattricks" | "pokers" | "cleanSheets" | "saves" | "minutesPlayed"> & {
            playerName: string;
            type: "official" | "friendly";
            matchObj?: IMatch;
        },
    silent = false
) => {
    // 1. Get all definitions for this type (official/friendly)
    const definitions = await AchievementDefinitionModel.find({ type: stats.type }).lean();

    // 2. Get already unlocked by this player for these definitions
    const unlocked = await AchievementUnlockedModel.find({
        playerName: stats.playerName,
        achievementId: { $in: definitions.map(d => d._id) }
    }).lean();

    const newUnlocks: { unlock: IAchievementUnlocked, mode: "infinite" | "unique", def: IAchievementDefinition }[] = [];

    // Pre-calculate matchPlayer if matchObj is present
    let matchPlayer: IMatchPlayer | undefined;
    if (stats.matchObj) {
        matchPlayer = stats.matchObj.localClub.players.find(p => p.playername === stats.playerName)
            || stats.matchObj.awayClub.players.find(p => p.playername === stats.playerName);
    }

    for (const def of definitions) {
        if (def.mode === "infinite") {
            // Infinite are always cumulative for now
            const statValue = (stats as any)[def.category] || 0;
            const step = def.step || 25;
            const myUnlocksForThis = unlocked.filter(u => u.achievementId === def._id);
            const lastReached = myUnlocksForThis.length > 0 ? Math.max(...myUnlocksForThis.map(u => u.reached || 0)) : 0;

            if (statValue >= (lastReached + step)) {
                const newReached = Math.floor(statValue / step) * step;
                newUnlocks.push({
                    unlock: {
                        playerName: stats.playerName,
                        achievementId: def._id,
                        reached: newReached,
                        unlockedAt: new Date(), // cumulative milestones usually use current time
                        matchId: stats.matchObj?.matchId?.toString()
                    },
                    mode: "infinite",
                    def: def as unknown as IAchievementDefinition
                });
            }
        } else if (def.mode === "unique") {
            const alreadyUnlocked = unlocked.some(u => u.achievementId === def._id);
            if (!alreadyUnlocked) {
                let reachedCondition = false;

                if (def.scope === "cumulative") {
                    const statValue = (stats as any)[def.category] || 0;
                    if (def.exact !== undefined) {
                        reachedCondition = statValue === def.exact;
                    } else {
                        reachedCondition = statValue >= (def.threshold || 1);
                    }
                } else if (def.scope === "match" && matchPlayer) {
                    const matchStatValue = getMatchStatValue(matchPlayer, def.category);
                    if (def.exact !== undefined) {
                        reachedCondition = matchStatValue === def.exact;
                    } else {
                        reachedCondition = matchStatValue >= (def.threshold || 1);
                    }
                }

                if (reachedCondition) {
                    const unlockDate = (stats.matchObj)
                        ? new Date(stats.matchObj.timestamp * 1000)
                        : new Date();

                    newUnlocks.push({
                        unlock: {
                            playerName: stats.playerName,
                            achievementId: def._id,
                            unlockedAt: unlockDate,
                            matchId: stats.matchObj?.matchId?.toString()
                        },
                        mode: "unique",
                        def: def as unknown as IAchievementDefinition
                    });
                }
            }
        }
    }

    // 3. Log and trigger events for new ones
    for (const { unlock, mode, def } of newUnlocks) {
        const fullPayload = {
            ...unlock,
            ...def,
            achievementId: def._id, // ensure ID is mapped to achievementId
        };
        delete (fullPayload as any)._id; // remove definition _id as it conflicts with achievementId

        if (!silent) {
            if (mode === "infinite") {
                console.info(`[Milestone - ${stats.type}] Triggered ${unlock.achievementId} for ${stats.playerName} (Reached: ${unlock.reached})`);
                await getMilestoneProducer().publish(fullPayload as any);
            } else {
                console.info(`[Achievement - ${stats.type}] Triggered ${unlock.achievementId} for ${stats.playerName}`);
                await getAchievementProducer().publish(fullPayload as any);
            }
        }
    }

    return newUnlocks.map(n => n.unlock as IAchievementUnlocked);
}

//Exposed

/**
 * Checks and saves new achievements for a member, given their current stats and category.
 */
const processAchievements = async (
    playerName: string,
    statsForAchievements: any,
    match: { matchType: "official" | "friendly", matchObj?: IMatch },
    silent = false
) => {
    const statsData = statsForAchievements.toObject ? statsForAchievements.toObject() : statsForAchievements
    const newUnlocks = await checkMemberAchievements({
        ...statsData,
        playerName,
        type: match.matchType,
        matchObj: match?.matchObj
    }, silent)

    if (newUnlocks.length > 0) {
        if (!silent) console.info(`[Achievements - ${match.matchType}] Saving ${newUnlocks.length} new unlocks for ${playerName}`);
        for (const unlock of newUnlocks) {
            // Use updateOne with upsert to avoid duplicate key errors during batch processing
            await AchievementUnlockedModel.updateOne(
                {
                    playerName: unlock.playerName,
                    achievementId: unlock.achievementId,
                    reached: unlock.reached // This works for both unique (reached=undefined) and infinite
                },
                { $setOnInsert: unlock },
                { upsert: true }
            );
        }
    }
}

/**
 * Checks TOTW-related achievements for a list of players.
 * Counts their best/worst appearances and evaluates "general" type definitions.
 */
const processTOTWAchievements = async (playerNames: string[]) => {
    const definitions = await AchievementDefinitionModel.find({
        type: "general",
        category: { $in: ["totwBest", "totwWorst"] }
    }).lean();

    if (definitions.length === 0) return;

    for (const playerName of playerNames) {
        const [bestCount, worstCount] = await Promise.all([
            MemberTotwAppearancesModel.countDocuments({ playerName, type: "best" }),
            MemberTotwAppearancesModel.countDocuments({ playerName, type: "worst" })
        ]);

        const stats = { totwBest: bestCount, totwWorst: worstCount };

        const unlocked = await AchievementUnlockedModel.find({
            playerName,
            achievementId: { $in: definitions.map(d => d._id) }
        }).lean();

        const newUnlocks: { unlock: IAchievementUnlocked, mode: "infinite" | "unique", def: IAchievementDefinition }[] = [];

        for (const def of definitions) {
            const statValue = stats[def.category as keyof typeof stats] || 0;

            if (def.mode === "infinite") {
                const step = def.step || 5;
                const myUnlocksForThis = unlocked.filter(u => u.achievementId === def._id);
                const lastReached = myUnlocksForThis.length > 0 ? Math.max(...myUnlocksForThis.map(u => u.reached || 0)) : 0;

                if (statValue >= (lastReached + step)) {
                    const newReached = Math.floor(statValue / step) * step;
                    newUnlocks.push({
                        unlock: {
                            playerName,
                            achievementId: def._id,
                            reached: newReached,
                            unlockedAt: new Date()
                        },
                        mode: "infinite",
                        def: def as unknown as IAchievementDefinition
                    });
                }
            } else if (def.mode === "unique") {
                const alreadyUnlocked = unlocked.some(u => u.achievementId === def._id);
                if (!alreadyUnlocked) {
                    let reachedCondition = false;
                    if (def.exact !== undefined) {
                        reachedCondition = statValue === def.exact;
                    } else {
                        reachedCondition = statValue >= (def.threshold || 1);
                    }

                    if (reachedCondition) {
                        newUnlocks.push({
                            unlock: {
                                playerName,
                                achievementId: def._id,
                                unlockedAt: new Date()
                            },
                            mode: "unique",
                            def: def as unknown as IAchievementDefinition
                        });
                    }
                }
            }
        }

        // Save and emit events
        for (const { unlock, mode, def } of newUnlocks) {
            await AchievementUnlockedModel.updateOne(
                {
                    playerName: unlock.playerName,
                    achievementId: unlock.achievementId,
                    reached: unlock.reached
                },
                { $setOnInsert: unlock },
                { upsert: true }
            );

            const fullPayload = { ...unlock, ...def, achievementId: def._id };
            delete (fullPayload as any)._id;

            if (mode === "infinite") {
                console.info(`[Milestone - TOTW] Triggered ${unlock.achievementId} for ${playerName} (Reached: ${unlock.reached})`);
                await getMilestoneProducer().publish(fullPayload as any);
            } else {
                console.info(`[Achievement - TOTW] Triggered ${unlock.achievementId} for ${playerName}`);
                await getAchievementProducer().publish(fullPayload as any);
            }
        }
    }
}

/**
 * Recalculates TOTW achievements for ALL players with TOTW appearances.
 * Safe to call during a full recalculation.
 */
const recalculateAllTOTWAchievements = async () => {
    console.info("[Achievements] Recalculating TOTW achievements for all players...")
    const allPlayers: string[] = await MemberTotwAppearancesModel.distinct("playerName")

    if (allPlayers.length === 0) {
        console.info("[Achievements] No TOTW appearances found, skipping.")
        return
    }

    await processTOTWAchievements(allPlayers)
    console.info(`[Achievements] TOTW achievement recalculation done for ${allPlayers.length} players.`)
}

export { processAchievements, processTOTWAchievements, recalculateAllTOTWAchievements }
