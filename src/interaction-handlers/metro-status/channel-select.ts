import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuInteraction } from 'discord.js';
import { WarnEmbed } from '../../templates/embeds/WarnEmbed';
import { setNetworkUpdatesChannel } from '../../helpers/setNetworkUpdatesChannel';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class MenuHandler extends InteractionHandler {
	public override async parse(interaction: ChannelSelectMenuInteraction<'cached'>) {
		if (interaction.customId === `metro-status:channel-select`) return this.some();

		return this.none();
	}

	public async run(interaction: ChannelSelectMenuInteraction<'cached'>) {
		const existingUpdatesEntry = await this.container.prisma.metroStatusMessage.findUnique({ where: { guild_id: interaction.guildId } });
		const channelId = interaction.values[0];

		if (existingUpdatesEntry) {
			const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder() //
					.setCustomId(`metro-status:overwrite-confirm:${channelId}`)
					.setLabel('Sobreescribir')
					.setStyle(ButtonStyle.Danger),
				new ButtonBuilder() //
					.setCustomId('metro-status:overwrite-cancel')
					.setLabel('Cancelar')
					.setStyle(ButtonStyle.Primary)
			);

			interaction.update({
				embeds: [new WarnEmbed(`¿Sobreescribir <#${existingUpdatesEntry.channel_id}> como canal de actualizaciones?`)],
				components: [confirmRow]
			});

			return;
		}

		await setNetworkUpdatesChannel(interaction, channelId);
	}
}
