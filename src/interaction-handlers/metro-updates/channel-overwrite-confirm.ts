import { ErrorEmbed } from '#templates/embeds/info/ErrorEmbed';
import { SimpleEmbed } from '#templates/embeds/info/SimpleEmbed';
import { getLineStatusEmbeds } from '#utils/metro/getLineStatusEmbeds';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public override async parse(interaction: ButtonInteraction<'cached'>) {
		if (interaction.customId.startsWith(`metro-updates:${this.name}`)) {
			const [_, __, channelId] = interaction.customId.split(':');

			return this.some(channelId);
		}

		return this.none();
	}

	public async run(interaction: ButtonInteraction<'cached'>, channelId: string) {
		const updatesChannel = interaction.guild.channels.cache.get(channelId);

		if (!updatesChannel) {
			interaction.update({ embeds: [new ErrorEmbed(`No se pudo encontrar el canal con la id ${channelId}`)], components: [] });
			return;
		}

		if (!updatesChannel.isSendable()) {
			interaction.update({ embeds: [new ErrorEmbed(`No se puedo envíar el mensaje al canal <#${channelId}>`)] });
			return;
		}

		const updatesMessage = await updatesChannel.send({ embeds: await getLineStatusEmbeds() });

		// Sobreescribir el canal que se encuentra en la base de datos por el nuevo
		await this.container.prisma.metroStatusMessage.update({
			where: { guildId: interaction.guildId },
			data: { channelId: updatesChannel.id, messageId: updatesMessage.id }
		});

		interaction.update({
			embeds: [new SimpleEmbed(`Se estableció <#${channelId}> como canal de actualizaciones`, '✅ Configuración guardada')],
			components: []
		});
	}
}
