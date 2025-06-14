import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class ButtonHandler extends InteractionHandler {
	public override async parse(interaction: ButtonInteraction<'cached'>) {
		if (interaction.customId === `metro-status:${this.name}`) return this.some();

		return this.none();
	}

	public async run(_interaction: ButtonInteraction<'cached'>) {
		console.log('overwrite-cancel');
	}
}
