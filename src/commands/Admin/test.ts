import { getLineStatusEmbeds } from '#utils/metro/getLineStatusEmbeds';
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { Message } from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	description: 'Comandos de testing para MetroBot',
	runIn: ['GUILD_TEXT'],
	preconditions: ['OwnerOnly'],
	subcommands: [
		{
			type: 'group',
			name: 'embeds',
			entries: [{ name: 'metroupdates', messageRun: 'metroupdates' }]
		}
	]
})
export class UserCommand extends Subcommand {
	public async metroupdates(message: Message) {
		if (!message.channel.isSendable()) return;

		message.channel.send({ embeds: await getLineStatusEmbeds() });
	}
}
