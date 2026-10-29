import mongoose from "mongoose"

/**
 * Base de datos compartida por todos los clubes (cada club tiene además la suya,
 * la de MONGO_URL). Guarda lo que es de la persona y no del club: el vínculo
 * cuenta <-> jugador, la foto por defecto y las solicitudes de vínculo.
 *
 * Cuelga de la misma conexión con `useDb` (sin otra URL ni otro pool): el usuario
 * de cada club solo necesita además `readWrite` sobre esta base.
 */
export const SHARED_DB_NAME = process.env.SHARED_DB_NAME || "tpcs27_shared"

export const sharedDb = mongoose.connection.useDb(SHARED_DB_NAME, { useCache: true })
