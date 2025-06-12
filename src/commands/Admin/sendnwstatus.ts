import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message } from 'discord.js';
import { lineColors, lineEmojis, lineNames } from '../../lib/constants';
import { LineCode } from '../../lib/metro/types';

@ApplyOptions<Command.Options>({
	description: 'Envía embeds estado de red'
})
export class UserCommand extends Command {
	public override async messageRun(message: Message) {
		if (message.deletable) {
			message.delete();
		}

		const networkStatus = await this.container.client.metro.getNeworkStatus();

		const lineInforEmbeds = [];

		for (const line in networkStatus) {
			const lineCode = line as LineCode;
			const lineInfo = networkStatus[lineCode];
			const stationList = lineInfo.estaciones
				.map((station) => {
					const lineTransferCode = station.combinacion.toLocaleLowerCase() as LineCode | '';

					if (lineTransferCode) {
						return `${station.nombre.replace(lineCode.toUpperCase(), lineEmojis[lineCode])}↔️${lineEmojis[lineTransferCode]}`;
					}

					return `${station.nombre.replace(lineCode.toUpperCase(), lineEmojis[lineCode])}`;
				})
				.join('\n');

			const lineInfoEmbed = new EmbedBuilder()
				.setTitle(`${lineEmojis[lineCode]} ${lineNames[lineCode]}`)
				.setColor(lineColors[lineCode])
				.setDescription(lineInfo.estado)
				.addFields({ name: '🚉 Estaciones', value: stationList });

			lineInforEmbeds.push(lineInfoEmbed);
		}

		if (!message.channel.isSendable()) return;

		message.channel.send({
			embeds: lineInforEmbeds
		});
	}
}
