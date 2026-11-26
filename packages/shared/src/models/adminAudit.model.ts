import { Schema } from "mongoose"
import type { IAdminAuditEntry } from "../types/admin.js"
import { sharedDb } from "./sharedDb.js"

/**
 * Registro de acciones de admin hechas desde los api de los clubes (vínculos, fotos, nulos,
 * sincronizar / recalcular), en la base compartida y con el club. Las de cuentas (roles, tokens)
 * las guarda el servicio de auth en la suya. Se borran solas a los 180 días.
 */
const adminAuditSchema = new Schema<IAdminAuditEntry>(
    {
        action: { type: String, required: true, index: true },
        actorId: { type: String, default: null },
        actorName: { type: String, default: null },
        target: { type: String, default: null, index: true },
        targetName: { type: String, default: null },
        clubId: { type: Number, default: null },
        details: { type: Schema.Types.Mixed, default: null },
        createdAt: { type: Date, default: () => new Date(), expires: 60 * 60 * 24 * 180 },
    },
    {
        versionKey: false,
        collection: "admin_audit",
        toJSON: { virtuals: true, transform: (_doc, ret: any) => { delete ret._id; return ret } },
    }
)
adminAuditSchema.index({ createdAt: -1 })

export const AdminAuditModel = sharedDb.model<IAdminAuditEntry>("admin_audit", adminAuditSchema)
