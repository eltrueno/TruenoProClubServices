/**
 * Resuelve jugador ↔ cuenta de Discord.
 * La clave es `playerId` (id de EA). `playerName` en players.database.js es solo
 * una etiqueta y un fallback mientras no se rellene el id.
 */
function findByPlayer(client, player) {
    const list = client.playerDatabase.players
    if (player.playerId) {
        const byId = list.find((e) => e.playerId && e.playerId === player.playerId)
        if (byId) return byId
    }
    return list.find((e) => !e.playerId && e.playerName === player.playerName) || null
}

function findByDiscordId(client, discordId) {
    return client.playerDatabase.players.find((e) => e.discordId === discordId) || null
}

/** Mención de Discord si el jugador está vinculado, si no su nombre. */
function mention(client, player) {
    const entry = findByPlayer(client, player)
    return entry ? `<@${entry.discordId}>` : player.playerName
}

module.exports = { findByPlayer, findByDiscordId, mention }
