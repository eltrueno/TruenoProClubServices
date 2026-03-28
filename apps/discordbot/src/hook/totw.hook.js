const { AttachmentBuilder } = require("discord.js")
const { render } = require("@trueno-proclub-services/imagerenderer-client")
require('dotenv').config();

async function handle(client, totw) {
    try {
        console.log("[Event Listener] 'totw.new' event recieved")
        const totwBestChannels = client.config.totwBestChannelsID.map(id => client.channels.cache.get(id)).filter(c => !!c)
        const totwWorstChannels = client.config.totwWorstChannelsID.map(id => client.channels.cache.get(id)).filter(c => !!c)
        if (totwBestChannels.length === 0 || totwWorstChannels.length === 0) {
            console.error("[Event Listener] 'totw.new' hook: One or more channels not found")
            return
        }

        const playersBest = totw.bestPlayers.sort((a, b) => b.avgRating - a.avgRating)
        let playerMentionsBest = ""
        var player = playersBest[0]
        var findMatch = client.playerDatabase.players.filter((e) => e.playerName === player.playerName)[0]
        var discordId = findMatch ? findMatch.discordId : null
        playerMentionsBest += discordId ? `<@${discordId}> ` : player.playerName + " "

        const playersWorst = totw.worstPlayers.sort((a, b) => a.avgRating - b.avgRating)
        let playerMentionsWorst = ""
        var player = playersWorst[0]
        var findMatch = client.playerDatabase.players.filter((e) => e.playerName === player.playerName)[0]
        var discordId = findMatch ? findMatch.discordId : null
        playerMentionsWorst += discordId ? `<@${discordId}> ` : player.playerName + " "

        const imgBufferBest = await render({
            type: 'totw',
            data: { week: totw.weekIso, type: "best" }
        })
        const filenameBest = `totw_${totw.weekIso}_best.jpeg`
        const imgattachBest = new AttachmentBuilder(imgBufferBest, { name: filenameBest })
        let embedMsgBest = new client.discord.EmbedBuilder()
            .setTitle("¡Ya tenemos el mejor XI de la semana! (Semana " + totw.weekNumber + ")")
            .addFields(
                {
                    name: "El mejor jugador de la semana es: ",
                    value: playerMentionsBest + " con una valoración de ***" + totw.bestPlayers[0].avgRating.toFixed(2) + "***", inline: false
                }
            )
            .setAuthor(
                { name: 'Ver más en la web', iconURL: 'https://www.casemurocity.org/logo.webp', url: 'https://www.casemurocity.org/totw?semana=' + totw.weekIso }
            )
            .setColor(13110541)
            .setImage('attachment://' + filenameBest)
        for (const channel of totwBestChannels) {
            try {
                await channel.send({ embeds: [embedMsgBest], files: [imgattachBest] })
            } catch (e) {
                console.error("[Event Listener] 'totw.new' hook: Error sending to channel", channel?.id, e)
            }
        }

        const imgBufferWorst = await render({
            type: 'totw',
            data: { week: totw.weekIso, type: "worst" }
        })
        const filenameWorst = `totw_${totw.weekIso}_worst.jpeg`
        const imgattachWorst = new AttachmentBuilder(imgBufferWorst, { name: filenameWorst })
        let embedMsgWorst = new client.discord.EmbedBuilder()
            .setTitle("¡Aquí llegan los más cojos de la semana! (Semana " + totw.weekNumber + ")")
            .addFields(
                {
                    name: "El peor jugador de la semana es: ",
                    value: playerMentionsWorst + " con una valoración de ***" + totw.worstPlayers[0].avgRating.toFixed(2) + "***", inline: false
                }
            )
            .setAuthor(
                { name: 'Ver más en la web', iconURL: 'https://www.casemurocity.org/logo.webp', url: 'https://www.casemurocity.org/totw?semana=' + totw.weekIso }
            )
            .setColor(13110541)
            .setImage('attachment://' + filenameWorst)
        for (const channel of totwWorstChannels) {
            try {
                await channel.send({ embeds: [embedMsgWorst], files: [imgattachWorst] })
            } catch (e) {
                console.error("[Event Listener] 'totw.new' hook: Error sending to channel", channel?.id, e)
            }
        }

        console.info("[Event Listener] 'totw.new' hook: Message sended")
    } catch (e) {
        console.error("[Event Listener] 'totw.new' hook: ", e)
    }
}

module.exports = {
    handle
}