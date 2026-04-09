const fs = require('fs');
const path = require('path');

const { Events, EmbedBuilder } = require('discord.js');
const { AdminRoleId } = require('../config.json')
const logger = require('../function/log')

const Command = {};
LoadCommandFolder();

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * @param {import('discord.js').Interaction} interaction
	 * @param {import('discord.js').ChatInputCommandInteraction} interaction
	 * @param {import('discord.js').Client} client
	 */

	async execute(interaction, client) {


		if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) return logger.warn(`No command matching ${interaction.commandName} was found.`);

		try {

			const commandFolder = Command[interaction.commandName].folder

			if (await (commandFolder.startsWith('admin-') || commandFolder == 'admin') && !interaction.member.roles.cache.some(rl => rl.id == AdminRoleId)) {
				const embed = new EmbedBuilder()
					.setTitle('Permission Denied ❌')
					.setDescription('You do not have permission to use this command.')
					.setColor(0xFF0000);

				return await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
			}

			if (interaction.isAutocomplete()) return await command.autocomplete(interaction, client)
			if (interaction.isChatInputCommand()) return await command.execute(interaction, client)

		} catch (error) {
			const replied = interaction.replied || interaction.deferred;

			logger.error(`Error executing command ${interaction.commandName}`)
			logger.error(error.stack);

			const embed = new EmbedBuilder()
				.setTitle('Error ❌')
				.setDescription('There was an error while executing this command.')
				.setColor(0xFF0000);

			return replied ?
				await interaction.editReply({ embeds: [embed] }) :
				await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });

		}

	},
};

function LoadCommandFolder() {
	const CommandFolderPath = path.join(__dirname, '..', 'commands');
	const commandFolders = fs.readdirSync(CommandFolderPath);

	for (const folder of commandFolders) {
		const commandPath = path.join(CommandFolderPath, folder);
		const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
		for (const file of commandFiles) {
			const filePath = path.join(commandPath, file);
			const command = require(filePath);
			command.folder = folder;
			Command[command.data.name] = command;
		}
	}
}