const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../function/log');

module.exports = {
	name: Events.InteractionCreate,

	/**
	 * 
	 * @param {import('discord.js').Interaction} interaction 
	 * @param {import('discord.js').Client & {rcon: import('rcon-client').Rcon}} client 
	 * @returns 
	 */

	async execute(interaction, client) {

		if (!interaction.isButton() && !interaction.isModalSubmit()) return;
		const pageMatch = interaction.customId && interaction.customId.match(/^page\:(\d+)_/);
		if (!pageMatch) return;
		const page = parseInt(pageMatch[1]);
		interaction.customId = interaction.customId.replace(/^page\:(\d+)_/, 'page_');
		
		const Action = {};
		const AdminMap = {};

		const ActionFolderPath = path.join(process.cwd(), 'trigger');
		const actionFolders = fs.readdirSync(ActionFolderPath);

		for (const folder of actionFolders) {
			const actionPath = path.join(ActionFolderPath, folder);
			const actionFiles = fs.readdirSync(actionPath).filter(file => file.endsWith('.js'));
			for (const file of actionFiles) {
				const filePath = path.join(actionPath, file);
				const action = require(filePath);
				const admin = file.includes('[admin]') ? true : false;
				Action[action.customId] = action;
				AdminMap[action.customId] = admin;
			}
		}

		const action = Action[interaction.customId];
		const isAdminAction = AdminMap[interaction.customId];

		if (action) {
			try {
				await action.execute(interaction, client, page);
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
		}
	},
};