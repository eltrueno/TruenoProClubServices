const { AttachmentBuilder } = require("discord.js")
const { render } = require("@trueno-proclub-services/imagerenderer-client")
require('dotenv').config();

async function handle(client, achievement) {
    try {
        console.log("[Event Listener] 'memberachievement' event recieved")
        const announcementsChannel = await client.channels.cache.get("1134219726780911667")

        const player = achievement.player
        const findMatch = client.playerDatabase.players.filter((e) => e.playerName === player.playerName)[0]
        const discordId = findMatch ? findMatch.discordId : null
        const playerMention = discordId ? `<@${discordId}>` : player.playerName

        const encoraugements = ['¡Increible!', '¡Imparable!', '¡Impresionante!', '¡Menudo logro!']
        let achievementType = ""

        switch (achievement.type) {
            case 'played': {
                achievementType = "partidos jugados"
                break;
            }
            case 'goals': {
                achievementType = "goles"
                break;
            }
            case 'assists': {
                achievementType = "asistencias"
                break;
            }
            case 'redcards': {
                achievementType = "tarjetas rojas"
                break;
            }
            case 'passes': {
                achievementType = "pases realizados"
                break;
            }
            case 'motm': {
                achievementType = "mejor del partido"
                break;
            }
        }

        const filename = `playerachievement_${player.playerName}_${achievement.type}_${achievement.reached}.jpeg`
        const imgBuffer = await render({
            type: 'player-achievement',
            data: {
                playerName: player.playerName,
                type: achievement.type,
                reached: achievement.reached
            }
        })
        const imgattach = new AttachmentBuilder(imgBuffer, { name: filename })
        let embedMsg = new client.discord.EmbedBuilder()
            .setTitle(encoraugements[Math.floor(Math.random() * encoraugements.length)])
            .setDescription(
                "\n\nNuestro jugador " + playerMention + " ha alcanzado esta increíble cifra de " + achievementType +
                "\n\n¡A por más!"
            )
            .setAuthor(
                { name: 'Ver más en la web', iconURL: 'https://www.caracantosmeaos.club/escudo2024.png', url: 'https://www.caracantosmeaos.club/plantilla/' + player.playerName }
            )
            .setColor(16776960)
            .setImage('attachment://' + filename)

        await announcementsChannel.send({ embeds: [embedMsg], files: [imgattach] })
        console.info("[Event Listener] 'memberachievement' hook: Message sended")
    } catch (e) {
        console.error("[Event Listener] 'memberachievement' hook: " + e)
    }
}

module.exports = {
    handle
}