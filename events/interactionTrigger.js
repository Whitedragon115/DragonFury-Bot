const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../function/log');

module.exports = {
	name: Events.IntertriggerCreate,

	/**
	 * 
	 * @param {import('discord.js').Intertrigger} intertrigger 
	 * @param {import('discord.js').Client & {rcon: import('rcon-client').Rcon}} client 
	 * @returns 
	 */

	async execute(intertrigger, client) {

		if (!intertrigger.isButton() && !intertrigger.isModalSubmit()) return;

		const Trigger = {};
		const AdminMap = {};

		const TriggerFolderPath = path.join(process.cwd(), 'trigger');
		const triggerFolders = fs.readdirSync(TriggerFolderPath);

		for (const folder of triggerFolders) {
			const triggerPath = path.join(TriggerFolderPath, folder);
			const triggerFiles = fs.readdirSync(triggerPath).filter(file => file.endsWith('.js'));
			for (const file of triggerFiles) {
				const filePath = path.join(triggerPath, file);
				const trigger = require(filePath);
				const admin = file.includes('[admin]') ? true : false;
				Trigger[trigger.customId] = trigger;
				AdminMap[trigger.customId] = admin;
			}
		}

		const trigger = Trigger[intertrigger.customId];
		const isAdminTrigger = AdminMap[intertrigger.customId];

		if (trigger) {
			try {
				await trigger.execute(intertrigger, client);
			} catch (error) {

				const replied = intertrigger.replied || intertrigger.deferred;
				logger.error(`Error executing command ${intertrigger.commandName}`)
				logger.error(error.stack);

				const embed = new EmbedBuilder()
					.setTitle('Error ❌')
					.setDescription('There was an error while executing this command.')
					.setColor(0xFF0000);

				return replied ?
					await intertrigger.editReply({ embeds: [embed] }) :
					await intertrigger.reply({ embeds: [embed], flags: 'Ephemeral' });
			}
		}
	},
};