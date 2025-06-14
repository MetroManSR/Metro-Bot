import { EmbedBuilder } from 'discord.js';

export class WarnEmbed extends EmbedBuilder {
	public constructor(description: string) {
		super();

		super //
			.setTitle('⚠️ Advertencia')
			.setDescription(description)
			.setColor('Yellow');
	}
}
