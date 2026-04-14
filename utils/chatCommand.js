const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {

        const sender = message.guild.members.cache.get(message.author.id);
        const msg = message.content;

        const commandRegex = /^\[(.+)\]$/;

        if (!commandRegex.test(msg)) return;
        if (message.author.bot) return;
        if (message.channel.type === 'DM') return;
        if (!sender.roles.cache.some((rl) => rl.id == AdminRole)) return;
        const command = msg.match(commandRegex)[1].toLowerCase();
        const args = command.split(' ').slice(1);

        switch (command) {
            case 'ping':
                message.reply(`Pong! my ping to discord is ${message.createdTimestamp - Date.now()}ms.`);
                break;
            default:
                
        }

    },
};
