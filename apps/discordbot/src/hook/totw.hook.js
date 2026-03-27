const { AttachmentBuilder } = require("discord.js")
const { render } = require("@trueno-proclub-services/imagerenderer-client")
require('dotenv').config();

async function handle(client, totw) {
    try {
        console.log("[Event Listener] 'totw.new' event recieved")
        const totwBestChannel = await client.channels.cache.get("411962391799136266")
        const totwWorstChannel = await client.channels.cache.get("411962391799136266")

        const playersBest = totw.bestPlayers
        let playerMentionsBestGK = ""
        let playerMentionsBestDF = ""
        let playerMentionsBestMD = ""
        let playerMentionsBestFW = ""
        for (p in playersBest) {
            var player = playersBest[p]
            var findMatch = client.playerDatabase.players.filter((e) => e.playerName === player.playerName)[0]
            var discordId = findMatch ? findMatch.discordId : null
            switch (player.position) {
                case "goalkeeper": {
                    playerMentionsBestGK += discordId ? `<@${discordId}> ` : player.playerName + " "
                    break;
                }
                case "defender": {
                    playerMentionsBestDF += discordId ? `<@${discordId}> ` : player.playerName + " "
                    break;
                }
                case "midfielder": {
                    playerMentionsBestMD += discordId ? `<@${discordId}> ` : player.playerName + " "
                    break;
                }
                case "forward": {
                    playerMentionsBestFW += discordId ? `<@${discordId}> ` : player.playerName + " "
                    break;
                }
            }
        }
        const playersWorst = totw.worstPlayers
        let playerMentionsWorstGK = ""
        let playerMentionsWorstDF = ""
        let playerMentionsWorstMD = ""
        let playerMentionsWorstFW = ""
        for (p in playersWorst) {
            var player = playersWorst[p]
            var findMatch = client.playerDatabase.players.filter((e) => e.playerName === player.playerName)[0]
            var discordId = findMatch ? findMatch.discordId : null
            switch (player.position) {
                case "goalkeeper": {
                    playerMentionsWorstGK += discordId ? `<@${discordId}> ` : player.playerName + " "
                    break;
                }
                case "defender": {
                    playerMentionsWorstDF += discordId ? `<@${discordId}> ` : player.playerName + " "
                    break;
                }
                case "midfielder": {
                    playerMentionsWorstMD += discordId ? `<@${discordId}> ` : player.playerName + " "
                    break;
                }
                case "forward": {
                    playerMentionsWorstFW += discordId ? `<@${discordId}> ` : player.playerName + " "
                    break;
                }
            }
        }

        const imgBufferBest = await render({
            type: 'totw',
            data: { week: totw.weekIso, type: "best" }
        })
        const filenameBest = `totw_${totw.weekIso}_best.jpeg`
        const imgattachBest = new AttachmentBuilder(imgBufferBest, { name: filenameBest })
        let embedMsgBest = new client.discord.EmbedBuilder()
            .setTitle("¡Ya tenemos el mejor XI de la semana! (Semana " + totw.weekNumber + ")")
            .addFields(
                { name: "Portería", value: playerMentionsBestGK, inline: false },
                { name: "Defensa", value: playerMentionsBestDF, inline: false },
                { name: "Mediocampo", value: playerMentionsBestMD, inline: false },
                { name: "Delantera", value: playerMentionsBestFW, inline: false }
            )
            .setAuthor(
                { name: 'Ver más en la web', iconURL: 'https://www.casemurocity.org/logo.webp', url: 'https://www.casemurocity.org/totw?semana=' + totw.weekIso }
            )
            .setColor(13110541)
            .setImage('attachment://' + filenameBest)
        await totwBestChannel.send({ embeds: [embedMsgBest], files: [imgattachBest] })

        const imgBufferWorst = await render({
            type: 'totw',
            data: { week: totw.weekIso, type: "worst" }
        })
        const filenameWorst = `totw_${totw.weekIso}_worst.jpeg`
        const imgattachWorst = new AttachmentBuilder(imgBufferWorst, { name: filenameWorst })
        let embedMsgWorst = new client.discord.EmbedBuilder()
            .setTitle("¡Aquí llegan los más cojos de la semana! (Semana " + totw.weekNumber + ")")
            .addFields(
                { name: "Portería", value: playerMentionsWorstGK || "N/A", inline: false },
                { name: "Defensa", value: playerMentionsWorstDF || "N/A", inline: false },
                { name: "Mediocampo", value: playerMentionsWorstMD || "N/A", inline: false },
                { name: "Delantera", value: playerMentionsWorstFW || "N/A", inline: false }
            )
            .setAuthor(
                { name: 'Ver más en la web', iconURL: 'https://www.casemurocity.org/logo.webp', url: 'https://www.casemurocity.org/totw?semana=' + totw.weekIso }
            )
            .setColor(13110541)
            .setImage('attachment://' + filenameWorst)
        await totwWorstChannel.send({ embeds: [embedMsgWorst], files: [imgattachWorst] })

        console.info("[Event Listener] 'totw.new' hook: Message sended")
    } catch (e) {
        console.error("[Event Listener] 'totw.new' hook: ", e)
    }
}

module.exports = {
    handle
}