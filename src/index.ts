import './lib/setup';
import { LogLevel, SapphireClient } from '@sapphire/framework';
import { IntentsBitField } from 'discord.js';

const client = new SapphireClient({
	defaultPrefix: 'm!',
	caseInsensitiveCommands: true,
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent
	],
	logger: {
		level: LogLevel.Debug
	}
});

const main = async () => {
	try {
		client.logger.info('Iniciando sesión...');
		await client.login();
		client.logger.info('Inicio de sesión exitoso!');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(-1);
	}
};

void main();
