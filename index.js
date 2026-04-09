const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { color } = require('console-log-colors')
const { execSync } = require('child_process');

const path = require('path');
const fs = require('fs');
const logger = require('./function/log');

require('dotenv').config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent,
	]
});

async function configCheck() {
	let errorCount = 0;
	logger.box('Config Check');

	//====== Check Config


	//====== Check End

	if (errorCount > 0) {
		logger.line();
		logger.error(`Config check failed with ${errorCount} error(s).`);
		return false;
	} else {
		logger.success('Config check passed with no errors.');
		return true;
	}
}

async function prismaGenerate(){
	try {
		logger.box('Prisma Client Generation');
		logger.info('Generating Prisma Client...');

		execSync('npx prisma generate', { 
			stdio: 'inherit',
			cwd: __dirname 
		});

		logger.success('Prisma Client generated successfully.');
	} catch (error) {
		logger.error('Failed to generate Prisma Client:');
		console.error(error);
		process.exit(1);
	}
}

async function init() {

	// Generate Prisma Client
	// await prismaGenerate();

	// Config Check
	const isConfigValid = await configCheck();
	if (!isConfigValid) {
		logger.error('Initialization aborted due to config errors.');
		process.exit(1);
	}

	
	logger.line()

	//==== initialize count

	let commandCount = 0;

	const buttonActions = {};
	const ActionFolderPath = path.join(process.cwd(), 'trigger');
	const actionFolders = fs.readdirSync(ActionFolderPath);
	const maxActionLength = Math.max(...actionFolders.map(folder => folder.length));

	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath); 
	const maxfolderLength = Math.max(...commandFolders.map(folder => folder.length));

	const maxlength = Math.max(maxfolderLength, maxActionLength);

	//==== Load Commands Interaction

	client.commands = new Collection();
	for (const folder of commandFolders) {

		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

		let loadstring = "";
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				command.admin = folder.toLowerCase() === 'admin' ? true : false;
				client.commands.set(command.data.name, command);
				loadstring += color.gray('│ ') + color.cyan(`[${file}] `);
				commandCount++;
			} else {
				console.log(`\─x1B[31m[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.\x1B[0m`);
			}
		}

		const folderNameSpaces = ' '.repeat(maxlength - folder.length);
		console.log(color.grey('⟐ ') + color.green('Load ') + color.c75(`[${folder}]${folderNameSpaces} » `) + loadstring);
	}
	let _amount = '─'.repeat(maxlength + 16);
	console.log(color.gray(`${_amount}${color.gray(`┤                     [Successfully loaded ${commandCount} commands]`)}`))

	//==== Load Other Interaction

	let actionCount = 0;
	for (const folder of actionFolders) {
		const actionPath = path.join(ActionFolderPath, folder);
		const actionFiles = fs.readdirSync(actionPath).filter(file => file.endsWith('.js'));
		let loadstring = "";
		for (const file of actionFiles) {
			const filePath = path.join(actionPath, file);
			const action = require(filePath);
			if ('customId' in action && 'execute' in action) {
				buttonActions[action.customId] = action;
				loadstring += color.gray('│ ') + color.cyan(`[${file}] `);
				actionCount++;
			} else {
				console.log(`\x1B[31m[WARNING] The action at ${filePath} is missing a required "customid" or "execute" property.`);
			}
		}
		const folderNameSpaces = ' '.repeat(maxlength - folder.length);
		console.log(color.grey('⟐ ') + color.green('Load ') + color.c75(`[${folder}]${folderNameSpaces} » `) + loadstring);
	}

	let __amount = '═'.repeat(maxlength + 16);
	console.log(color.gray(`${__amount}${color.gray(`╧═════════════════════[Successfully loaded ${actionCount} trigger]`)}`))
	//===== Load Events

	const eventsPath = path.join(__dirname, 'events');
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

	const loadingMessage = [[], []];
	let eventcount = 0;
	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);
		const eventType = event.once ? '[\x1B[32mOnce\x1B[0m]' : '[\x1B[34mOn\x1B[0m]  ';
		loadingMessage[0].push(`${eventType.padEnd(10)} ${file}`);
		eventcount++;
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args, client));
		} else {
			client.on(event.name, (...args) => event.execute(...args, client));
		}
	}

	const utilPath = path.join(__dirname, 'utils');
	const utilFiles = fs.readdirSync(utilPath).filter(file => file.endsWith('.js'));
	let utilcount = 0;

	for (const file of utilFiles) {
		const filePath = path.join(utilPath, file);
		const event = require(filePath);
		const eventType = event.once ? '[\x1B[32mOnce\x1B[0m]' : '[\x1B[34mOn\x1B[0m]';
		loadingMessage[1].push(`${eventType.padEnd(10)} ${file}`);
		utilcount++;
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args, client));
		} else {
			client.on(event.name, (...args) => event.execute(...args, client));
		}
	}

	console.log(color.yellow('[Loading Events...]                        [Loading Utils...]'));

	for (let i = 0; i < Math.max(eventcount, utilcount); i++) {
		const eventlinespace = 43 - (loadingMessage[0][i]?.length - 9 || 0);
		const space = ' '.repeat(eventlinespace);
		console.log((loadingMessage[0][i] ?? '') + space + (loadingMessage[1][i] || ''))

	}

	//===== Login to Discord

	client.login(process.env.TOKEN);

	//===== Exit Handler

	process.on('SIGINT', async () => {
		logger.warn('Caught interrupt signal, shutting down...');
		process.exit();
	});

	//===== Prevent Process Exit

	process.on('uncaughtException', (error) => {
		logger.error('Uncaught Exception:');
		console.error(error);
		logger.saveErrorLog(error, 'uncaughtException');
		logger.warn('Process will continue running...');
	});

	process.on('unhandledRejection', (reason, promise) => {
		logger.error('Unhandled Rejection at:');
		console.error(promise);
		logger.error('Reason:');
		console.error(reason);
		logger.saveErrorLog(reason, 'unhandledRejection', { promise: String(promise) });
		logger.warn('Process will continue running...');
	});

}

init();

