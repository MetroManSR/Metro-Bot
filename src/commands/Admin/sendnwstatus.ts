import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message } from 'discord.js';
import { lineColors, lineEmojis, lineNames } from '../../lib/constants';
import { LineCodes } from '../../lib/metro/types';

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
			const key = line as keyof typeof networkStatus;
			const lineInfo = networkStatus[key];
			const stationsList = lineInfo.estaciones
				.map((station) => {
					const transfer = station.combinacion.toLocaleLowerCase() as LineCodes | '';

					if (transfer) {
						return `${station.nombre.replace(key.toUpperCase(), lineEmojis[key])}↔️${lineEmojis[transfer]}`;
					}

					return `${station.nombre.replace(key.toUpperCase(), lineEmojis[key])}`;
				})
				.join('\n');

			const lineInfoEmbed = new EmbedBuilder()
				.setTitle(`${lineEmojis[key]} ${lineNames[key]}`)
				.setColor(lineColors[key])
				.setDescription(lineInfo.estado)
				.addFields({ name: '🚉 Estaciones', value: stationsList });

			lineInforEmbeds.push(lineInfoEmbed);
		}

		if (!message.channel.isSendable()) return;

		message.channel.send({
			embeds: lineInforEmbeds
		});
	}
}
