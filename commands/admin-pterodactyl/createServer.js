
const { SlashCommandBuilder, EmbedBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, SectionBuilder } = require('@discordjs/builders');
const logger = require('../../function/log');
const { getUsers, getEggs, getNodes, getUser, getEgg, getNode, getAllocation, getAllocations } = require('../../function/prisma');
const { ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-create')
        .setDescription('Create a new Server')
        .addStringOption(option => option
            .setName('name')
            .setDescription('The name of the server')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('user')
            .setDescription('The user ID of the server owner')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName('image')
            .setDescription('The egg of the server')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName('node')
            .setDescription('The node to create the server on')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option => option
            .setName('port')
            .setDescription('The port to use for the server')
            .setRequired(true)
        )
    ,

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {

        await interaction.deferReply()

        const config = {
            name: interaction.options.getString('name'),
            user: parseInt(interaction.options.getString('user')),
            egg: parseInt(interaction.options.getString('image')),
            database: 0,
            node: parseInt(interaction.options.getString('node')),
            ports: [interaction.options.getInteger('port')],
            backups: 0,
            resources: {
                ram: 1024,
                disk: 10240,
                cpu: 100
            },
        }

        let allocationInUsed = false, allocationCreated = false

        const user = await getUser(parseInt(config.user))
        const egg = await getEgg(parseInt(config.egg))
        const node = await getNode(parseInt(config.node))
        const allocation = await getAllocations(parseInt(config.node), parseInt(config.ports[0]))

        if (allocation.length > 0) {
            allocationCreated = true
            if (allocation[0].server_id) allocationInUsed = true
        }

        const embed = new EmbedBuilder()
            .setTitle('Server Create Confirmation')
            .setDescription(`Creating server with the following configuration:`)
            .addFields(
                { name: 'Basic Info', value: `**Server Name:** ${config.name}\n**Own by** ${user.username}`, inline: true },
                { name: 'Server Config', value: `**Egg Name:** ${egg.raw.egg.name}\n**Node Name:** ${node.name}`, inline: true },
                { name: 'Networking', value: `**Main Port:** ${config.ports[0]}` + (allocationCreated ? ' (Created)' : ''), inline: true },
                { name: 'Resources', value: `**RAM:** ${config.resources.ram} MB\n**Disk:** ${config.resources.disk} MB\n**CPU:** ${config.resources.cpu}%`, inline: true },
                { name: 'Feature Limits', value: `**Databases:** ${config.database}\n**Backups:** ${config.backups}`, inline: true }
            )
            .setTimestamp();

        const confirmText = new TextDisplayBuilder()
            .setContent('# Confirm Server Creation\nClick the button below to confirm the server creation with the above configuration.')

        const confirmBtn = new ButtonBuilder()
            .setCustomId('confirm_create')
            .setStyle(ButtonStyle.Success)
            .setLabel('Create Server')
            .setDisabled(allocationInUsed)

        const section = new SectionBuilder({ components: [confirmText], accessory: confirmBtn })

        const container = new ContainerBuilder()
            .addSectionComponents(section)

        console.log('here')

        await interaction.editReply({ embeds: [embed] })
        await interaction.followUp({ components: [container], flags: MessageFlags.IsComponentsV2 })

    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {
        const focused = interaction.options.getFocused(true)
        const focusedName = focused.name

        switch (focusedName) {
            case 'user':
                return await usersAutocomplete()
            case 'image':
                return await eggsAutocomplete()
            case 'node':
                return await nodesAutocomplete()
            default:
                return await interaction.respond([])
        }

        async function usersAutocomplete() {
            const search = await getUsers(focused.value, focused.value)
            await interaction.respond(
                search.map(user => ({
                    name: `${user.username} | ${user.email}`,
                    value: user.id.toString()
                })).slice(0, 25)
            )
        }

        async function eggsAutocomplete() {
            const search = await getEggs(focused.value)
            await interaction.respond(
                search.map(egg => ({
                    name: `${egg.name}`,
                    value: egg.id.toString()
                })).slice(0, 25)
            )
        }

        async function nodesAutocomplete() {
            const search = await getNodes(focused.value)
            await interaction.respond(
                search.map(node => ({
                    name: `${node.name}`,
                    value: node.id.toString()
                })).slice(0, 25)
            )
        }

    }
};
