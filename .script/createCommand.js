const fs = require('fs');
const path = require('path');
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

const template = `
const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const logger = require('../../function/log');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('%COMMAND_NAME%')
        .setDescription('%COMMAND_DESCRIPTION%'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {

        
    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {

        
    }
};
`;

async function askIfMissing(question, value, rl) {
    if (value && value.trim()) {
        return value.trim();
    }

    let answer = '';
    while (!answer) {
        answer = (await rl.question(question)).trim();
    }

    return answer;
}

function printHelp() {
    console.log('Create a Discord command file.');
    console.log('');
    console.log('Usage:');
    console.log('  npm run addcmd <filename> <folder> <command-name> <description>');
    console.log('  npm run addcmd');
    console.log('');
    console.log('Arguments:');
    console.log('  filename      Name of the file to create (with or without .js)');
    console.log('  folder        Folder inside commands/ (example: admin, tools)');
    console.log('  command-name  Slash command name');
    console.log('  description   Slash command description');
    console.log('');
    console.log('Options:');
    console.log('  h, help    Show this help message');
}

async function main() {
    if (process.argv.includes('help') || process.argv.includes('h')) {
        printHelp();
        return;
    }

    const [, , fileNameArg, folderArg, commandNameArg, ...descriptionParts] = process.argv;
    const descriptionArg = descriptionParts.join(' ').trim();

    const rl = readline.createInterface({ input, output });

    try {
        const rawFileName = await askIfMissing('Filename: ', fileNameArg, rl);
        const finalFolder = await askIfMissing('Folder: ', folderArg, rl);
        const finalCommandName = await askIfMissing('Command name: ', commandNameArg, rl);
        const finalDescription = await askIfMissing('Description: ', descriptionArg, rl);

        const fileName = rawFileName.endsWith('.js') ? rawFileName : `${rawFileName}.js`;
        const commandFolderPath = path.join(__dirname, '..', 'commands', finalFolder);
        const outputPath = path.join(commandFolderPath, fileName);

        if (fs.existsSync(outputPath)) {
            console.log(`File already exists: ${outputPath}`);
            process.exitCode = 1;
            return;
        }

        fs.mkdirSync(commandFolderPath, { recursive: true });

        const commandFileContent = template
            .replace(/%COMMAND_NAME%/g, finalCommandName)
            .replace(/%COMMAND_DESCRIPTION%/g, finalDescription.replace(/'/g, "\\'"));

        fs.writeFileSync(outputPath, commandFileContent, 'utf8');
        console.log(`Created command file: ${outputPath}`);
    } finally {
        rl.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});