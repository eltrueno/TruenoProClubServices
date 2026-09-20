import { ClubMemberModel, LinkRequestModel } from "@trueno-proclub-services/shared/models"
import type { IAuthUser, ILinkRequest } from "@trueno-proclub-services/shared"
import * as ClubMemberService from "./clubMember.service.js"

/** Solicitud pendiente del usuario (como mucho una) */
const getPendingByUser = async (userId: string): Promise<ILinkRequest | null> => {
    const doc = await LinkRequestModel.findOne({ userId, status: "pending" })
    return doc ? (doc.toJSON() as ILinkRequest) : null
}

/**
 * Crea (o sustituye) la solicitud pendiente del usuario para `playerId`.
 * Lanza `ALREADY_LINKED` si la cuenta ya tiene jugador y `PLAYER_TAKEN` si el jugador ya tiene cuenta.
 */
const create = async (user: IAuthUser, playerId: string): Promise<ILinkRequest> => {
    const [member, mine] = await Promise.all([
        ClubMemberModel.findOne({ playerId }),
        ClubMemberModel.findOne({ userId: user.id })
    ])
    if (!member) throw new Error("ERROR_NOT_FOUND")
    if (mine) throw new Error("ALREADY_LINKED")
    if (member.userId) throw new Error("PLAYER_TAKEN")

    // Solo una pendiente por usuario: la anterior (si la había) se descarta
    await LinkRequestModel.deleteMany({ userId: user.id, status: "pending" })
    const doc = await LinkRequestModel.create({
        userId: user.id,
        userName: user.name,
        userImage: user.image ?? null,
        playerId,
        playerName: member.playerName,
        status: "pending"
    })
    return doc.toJSON() as ILinkRequest
}

const cancel = async (userId: string) => {
    const res = await LinkRequestModel.deleteMany({ userId, status: "pending" })
    return res.deletedCount > 0
}

const getAllPending = async (): Promise<ILinkRequest[]> => {
    const docs = await LinkRequestModel.find({ status: "pending" }).sort({ createdAt: 1 })
    return docs.map((d) => d.toJSON() as ILinkRequest)
}

/** Aprobar = vincular la cuenta al jugador (misma lógica que el PATCH admin) */
const approve = async (id: string, adminId: string) => {
    const req = await LinkRequestModel.findOne({ _id: id, status: "pending" })
    if (!req) return null
    const member = await ClubMemberService.adminPatch(req.playerId, { userId: req.userId })
    if (!member) throw new Error("ERROR_NOT_FOUND")
    req.status = "approved"
    req.resolvedAt = new Date()
    req.resolvedBy = adminId
    await req.save()
    // Otras solicitudes pendientes del mismo usuario o para el mismo jugador ya no tienen sentido
    await LinkRequestModel.updateMany(
        { _id: { $ne: req._id }, status: "pending", $or: [{ userId: req.userId }, { playerId: req.playerId }] },
        { $set: { status: "rejected", resolvedAt: new Date(), resolvedBy: adminId } }
    )
    return { request: req.toJSON() as ILinkRequest, member }
}

const reject = async (id: string, adminId: string): Promise<ILinkRequest | null> => {
    const req = await LinkRequestModel.findOneAndUpdate(
        { _id: id, status: "pending" },
        { $set: { status: "rejected", resolvedAt: new Date(), resolvedBy: adminId } },
        { new: true }
    )
    return req ? (req.toJSON() as ILinkRequest) : null
}

export { getPendingByUser, create, cancel, getAllPending, approve, reject }
