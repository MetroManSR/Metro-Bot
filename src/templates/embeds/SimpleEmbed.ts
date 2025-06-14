import { EmbedBuilder } from 'discord.js';

export class SimpleEmbed extends EmbedBuilder {
	public constructor(description: string, title?: string) {
		super({
			title,
			description
		});
	}
}
