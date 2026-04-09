const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,

    /**
     * 
     * @param {import('discord.js').Message} message 
     * @param {import('discord.js').Client} client 
     */

    async execute(message, client) {
        const commandRegex = /^\[.*\]$/;

        if (message.author.bot) return;
        if (!commandRegex.test(message.content)) return;
        const commandName = message.content.slice(1, -1).trim().toLowerCase().split(' ');
        const cmd = commandName.shift();

        switch (cmd) {
            case 'Example':
                return someFunction()
            default:
                return;
        }

    }
}
