import './lib/setup';
import { LogLevel, SapphireClient } from '@sapphire/framework';
import { IntentsBitField } from 'discord.js';
import { PrismaClient } from '../generated';
import { MetroAPI } from './lib/metro/MetroAPI';

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
	},
	loadMessageCommandListeners: true
});

client.prisma = new PrismaClient();
client.metro = new MetroAPI();

const main = async () => {
	try {
		client.logger.info('Iniciando sesión...');
		await client.login();
		client.logger.info('Inicio de sesión exitoso!');

		client.logger.info('[DB] Conectando a la base de datos...');
		await client.prisma.$connect();
		client.logger.info('[DB] Conexión a la base de datos exitosa!');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(-1);
	}
};

void main();

declare module 'discord.js' {
	interface Client {
		prisma: PrismaClient;
		metro: MetroAPI;
	}
}
