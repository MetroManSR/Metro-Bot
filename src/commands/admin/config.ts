import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, Message } from 'discord.js';
import { SimpleEmbed } from '#templates/embeds/info/SimpleEmbed';

@ApplyOptions<Subcommand.Options>({
	description: 'Comandos de configuracion para MetroBot',
	runIn: ['GUILD_TEXT'],
	preconditions: ['OwnerOnly'],
	subcommands: [
		{
			type: 'group',
			name: 'metro',
			entries: [{ name: 'updates', messageRun: 'updates' }]
		}
	]
})
export class UserCommand extends Subcommand {
	public async updates(message: Message) {
		if (!message.channel.isSendable()) {
			return;
		}

		const channelSelectionRow = new ActionRowBuilder<ChannelSelectMenuBuilder>() //
			.addComponents(
				new ChannelSelectMenuBuilder() //
					.setCustomId('metro-status:channel-select')
					.setPlaceholder('Selecciona un canal de la lista')
					.addChannelTypes(ChannelType.GuildText)
			);

		message.channel.send({
			embeds: [new SimpleEmbed('Establecer el canal de actualizaciones de estado', '⚙️ Canal de Actualizaciones (Metro)')],
			components: [channelSelectionRow]
		});
	}
}
