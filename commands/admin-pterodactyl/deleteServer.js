
const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const logger = require('../../function/log');
const { getServers, getServer, getUser } = require('../../function/prisma');
const { serverDeleter } = require('../../function/pterodactyl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-delete')
        .setDescription('Delete a Server')
        .addStringOption(option => option
            .setName('server')
            .setDescription('The server to delete')
            .setRequired(true)
            .setAutocomplete(true)
        ),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {

        await interaction.deferReply()
        const serverId = interaction.options.getString('server')

        const serverInfo = await getServer(Number(serverId))
        const ownerUsername = await getUser(serverInfo.owner_id).then(user => user.username)

        await serverDeleter(Number(serverId))

        const embed = new EmbedBuilder()
            .setTitle('Server Deleted')
            .setDescription(`Server with ID \`${serverId}\` deleted successfully.`)
            .addFields(
                { name: 'Server Name', value: serverInfo.name, inline: true },
                { name: 'Owner', value: ownerUsername, inline: true }
            )
            .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {

        const focusedOption = interaction.options.getFocused(true);
        const focusValue = focusedOption.value;

        switch (focusedOption.name) {
            case 'server':
                await server();
                break;
        }

        async function server() {
            const servers = await getServers(focusValue, null, null)

            const list = await Promise.all(
                servers.slice(0, 25).map(async server => {
                    const user = await getUser(server.owner_id)
                    const username = user?.username ?? 'Unknown'

                    return {
                        name: `${server.name} | ${username}`,
                        value: server.id.toString()
                    }
                })
            )

            await interaction.respond(list)
        }

    }
};
