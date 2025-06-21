import { EmbedBuilder } from 'discord.js';

export class ErrorEmbed extends EmbedBuilder {
	public constructor(description: string, title?: string) {
		super();

		super //
			.setTitle(title ?? '❌ Error')
			.setDescription(description)
			.setColor('Red');
	}
}
