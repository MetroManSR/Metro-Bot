import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';
import { setNetworkUpdatesChannel } from '../../helpers/setNetworkUpdatesChannel';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public override async parse(interaction: ButtonInteraction<'cached'>) {
		if (interaction.customId.startsWith(`metro-status:${this.name}`)) {
			const [_, __, channelId] = interaction.customId.split(':');

			return this.some(channelId);
		}

		return this.none();
	}

	public async run(interaction: ButtonInteraction<'cached'>, channelId: string) {
		await setNetworkUpdatesChannel(interaction, channelId);
	}
}
