import { AverageStatsModel } from "@models/averageStats.model"
import { PlayerStatsOfficialModel, PlayerStatsFriendlyModel } from "@models/playerstats.model"

import dotenv from "dotenv"
dotenv.config()

const STATS_FIELDS = [
    'gamesPlayed', 'minutesPlayed', 'wins', 'losses', 'ties',
    'goals', 'assists', 'shots', 'redCards', 'passesMade',
    'passesSuccess', 'ratingSum', 'tacklesMade', 'tacklesSuccess',
    'cleanSheets', 'goalsConceded', 'manOfTheMatch', 'hattricks',
    'pokers', 'saves'
]

const POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward'] as const
type Position = typeof POSITIONS[number]

const MIN_MATCHES_THRESHOLD = Number(process.env.AVERAGE_MATCHES_THRESHOLD ?? '8')

export const computePlayerStatsAverages = async (): Promise<void> => {
    console.log('[Average Stats] Starting computation of average player stats...')
    for (const position of POSITIONS) {
        await computeAndUpsert({ position })
    }

    await computeAndUpsert({
        position: 'general',
        excludePositions: ['goalkeeper']
    })
    console.log('[Average Stats] Finished computing average player stats.')
}

const computeAndUpsert = async ({
    position,
    excludePositions = []
}: {
    position: Position | 'general'
    excludePositions?: string[]
}) => {
    const query: Record<string, any> = { gamesPlayed: { $gte: MIN_MATCHES_THRESHOLD } }

    if (position === 'general') {
        query.position = { $nin: excludePositions }
    } else {
        query.position = position
    }

    const [official, friendly] = await Promise.all([
        PlayerStatsOfficialModel.find(query).lean(),
        PlayerStatsFriendlyModel.find(query).lean()
    ])
    const players = [...official, ...friendly]

    if (!players.length) {
        console.log(`[Average Stats] No players found for position: ${position} with >= ${MIN_MATCHES_THRESHOLD} matches`)
        return
    }

    console.log(`[Average Stats] Found ${players.length} players for position: ${position}, computing averages...`)

    // avg raw fields
    const averaged: Record<string, number> = {}
    for (const field of STATS_FIELDS) {
        const sum = players.reduce((acc, p) => acc + ((p as any)[field] ?? 0), 0)
        averaged[field] = sum / players.length
    }

    // computed fields
    const g = averaged.gamesPlayed
    averaged.ratingAve = g ? averaged.ratingSum / g : 0
    averaged.goalsPerMatch = g ? averaged.goals / g : 0
    averaged.assistsPerMatch = g ? averaged.assists / g : 0
    averaged.winRate = g ? (averaged.wins / g) * 100 : 0
    averaged.passSuccessRate = averaged.passesMade ? (averaged.passesSuccess / averaged.passesMade) * 100 : 0
    averaged.tackleSuccessRate = averaged.tacklesMade ? (averaged.tacklesSuccess / averaged.tacklesMade) * 100 : 0
    averaged.shotSuccessRate = averaged.shots ? (averaged.goals / averaged.shots) * 100 : 0
    averaged.savesPerMatch = g ? averaged.saves / g : 0
    averaged.cleanSheetsPercent = g ? (averaged.cleanSheets / g) * 100 : 0
    averaged.goalsConcededPerMatch = g ? averaged.goalsConceded / g : 0
    averaged.savesPercent = (averaged.saves + averaged.goalsConceded) ? (averaged.saves / (averaged.saves + averaged.goalsConceded)) * 100 : 0
    averaged.manOfTheMatchPercent = g ? (averaged.manOfTheMatch / g) * 100 : 0
    averaged.goalsPlusAssists = averaged.goals + averaged.assists
    averaged.goalsPlusAssistsPerMatch = g ? averaged.goalsPlusAssists / g : 0
    averaged.passesMadePerMatch = g ? averaged.passesMade / g : 0
    averaged.hattricksPerMatch = g ? averaged.hattricks / g : 0
    averaged.pokersPerMatch = g ? averaged.pokers / g : 0

    await AverageStatsModel.updateOne(
        { position },
        {
            $set: {
                ...averaged,
                position,
                sampleSize: players.length,
                computedAt: new Date()
            }
        },
        { upsert: true }
    )
    console.log(`[Average Stats] Successfully updated averages for position: ${position}`)
}