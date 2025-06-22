import { lineColors, lineIcons, lineNames } from 'lib/metro/metroconfig';
import { lineId } from 'lib/metro/api/types';
import { container } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

export async function getLineStatusEmbeds() {
	const result = [];
	const data = await container.metro.getNetworkInfo();

	for (const [line, _lineInfo] of Object.entries(data)) {
		const key = line as lineId;

		const statusEmbed = new EmbedBuilder().setTitle(`${lineIcons[key]} ${lineNames[key]}`).setColor(lineColors[key]);
		result.push(statusEmbed);
	}

	return result;
}
