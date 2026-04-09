const { Events } = require('discord.js');
const { color } = require('console-log-colors');
const logger = require('../function/log');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        
        const guild = client.guilds.cache.get(process.env.GUILDID);
        const memberCount = guild.memberCount;
        const login_string = `${color.green('Login Bot : ')} ${color.yellow(client.user.tag)}  ║  ${color.green('BotID :')} ${color.yellow(process.env.CLIENTID)}  ║  ${color.green('Server :')} ${color.yellow(guild.name)}  ║  ${color.green('Server Member :')} ${color.yellow(memberCount)}`
        logger.section(login_string)

    },
};