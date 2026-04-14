
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, ButtonStyle, TextInputStyle } = require('discord.js');
const logger = require('../../function/log');
const { getUsers, getEggs, getNodes, getUser, getEgg, getNode, getAllocation, getAllocations } = require('../../function/prisma');
const { serverCreator } = require('../../function/pterodactyl');
const { all } = require('axios');

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
            allocations: 1,
            ports: [interaction.options.getInteger('port')],
            backups: 0,
            resources: {
                ram: 512,
                disk: 10240,
                cpu: 100
            },
        }

        let allocationInUsed = false, allocationCreated = false, cancelled = false;

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
            .setDescription(`Creating server **${config.name}** owned by **${user.username}**`)
            .addFields(
                { name: 'Resources', value: `**RAM:** \`${config.resources.ram} MB\`\n**Disk:** \`${config.resources.disk} MB\`\n**CPU:** \`${config.resources.cpu}%\`` },
                { name: 'Config', value: `**Egg Name:** \`${egg.raw.egg.name}\`\n**Node Name:** \`${node.name}\`` },
                { name: 'Feature Limits', value: `**Databases:** \`${config.database}\`\n**Backups:** \`${config.backups}\`\n**Allocations:** \`${config.allocations}\`` },
                { name: 'Networking', value: `**Main Port:** \`${config.ports[0]}\`` + (!allocationCreated ? ' (to create)' : '') + (config.ports.length > 1 ? `${config.ports.slice(1).map(p => `\n**Additional Port:** \`${p}\``).join('')}` : '') }
            )
            .setTimestamp();

        const confirmBtn = new ButtonBuilder()
            .setCustomId('server_confirm_create')
            .setStyle(ButtonStyle.Success)
            .setLabel('Create Server')
            .setDisabled(allocationInUsed)

        const cancelBtn = new ButtonBuilder()
            .setCustomId('cancel_create')
            .setStyle(ButtonStyle.Danger)
            .setLabel('Cancel')
            .setDisabled(cancelled)

        const editResourcesBtn = new ButtonBuilder()
            .setCustomId('edit_resources')
            .setStyle(ButtonStyle.Secondary)
            .setLabel('Edit Resources')
            .setDisabled(allocationInUsed)

        const editNetworkBtn = new ButtonBuilder()
            .setCustomId('edit_network')
            .setStyle(ButtonStyle.Secondary)
            .setLabel('Edit Network')
            .setDisabled(cancelled)

        const editFeatureBtn = new ButtonBuilder()
            .setCustomId('edit_feature')
            .setStyle(ButtonStyle.Secondary)
            .setLabel('Edit Features')
            .setDisabled(allocationInUsed)

        const row1 = new ActionRowBuilder().setComponents([editResourcesBtn, editNetworkBtn, editFeatureBtn])
        const row2 = new ActionRowBuilder().setComponents([confirmBtn, cancelBtn])


        await interaction.editReply({ embeds: [embed], components: [row1, row2] })

        const collector = interaction.channel.createMessageComponentCollector({ time: 300_000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return await i.reply({ content: 'You cannot interact with this button', ephemeral: true })

            switch (i.customId) {
                case 'edit_resources':
                    await editResources(i)
                    break;
                case 'edit_network':
                    await editNetwork(i)
                    break;
                case 'edit_feature':
                    await editFeature(i)
                    break;
                case 'server_confirm_create':
                    cancelled = true;
                    allocationInUsed = true;
                    await createServer(i);
                    await updateEmbed();
                    collector.stop('confirmed')
                    break;
                case 'cancel_create':
                    cancelled = true;
                    allocationInUsed = true;
                    await updateEmbed();
                    await i.deferUpdate()
                    collector.stop('cancelled')
                    break;
            }
        })

        /**
         * 
         * @param {import('discord.js').ChatInputCommandInteraction} inter 
         */

        async function createServer(inter) {
            await inter.deferReply()

            const create = await serverCreator(config)
            if (!create.success) {
                const embed = new EmbedBuilder()
                    .setTitle('Server Creation Failed')
                    .setDescription(`Failed to create server **${config.name}**\nError: \`${create.error}\``)
                    .setColor('Red')
                    .setTimestamp()

                return await inter.editReply({ embeds: [embed], components: [] })
            }

            const embed = new EmbedBuilder()
                .setTitle('Server Created')
                .setDescription(`Server **${config.name}** created successfully.`)
                .setColor('Green')
                .setTimestamp()

            await inter.editReply({ embeds: [embed], components: [] })
        }

        async function editResources(inter) {
            const modal = new ModalBuilder()
                .setCustomId('edit_resources_modal')
                .setTitle('Edit Resources')
                .addLabelComponents(builder => builder
                    .setLabel('RAM (MB)')
                    .setTextInputComponent(option => option
                        .setCustomId('ram_input')
                        .setStyle(TextInputStyle.Short)
                        .setValue(config.resources.ram.toString())
                    )
                )
                .addLabelComponents(builder => builder
                    .setLabel('Disk (MB)')
                    .setTextInputComponent(option => option
                        .setCustomId('disk_input')
                        .setStyle(TextInputStyle.Short)
                        .setValue(config.resources.disk.toString())
                    )
                )
                .addLabelComponents(builder => builder
                    .setLabel('CPU (%)')
                    .setTextInputComponent(option => option
                        .setCustomId('cpu_input')
                        .setStyle(TextInputStyle.Short)
                        .setValue(config.resources.cpu.toString())
                    )
                )

            await inter.showModal(modal)

            const modalInter = await inter.awaitModalSubmit({
                time: 300_000,
                filter: m => m.customId === 'edit_resources_modal' && m.user.id === interaction.user.id
            }).catch(() => null);

            if (!modalInter) return;

            const ram = Number(modalInter.fields.getTextInputValue('ram_input'));
            const disk = Number(modalInter.fields.getTextInputValue('disk_input'));
            const cpu = Number(modalInter.fields.getTextInputValue('cpu_input'));

            if (!Number.isFinite(ram) || !Number.isFinite(disk) || !Number.isFinite(cpu)) {
                return await modalInter.reply({ content: 'Please enter valid numbers', ephemeral: true });
            }

            config.resources.ram = Math.trunc(ram);
            config.resources.disk = Math.trunc(disk);
            config.resources.cpu = Math.trunc(cpu);

            await modalInter.deferUpdate();
            await updateEmbed();
        }

        async function editNetwork(inter) {
            const modal = new ModalBuilder()
                .setCustomId('edit_network_modal')
                .setTitle('Edit Network')
                .addLabelComponents(builder => builder
                    .setLabel('Main Port')
                    .setTextInputComponent(option => option
                        .setCustomId('port_input')
                        .setStyle(TextInputStyle.Short)
                        .setValue(config.ports[0].toString())
                    )
                )
                .addLabelComponents(builders => builders
                    .setLabel('Additional Ports')
                    .setDescription('Use comma to separate multiple ports')
                    .setTextInputComponent(options => options
                        .setCustomId('additional_port_input')
                        .setStyle(TextInputStyle.Short)
                        .setValue(config.ports.slice(1).length ? config.ports.slice(1).join(', ') : '')
                        .setRequired(false)
                    )
                );

            await inter.showModal(modal)

            const modalInter = await inter.awaitModalSubmit({
                time: 300_000,
                filter: m => m.customId === 'edit_network_modal' && m.user.id === interaction.user.id
            }).catch(() => null);

            if (!modalInter) return;

            const port = Number(modalInter.fields.getTextInputValue('port_input'));
            const ports = modalInter.fields.getTextInputValue('additional_port_input').split(',').map(p => Number(p.trim()));

            if (!Number.isFinite(port)) {
                return await modalInter.reply({ content: 'Please enter a valid number', ephemeral: true });
            }

            if (!ports[0]) config.ports[0] = port;
            else config.ports = [config.ports[0], ...ports]

            if (config.ports.length > config.allocations) config.allocations = config.ports.length

            await modalInter.deferUpdate();
            await updateEmbed();
        }

        async function editFeature(inter) {
            const modal = new ModalBuilder()
                .setCustomId('edit_feature_modal')
                .setTitle('Edit Features')
                .addLabelComponents(builder => builder
                    .setLabel('Databases')
                    .setTextInputComponent(option => option
                        .setCustomId('database_input')
                        .setStyle(TextInputStyle.Short)
                        .setValue(config.database.toString())
                    )
                )
                .addLabelComponents(builder => builder
                    .setLabel('Backups')
                    .setTextInputComponent(option => option
                        .setCustomId('backup_input')
                        .setStyle(TextInputStyle.Short)
                        .setValue(config.backups.toString())
                    )
                )
                .addLabelComponents(builder => builder
                    .setLabel('Allocations')
                    .setTextInputComponent(option => option
                        .setCustomId('allocation_input')
                        .setStyle(TextInputStyle.Short)
                        .setValue(config.allocations.toString())
                    )
                )

            await inter.showModal(modal)

            const modalInter = await inter.awaitModalSubmit({
                time: 300_000,
                filter: m => m.customId === 'edit_feature_modal' && m.user.id === interaction.user.id
            }).catch(() => null);

            if (!modalInter) return;

            const database = Number(modalInter.fields.getTextInputValue('database_input'));
            const backups = Number(modalInter.fields.getTextInputValue('backup_input'));
            const allocations = Number(modalInter.fields.getTextInputValue('allocation_input'));

            if (!Number.isFinite(database) || !Number.isFinite(backups) || !Number.isFinite(allocations)) {
                return await modalInter.reply({ content: 'Please enter valid numbers', ephemeral: true });
            }

            config.database = database;
            config.backups = backups;
            config.allocations = allocations;

            await modalInter.deferUpdate();
            await updateEmbed();
        }

        async function updateEmbed() {
            embed.setFields(
                { name: 'Resources', value: `**RAM:** \`${config.resources.ram} MB\`\n**Disk:** \`${config.resources.disk} MB\`\n**CPU:** \`${config.resources.cpu}%\`` },
                { name: 'Config', value: `**Egg Name:** \`${egg.raw.egg.name}\`\n**Node Name:** \`${node.name}\`` },
                { name: 'Feature Limits', value: `**Databases:** \`${config.database}\`\n**Backups:** \`${config.backups}\`\n**Allocations:** \`${config.allocations}\`` },
                { name: 'Networking', value: `**Main Port:** \`${config.ports[0]}\`` + (!allocationCreated ? ' (to create)' : '') + (config.ports.length > 1 ? `${config.ports.slice(1).map(p => `\n**Additional Port:** \`${p}\``).join('')}` : '') }
            )

            const allocation = await getAllocations(parseInt(config.node), parseInt(config.ports[0]))

            allocationInUsed = false, allocationCreated = false;

            if (allocation.length > 0) {
                allocationCreated = true
                if (allocation[0].server_id) allocationInUsed = true
            }

            confirmBtn.setDisabled(allocationInUsed)
            editResourcesBtn.setDisabled(allocationInUsed)
            editFeatureBtn.setDisabled(allocationInUsed)
            editNetworkBtn.setDisabled(cancelled)
            confirmBtn.setDisabled(cancelled)
            cancelBtn.setDisabled(cancelled)

            await interaction.editReply({ embeds: [embed], components: [row1, row2] })
        }
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
