import { isShortMatch } from "@trueno-proclub-services/shared"
import { MatchModel } from "@trueno-proclub-services/shared/models"
import dotenv from 'dotenv'
dotenv.config()

const CLUBID: number = Number(process.env.CLUBID || '101456');

const getById = async (id: number) => {
    return MatchModel.findOne({ matchId: id })
}

const getLatestByMatchTypeLimit = async (matchType: "league" | "playoff", limit: number) => {
    const response = await MatchModel.find({ matchType: matchType }).sort({ timestamp: -1 }).limit(limit)
    return response
}

const getLatestByPlayer = async (playerId: string, limit: number) => {
    const response = await MatchModel.find({
        $or: [
            {
                "localClub.id": CLUBID,
                "localClub.players.playerId": playerId
            },
            {
                "awayClub.id": CLUBID,
                "awayClub.players.playerId": playerId
            }
        ]
    }).sort({ timestamp: -1 }).limit(limit)
    return response
}

const getLatestLimit = async (limit: number) => {
    const response = await MatchModel.find({}).sort({ timestamp: -1 }).limit(limit)
    return response
}

const getAll = async () => {
    const response = await MatchModel.find({})
    return response
}

/**
 * Marca o desmarca un partido como nulo a mano (panel admin). Queda como `voidedBy: "admin"`
 * para que el automático no lo vuelva a tocar. El recálculo de stats lo pide el controlador.
 */
const setVoided = async (matchId: number, voided: boolean) => {
    const match = await MatchModel.findOne({ matchId })
    if (!match) return null
    match.voided = voided
    match.voidedBy = "admin"
    await match.save()
    return match
}

/** Vuelve al criterio automático (nadie llega a 15'): deshace lo que marcó un admin */
const resetVoided = async (matchId: number) => {
    const match = await MatchModel.findOne({ matchId })
    if (!match) return null
    const short = isShortMatch(match)
    match.voided = short
    match.voidedBy = short ? "auto" : null
    await match.save()
    return match
}

export { getById, getLatestByMatchTypeLimit, getLatestByPlayer, getLatestLimit, getAll, setVoided, resetVoided }