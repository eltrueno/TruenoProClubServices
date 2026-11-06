import type { User } from "@trueno-proclub-services/auth"
import { userModel } from "../models/userModel.js"
import { TWITCH_SYNC_RETRY_MS, TWITCH_SYNC_STALE_MS, twitchService } from "./twitchService.js"

function minutes(name: string, fallback: number): number {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const INTERVAL_MS = minutes("TWITCH_SYNC_INTERVAL_MINUTES", 60) * 60_000
/** Usuarios por pasada: el resto se queda para la siguiente (los más antiguos van primero) */
const BATCH_SIZE = 200
/** Pausa entre usuarios para no ir a ráfagas contra la API de Twitch */
const DELAY_MS = 250

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Sincronización en segundo plano para quien no entra en la web: cada
 * TWITCH_SYNC_INTERVAL_MINUTES se refresca a los usuarios cuya última
 * sincronización es más vieja que TWITCH_SYNC_STALE_MINUTES. Sin esto, un sub que
 * caduca (o uno nuevo) no se veía hasta que el propio usuario pulsaba el botón.
 */
export async function runTwitchSyncPass(): Promise<{ checked: number; ok: number; failed: number }> {
  const now = Date.now()
  const due = await userModel.findTwitchSyncDue(new Date(now - TWITCH_SYNC_STALE_MS), new Date(now - TWITCH_SYNC_RETRY_MS), BATCH_SIZE)
  let ok = 0
  let failed = 0
  for (const user of due) {
    try {
      const result = await twitchService.syncTwitchData(user as User)
      if (result.ok) ok++
      else failed++
    } catch (err) {
      failed++
      console.error(`[twitchSync] Error con ${user.id}:`, err)
    }
    await sleep(DELAY_MS)
  }
  return { checked: due.length, ok, failed }
}

export function startTwitchSyncJob(): void {
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const r = await runTwitchSyncPass()
      if (r.checked > 0) console.log(`[twitchSync] ${r.checked} revisados: ${r.ok} ok, ${r.failed} con error`)
    } catch (err) {
      console.error("[twitchSync] Error en la pasada:", err)
    } finally {
      running = false
    }
  }
  setTimeout(tick, 60_000) // primera pasada al minuto de arrancar
  setInterval(tick, INTERVAL_MS)
}
