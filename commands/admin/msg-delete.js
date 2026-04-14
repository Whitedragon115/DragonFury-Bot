
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    MessageFlags
} = require('discord.js');
const logger = require('../../function/log');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('message-delete')
        .setDescription('Delete messages')
        .addStringOption(option => option
            .setName('past')
            .setDescription('Delete messages from the past duration')
            .setRequired(true)
            .addChoices(
                { name: 'Past 1 minute', value: '60000' },
                { name: 'Past 5 minutes', value: '300000' },
                { name: 'Past 30 minutes', value: '1800000' },
                { name: 'Past 1 hour', value: '3600000' },
                { name: 'Past 12 hours', value: '43200000' },
                { name: 'Past 24 hours', value: '86400000' },
                { name: 'Past 7 days', value: '604800000' }
            )
        )
        .addUserOption(option => option
            .setName('from_user')
            .setDescription('Delete only messages from this user (leave empty for all messages)')
            .setRequired(false)
        ),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        const channel = interaction.channel;
        if (!channel || !channel.isTextBased() || !('messages' in channel)) {
            return await interaction.reply({
                content: 'This command can only be used in text channels.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
            return await interaction.reply({
                content: 'You need Manage Messages permission to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return await interaction.reply({
                content: 'I need Manage Messages permission to do this.',
                flags: MessageFlags.Ephemeral
            });
        }

        const durationMs = Number(interaction.options.getString('past', true));
        const targetUser = interaction.options.getUser('from_user');
        const cutoff = Date.now() - durationMs;

        const confirmId = `msg_delete_confirm_${interaction.id}`;
        const cancelId = `msg_delete_cancel_${interaction.id}`;

        const confirmButton = new ButtonBuilder()
            .setCustomId(confirmId)
            .setLabel('Confirm Delete')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId(cancelId)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        const preview = new EmbedBuilder()
            .setTitle('Confirm Message Delete')
            .setDescription('Press Confirm Delete to start deleting messages.')
            .addFields(
                { name: 'Past Duration', value: formatDuration(durationMs), inline: true },
                { name: 'From User', value: targetUser ? `${targetUser.tag}` : 'All users', inline: true }
            )
            .setColor('Orange')
            .setTimestamp();

        const replyMessage = await interaction.reply({
            embeds: [preview],
            components: [row],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });

        const collector = channel.createMessageComponentCollector({
            time: 60_000,
            max: 1,
            filter: i => i.message.id === replyMessage.id && i.user.id === interaction.user.id && (i.customId === confirmId || i.customId === cancelId)
        });

        collector.on('collect', async i => {
            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(confirmButton).setDisabled(true),
                ButtonBuilder.from(cancelButton).setDisabled(true)
            );

            if (i.customId === cancelId) {
                await i.update({ content: 'Message delete cancelled.', embeds: [], components: [disabledRow] });
                return;
            }

            await i.update({ content: 'Deleting messages, please wait...', embeds: [], components: [disabledRow] });

            try {
                const deletedCount = await bulkDeleteByFilter(channel, cutoff, targetUser?.id);

                await interaction.editReply({
                    content: `Done. Deleted ${deletedCount} message(s).`,
                    components: [disabledRow]
                });
            } catch (error) {
                logger.error('Error deleting messages');
                logger.error(error.stack);
                await interaction.editReply({
                    content: 'Failed to delete messages. Check bot permissions and try again.',
                    components: [disabledRow]
                });
            }
        });

        collector.on('end', async collected => {
            if (collected.size > 0) return;
            const disabledRow = new ActionRowBuilder().addComponents(
                ButtonBuilder.from(confirmButton).setDisabled(true),
                ButtonBuilder.from(cancelButton).setDisabled(true)
            );

            await interaction.editReply({
                content: 'Confirmation timed out.',
                components: [disabledRow]
            }).catch(() => null);
        });
    },

    // /**
    //  * @param {import('discord.js').AutocompleteInteraction} interaction
    //  * @param {import('discord.js').Client} client
    //  */
    // async autocomplete(interaction, client) {

        
    // }
};

function formatDuration(ms) {
    if (ms === 60000) return '1 minute';
    if (ms === 300000) return '5 minutes';
    if (ms === 1800000) return '30 minutes';
    if (ms === 3600000) return '1 hour';
    if (ms === 43200000) return '12 hours';
    if (ms === 86400000) return '24 hours';
    if (ms === 604800000) return '7 days';
    return `${Math.floor(ms / 1000)} seconds`;
}

async function bulkDeleteByFilter(channel, cutoffTimestamp, targetUserId) {
    let deletedCount = 0;
    let before;
    const now = Date.now();
    const bulkDeleteMaxAge = 14 * 24 * 60 * 60 * 1000;

    while (true) {
        const batch = await channel.messages.fetch({ limit: 100, before });
        if (batch.size === 0) break;

        const shouldStop = batch.every(message => message.createdTimestamp < cutoffTimestamp);

        const deletable = batch.filter(message => {
            if (message.createdTimestamp < cutoffTimestamp) return false;
            if (targetUserId && message.author.id !== targetUserId) return false;
            if (now - message.createdTimestamp > bulkDeleteMaxAge) return false;
            return true;
        });

        if (deletable.size > 0) {
            const deleted = await channel.bulkDelete(deletable, true);
            deletedCount += deleted.size;
        }

        before = batch.last()?.id;
        if (!before || shouldStop) break;
    }

    return deletedCount;
}
