import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ChannelSelectMenuBuilder, type StringSelectMenuInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class MenuHandler extends InteractionHandler {
	public override parse(interaction: StringSelectMenuInteraction) {
		if (interaction.customId !== 'dashboard-select-menu') return this.none();

		return this.some();
	}

	public async run(interaction: StringSelectMenuInteraction) {
		const selected = interaction.values[0];

		if (selected === 'send-network-status-embeds') {
			const channelSelectMenu = new ChannelSelectMenuBuilder({
				custom_id: 'send-network-status-embeds-channel-select',
				placeholder: 'Selecciona un canal',
				max_values: 1,
				min_values: 1
			});

			const row = new ActionRowBuilder().addComponents(channelSelectMenu);

			interaction.update({ components: [row.toJSON()] });
		}
	}
}
