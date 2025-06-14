import { ButtonInteraction, ChannelSelectMenuInteraction, TextBasedChannel } from 'discord.js';
import { ErrorEmbed } from '../templates/embeds/ErrorEmbed';
import { SimpleEmbed } from '../templates/embeds/SimpleEmbed';
import { container } from '@sapphire/framework';

export async function setNetworkUpdatesChannel(interaction: ChannelSelectMenuInteraction<'cached'> | ButtonInteraction<'cached'>, channelId: string) {
	const channel = (await interaction.guild.channels.fetch(channelId)) as TextBasedChannel;

	if (!channel.isSendable()) {
		interaction.update({ embeds: [new ErrorEmbed('No se pudo enviar el mensaje, revisa los permisos del bot')], components: [] });
		return;
	}

	const message = await channel.send('wooooo embeds');

	await container.prisma.metroStatusMessage.upsert({
		where: { guild_id: interaction.guildId },
		create: {
			guild_id: interaction.guildId,
			channel_id: channelId,
			message_id: message.id,
			api_data_hash: await container.metro.getNetworkStatusHash()
		},
		update: {
			channel_id: channelId, //
			message_id: message.id,
			api_data_hash: await container.metro.getNetworkStatusHash()
		}
	});

	interaction.update({
		embeds: [new SimpleEmbed(`Se estableció ${channel} como canal de actualizaciones`, '✅ Configuración guardada')],
		components: []
	});
}
