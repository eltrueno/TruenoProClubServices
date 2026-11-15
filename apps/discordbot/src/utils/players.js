/**
 * Jugador ↔ cuenta de Discord, a partir de las cuentas de casemuro.stream.
 *
 * Cada usuario conecta su Discord en accounts.casemuro.stream y un admin vincula su cuenta
 * a su jugador. Aquí se juntan las dos cosas:
 *   - el api del club dice qué cuenta tiene cada jugador (`GET /members` → `userId`), y
 *   - el auth dice qué Discord tiene cada cuenta (`GET /api/v1/accounts`, con token de API).
 *
 * El resultado se guarda unos minutos. Si algo falla se sigue con lo último que se supo, y
 * si no se sabe nada, los mensajes salen con el nombre del jugador en vez de la mención.
 */
require('dotenv').config();

const API_URL = (process.env.API_URL || "https://api.casemuro.stream").replace(/\/+$/, "")
const AUTH_URL = (process.env.AUTH_URL || "https://auth.casemuro.stream").replace(/\/+$/, "")
const AUTH_API_TOKEN = process.env.AUTH_API_TOKEN || ""

const CACHE_MS = 5 * 60 * 1000
const TIMEOUT_MS = 8000
/** Máximo de cuentas por petición al auth */
const CHUNK = 100

/** playerId -> discordId */
let links = new Map()
let loadedAt = 0
let loading = null
let warnedNoToken = false

async function getJson(url, headers) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url.split("?")[0]}`)
    return res.json()
}

/** Cuentas del auth (con token de API). `param`: ids | discordIds | twitchIds */
async function fetchAccounts(param, values) {
    const accounts = []
    for (let i = 0; i < values.length; i += CHUNK) {
        const chunk = values.slice(i, i + CHUNK)
        const body = await getJson(`${AUTH_URL}/api/v1/accounts?${param}=${chunk.map(encodeURIComponent).join(",")}`, {
            authorization: `Bearer ${AUTH_API_TOKEN}`
        })
        accounts.push(...(body.data || []))
    }
    return accounts
}

function hasToken() {
    if (AUTH_API_TOKEN) return true
    if (!warnedNoToken) {
        console.warn("[Players] Falta AUTH_API_TOKEN: no se puede saber el Discord de cada jugador, se usarán los nombres")
        warnedNoToken = true
    }
    return false
}

async function loadLinks() {
    const { response: members } = await getJson(`${API_URL}/members`)
    const linked = (members || []).filter((m) => m.playerId && m.userId)
    const accounts = linked.length ? await fetchAccounts("ids", [...new Set(linked.map((m) => m.userId))]) : []
    const discordByUser = new Map(accounts.filter((a) => a.discordId).map((a) => [a.id, a.discordId]))

    const next = new Map()
    for (const m of linked) {
        const discordId = discordByUser.get(m.userId)
        if (discordId) next.set(String(m.playerId), discordId)
    }
    return next
}

/** playerId -> discordId, refrescado como mucho cada CACHE_MS */
async function getLinks() {
    if (!hasToken()) return links
    if (Date.now() - loadedAt < CACHE_MS) return links
    if (!loading) {
        loading = loadLinks()
            .then((next) => { links = next })
            .catch((err) => console.error("[Players] No se han podido cargar las cuentas de Discord:", err.message || err))
            // Tanto si va bien como si no, no se reintenta hasta dentro de CACHE_MS
            .finally(() => { loadedAt = Date.now(); loading = null })
    }
    await loading
    return links
}

/** Mención de Discord si el jugador tiene cuenta con Discord conectado; si no, su nombre */
async function mention(player) {
    const map = await getLinks()
    const discordId = player.playerId ? map.get(String(player.playerId)) : null
    return discordId ? `<@${discordId}>` : player.playerName
}

/** Menciones de varios jugadores, en el mismo orden */
async function mentions(players) {
    const map = await getLinks()
    return players.map((p) => {
        const discordId = p.playerId ? map.get(String(p.playerId)) : null
        return discordId ? `<@${discordId}>` : p.playerName
    })
}

/** Jugador de un usuario de Discord: `{ playerId, discordId }`, o null si no tiene */
async function findByDiscordId(discordId) {
    if (!hasToken()) return null
    const [account] = await fetchAccounts("discordIds", [String(discordId)])
    return account && account.playerId ? { playerId: account.playerId, discordId: account.discordId } : null
}

module.exports = { mention, mentions, findByDiscordId }
