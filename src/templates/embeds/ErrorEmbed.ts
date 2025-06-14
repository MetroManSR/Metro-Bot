import { EmbedBuilder } from 'discord.js';

export class ErrorEmbed extends EmbedBuilder {
	public constructor(description: string) {
		super();

		super //
			.setTitle('❌ Error')
			.setDescription(description)
			.setColor('Red');
	}
}
