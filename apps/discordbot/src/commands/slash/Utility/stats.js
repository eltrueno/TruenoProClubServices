const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');
const { findByDiscordId } = require('../../../utils/players');
require('dotenv').config();

const API_URL = process.env.API_URL || "https://api.casemurocity.org"
const WWW_URL = process.env.WWW_URL || "https://www.casemurocity.org"

const SUM_FIELDS = ["gamesPlayed", "goals", "assists", "redCards", "manOfTheMatch", "ratingSum"]

module.exports = {
    name: "stats",
    usage: "/stats o /stats [jugador]",
    options: [
        {
            name: 'jugador',
            description: 'Jugador del que deseas ver sus estadísticas',
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    category: "Utility",
    description: "Consulta tus estadísticas o las de otro jugador",
    // Desactivado a propósito: el loader no lo registra mientras esté a true
    disabled: true,
    ownerOnly: false,
    run: async (client, interaction) => {
        const jugadorOption = interaction.options.getUser("jugador");
        await interaction.reply({
            content: jugadorOption ? ":hourglass_flowing_sand: Obteniendo estadísticas del jugador..." : ":hourglass_flowing_sand: Obteniendo tus estadísticas...",
            flags: MessageFlags.Ephemeral
        })

        let embedMsg

        try {
            const discordId = jugadorOption ? jugadorOption.id : interaction.user.id
            const entry = findByDiscordId(client, discordId)
            if (!entry || !entry.playerId) {
                if (!jugadorOption) throw new Error("¡No eres un jugador del club! Debes especificar un jugador")
                throw new Error("Jugador no encontrado, por favor especifica un jugador que juegue en el club")
            }

            const apiResponse = await fetch(`${API_URL}/members/${entry.playerId}`)
            if (apiResponse.status !== 200) throw new Error("Error conectando con la API")

            const { response: profile } = await apiResponse.json()
            if (!profile || !profile.member) throw new Error("Jugador no encontrado en la API")

            // Stats oficiales sumando todas las posiciones
            const totals = Object.fromEntries(SUM_FIELDS.map((f) => [f, 0]))
            for (const s of profile.stats.official || []) {
                for (const f of SUM_FIELDS) totals[f] += Number(s[f]) || 0
            }
            const ratingAve = totals.gamesPlayed > 0 ? (totals.ratingSum / totals.gamesPlayed).toFixed(2) : "-"
            const member = profile.member

            embedMsg = new client.discord.EmbedBuilder()
                .setTitle('Estadísticas de ' + member.playerName)
                .setDescription((member.proName || "Desconocido") + " (" + (member.proOverall || "¿?") + ")")
                .setAuthor(
                    { name: 'Ver más en la web', iconURL: `${WWW_URL}/escudo2024.png`, url: `${WWW_URL}/jugador?id=${member.playerId}` }
                )
                .setColor(16776960)
                .addFields(
                    { name: 'Partidos jugados', value: "" + totals.gamesPlayed, inline: true },
                    { name: 'Goles', value: "" + totals.goals, inline: true },
                    { name: 'Asistencias', value: "" + totals.assists, inline: true },
                    { name: 'Tarjetas Rojas', value: "" + totals.redCards, inline: true },
                    { name: 'Valoración media', value: "" + ratingAve, inline: true },
                    { name: 'Mejor del partido', value: "" + totals.manOfTheMatch, inline: true }
                )
            if (member.imageUrl) embedMsg.setThumbnail(member.imageUrl)
        } catch (e) {
            console.error(e)
            embedMsg = new client.discord.EmbedBuilder()
                .setTitle('Ha ocurrido un error: ')
                .setDescription(e.message)
                .setAuthor(
                    { name: 'Casemuro City', iconURL: `${WWW_URL}/escudo2024.png` }
                )
                .setColor(15548997)
        } finally {
            await interaction.editReply({
                content: "",
                embeds: [embedMsg],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
