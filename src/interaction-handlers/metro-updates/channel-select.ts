import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuInteraction } from 'discord.js';
import { WarnEmbed } from '#templates/embeds/info/WarnEmbed';
import { ErrorEmbed } from '#templates/embeds/info/ErrorEmbed';
import { SimpleEmbed } from '#templates/embeds/info/SimpleEmbed';
import { getLineStatusEmbeds } from '#utils/metro/getLineStatusEmbeds';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class MenuHandler extends InteractionHandler {
	public override async parse(interaction: ChannelSelectMenuInteraction<'cached'>) {
		if (interaction.customId === `metro-updates:channel-select`) return this.some();

		return this.none();
	}

	public async run(interaction: ChannelSelectMenuInteraction<'cached'>) {
		const channelId = interaction.values[0];

		// Revisa la existencia de un canal de actualizaciones ya establecido
		const existingUpdateMessage = await this.container.prisma.metroStatusMessage.findUnique({ where: { guildId: interaction.guildId } });

		if (existingUpdateMessage) {
			const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder() //
					.setCustomId(`metro-updates:channel-overwrite-confirm:${channelId}`) // interaction-handlers/metro-updates/channel-overwrite-confirm.ts
					.setLabel('Sobreescribir')
					.setStyle(ButtonStyle.Danger),
				new ButtonBuilder() //
					.setCustomId('metro-updates:channel-overwrite-cancel') // interaction-handlers/metro-updates/channel-overwrite-cancel.ts
					.setLabel('Cancelar')
					.setStyle(ButtonStyle.Primary)
			);

			interaction.update({
				embeds: [
					new WarnEmbed(
						`¿Sobreescribir <#${existingUpdateMessage.channelId}> como canal de actualizaciones?`,
						'⚙️ Canal de Actualizaciones (Metro)'
					)
				],
				components: [confirmRow]
			});

			return;
		}

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

		// Guardar el canal de actualizaciones en la base de datos
		await this.container.prisma.metroStatusMessage.create({
			data: { guildId: interaction.guildId, channelId: channelId, messageId: updatesMessage.id }
		});

		interaction.update({
			embeds: [new SimpleEmbed(`Se estableció <#${channelId}> como canal de actualizaciones`, '✅ Configuración guardada')],
			components: []
		});
	}
}
