import { ACHIEVEMENT_DEFINITIONS, type IPlayerStats, type IAchievementDefinition, type IAchievementUnlocked, type IMatch, type IMatchPlayer } from "@trueno-proclub-services/shared"
import { AchievementDefinitionModel, AchievementUnlockedModel, MemberTotwAppearancesModel } from "@trueno-proclub-services/shared/models"
import { getMilestoneProducer, getAchievementProducer } from "../events/index.js"


/** Categorías que se evalúan con las apariciones en el equipo de la semana, no con las stats */
const TOTW_CATEGORIES = ["totwBest", "totwWorst"]

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

/** Escalones de un hito que faltan por desbloquear: de `lastReached` hasta el valor actual */
function pendingSteps(value: number, lastReached: number, step: number): number[] {
    const steps: number[] = []
    for (let reached = lastReached + step; reached <= value; reached += step) steps.push(reached)
    return steps
}

// Core Achievement Checker

/**
 * Receives the current stats + type + optional match context.
 * Loads definitions from DB and checks against current stats or current match.
 */
const checkMemberAchievements = async (
    stats: Partial<Record<keyof IPlayerStats, unknown>> & {
        playerId: string;
        playerName: string;
        matchObj?: IMatch;
    },
    silent = false
) => {
    // 1. Logros de club sobre estadísticas (los del equipo de la semana van aparte)
    const definitions = await AchievementDefinitionModel.find({ type: "club", category: { $nin: TOTW_CATEGORIES } }).lean();

    // 2. Get already unlocked by this player for these definitions
    const unlocked = await AchievementUnlockedModel.find({
        playerId: stats.playerId,
        achievementId: { $in: definitions.map(d => d._id) }
    }).lean();

    const newUnlocks: { unlock: IAchievementUnlocked, mode: "infinite" | "unique", def: IAchievementDefinition }[] = [];

    // Pre-calculate matchPlayer if matchObj is present
    let matchPlayer: IMatchPlayer | undefined;
    if (stats.matchObj) {
        matchPlayer = stats.matchObj.localClub.players.find(p => p.playerId === stats.playerId)
            || stats.matchObj.awayClub.players.find(p => p.playerId === stats.playerId);
    }

    for (const def of definitions) {
        if (def.mode === "infinite") {
            // Infinite are always cumulative for now
            const statValue = (stats as any)[def.category] || 0;
            const step = def.step || 25;
            const myUnlocksForThis = unlocked.filter(u => u.achievementId === def._id);
            const lastReached = myUnlocksForThis.length > 0 ? Math.max(...myUnlocksForThis.map(u => u.reached || 0)) : 0;

            // Un desbloqueo por cada escalón superado (cada hito da sus puntos), no solo el último
            for (const reached of pendingSteps(statValue, lastReached, step)) {
                newUnlocks.push({
                    unlock: {
                        playerId: stats.playerId,
                        playerName: stats.playerName,
                        achievementId: def._id,
                        reached,
                        unlockedAt: stats.matchObj ? new Date(stats.matchObj.timestamp * 1000) : new Date(),
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
                            playerId: stats.playerId,
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
                console.info(`[Milestone] Triggered ${unlock.achievementId} for ${stats.playerName} (Reached: ${unlock.reached})`);
                await getMilestoneProducer().publish(fullPayload as any);
            } else {
                console.info(`[Achievement] Triggered ${unlock.achievementId} for ${stats.playerName}`);
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
    playerId: string,
    playerName: string,
    statsForAchievements: any,
    match: { matchObj?: IMatch } = {},
    silent = false
) => {
    const statsData = statsForAchievements.toObject ? statsForAchievements.toObject() : statsForAchievements
    const newUnlocks = await checkMemberAchievements({
        ...statsData,
        playerId,
        playerName,
        matchObj: match?.matchObj
    }, silent)

    if (newUnlocks.length > 0) {
        if (!silent) console.info(`[Achievements] Saving ${newUnlocks.length} new unlocks for ${playerName}`);
        for (const unlock of newUnlocks) {
            // Use updateOne with upsert to avoid duplicate key errors during batch processing
            await AchievementUnlockedModel.updateOne(
                {
                    playerId: unlock.playerId,
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
const processTOTWAchievements = async (players: { playerId: string, playerName: string }[], silent = false) => {
    const definitions = await AchievementDefinitionModel.find({
        type: "club",
        category: { $in: TOTW_CATEGORIES }
    }).lean();

    if (definitions.length === 0) return;

    for (const { playerId, playerName } of players) {
        const [bestCount, worstCount] = await Promise.all([
            MemberTotwAppearancesModel.countDocuments({ playerId, type: "best" }),
            MemberTotwAppearancesModel.countDocuments({ playerId, type: "worst" })
        ]);

        const stats = { totwBest: bestCount, totwWorst: worstCount };

        const unlocked = await AchievementUnlockedModel.find({
            playerId,
            achievementId: { $in: definitions.map(d => d._id) }
        }).lean();

        const newUnlocks: { unlock: IAchievementUnlocked, mode: "infinite" | "unique", def: IAchievementDefinition }[] = [];

        for (const def of definitions) {
            const statValue = stats[def.category as keyof typeof stats] || 0;

            if (def.mode === "infinite") {
                const step = def.step || 5;
                const myUnlocksForThis = unlocked.filter(u => u.achievementId === def._id);
                const lastReached = myUnlocksForThis.length > 0 ? Math.max(...myUnlocksForThis.map(u => u.reached || 0)) : 0;

                for (const reached of pendingSteps(statValue, lastReached, step)) {
                    newUnlocks.push({
                        unlock: {
                            playerId,
                            playerName,
                            achievementId: def._id,
                            reached,
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
                                playerId,
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
                    playerId: unlock.playerId,
                    achievementId: unlock.achievementId,
                    reached: unlock.reached
                },
                { $setOnInsert: unlock },
                { upsert: true }
            );

            const fullPayload = { ...unlock, ...def, achievementId: def._id };
            delete (fullPayload as any)._id;

            // Recálculo: no se re-anuncian logros históricos
            if (silent) continue

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
    const allPlayers = await MemberTotwAppearancesModel.aggregate<{ playerId: string, playerName: string }>([
        { $sort: { createdAt: 1 } },
        { $group: { _id: "$playerId", playerName: { $last: "$playerName" } } },
        { $project: { _id: 0, playerId: "$_id", playerName: 1 } }
    ])

    if (allPlayers.length === 0) {
        console.info("[Achievements] No TOTW appearances found, skipping.")
        return
    }

    await processTOTWAchievements(allPlayers, true)
    console.info(`[Achievements] TOTW achievement recalculation done for ${allPlayers.length} players.`)
}

export { processAchievements, processTOTWAchievements, recalculateAllTOTWAchievements }

/**
 * Deja en la DB exactamente las definiciones del repo (shared): upserta las que hay y borra
 * las que ya no existen. Idempotente; se llama al arrancar para que una DB nueva tenga logros
 * desde el primer partido.
 *
 * Devuelve true si ha cambiado algo que afecta a lo ya desbloqueado (un logro que desaparece,
 * o uno al que le cambian las condiciones): quien llama debe rehacer los logros desde cero.
 * Uno nuevo no cuenta: como mucho se desbloqueará con el siguiente partido de cada jugador.
 */
const CONDITION_FIELDS = ["category", "scope", "type", "mode", "step", "threshold", "exact"] as const

const syncAchievementDefinitions = async (): Promise<boolean> => {
    if (ACHIEVEMENT_DEFINITIONS.length === 0) return false
    const current = await AchievementDefinitionModel.find({}).lean()
    const byId = new Map(current.map((d) => [String(d._id), d as Record<string, unknown>]))
    const ids = ACHIEVEMENT_DEFINITIONS.map((d) => d._id)

    const removed = current.filter((d) => !ids.includes(String(d._id))).map((d) => String(d._id))
    const changed = ACHIEVEMENT_DEFINITIONS.filter((def) => {
        const old = byId.get(def._id)
        return !!old && CONDITION_FIELDS.some((f) => (old[f] ?? null) !== ((def as unknown as Record<string, unknown>)[f] ?? null))
    }).map((d) => d._id)

    const res = await AchievementDefinitionModel.bulkWrite(
        ACHIEVEMENT_DEFINITIONS.map((def) => {
            // Lo que la definición ya no lleva (p. ej. `exact`) se quita, no se queda de antes
            const unset = Object.fromEntries(CONDITION_FIELDS.filter((f) => (def as unknown as Record<string, unknown>)[f] === undefined).map((f) => [f, "" as const]))
            return {
                updateOne: {
                    filter: { _id: def._id },
                    update: { $set: def, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
                    upsert: true
                }
            }
        })
    )
    if (removed.length > 0) await AchievementDefinitionModel.deleteMany({ _id: { $in: removed } })

    console.info(`[Achievements] Definitions synced: ${res.upsertedCount} new, ${res.modifiedCount} updated, ${removed.length} removed, ${ACHIEVEMENT_DEFINITIONS.length} total`)
    if (removed.length > 0 || changed.length > 0) {
        console.info(`[Achievements] Cambian logros ya existentes (${[...removed, ...changed].join(", ")}): hay que rehacer los desbloqueados`)
        return true
    }
    return false
}

export { syncAchievementDefinitions }
