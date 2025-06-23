import { EmbedBuilder } from 'discord.js';

export class WarnEmbed extends EmbedBuilder {
	public constructor(description: string, title?: string) {
		super();

		super //
			.setTitle(title ?? '⚠️ Advertencia')
			.setDescription(description)
			.setColor('Yellow');
	}
}
