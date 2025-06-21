import { MetroLine } from '#types/metro-api';
import { EmbedBuilder } from 'discord.js';
import { lineColors, lineEmojis, lineNames } from '#core/constants';
import { getMultiLineString } from '#utils/string/getMultiLineString';

export class LineStatusEmbed extends EmbedBuilder {
	public constructor(line: MetroLine) {
		super();

		super //
			.setTitle(`${lineEmojis[line.id]} ${lineNames[line.id]}`)
			.setColor(lineColors[line.id])
			.setDescription(getMultiLineString(`📡 **Estado:** ${line.status}`, `📝 **Detalles:** ${line.appMessage}`));
	}
}
