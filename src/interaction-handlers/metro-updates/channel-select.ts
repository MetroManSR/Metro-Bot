import { ApplyOptions } from '@sapphire/decorators';
import { WarnEmbed } from '#templates/WarnEmbed';
import { ErrorEmbed } from '#templates/ErrorEmbed';
import { SimpleEmbed } from '#templates/SimpleEmbed';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuInteraction } from 'discord.js';
import { createMetroStatusUpdater } from '#metro/helpers/createMetroStatusUpdater';
import { getMetroLineStatusEmbed } from '#metro/helpers/getMetroLineStatusEmbed';
import { sha256hash } from '#utils/string/sha256hash';
import { getMetroStatusUpdater } from '#metro/helpers/getMetroStatusUpdater';

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
		const existingUpdateMessage = await getMetroStatusUpdater(interaction.guildId);

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
						`¿Sobreescribir <#${existingUpdateMessage.channel_id}> como canal de actualizaciones?`,
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

		await interaction.deferUpdate();

		/**
		 * @todo separar el estado de cada linea a su propio mensaje
		 */
		const updater = await createMetroStatusUpdater(interaction.guildId, channelId);
		const networkInfo = await this.container.metro.getNetworkInfo();

		for (const lineInfo of Object.values(networkInfo)) {
			const statusEmbed = await getMetroLineStatusEmbed(lineInfo);
			const message = await updatesChannel.send({ embeds: [statusEmbed] });
			await this.container.prisma.metroStatusMessage.create({
				data: {
					metro_status_updater: { connect: { guild_id: updater.guild_id } },
					message_id: message.id,
					line_id: lineInfo.id,
					info_hash: sha256hash(JSON.stringify(lineInfo))
				}
			});
		}

		interaction.editReply({
			embeds: [new SimpleEmbed(`Se estableció <#${channelId}> como canal de actualizaciones`, '✅ Configuración guardada')],
			components: []
		});
	}
}
