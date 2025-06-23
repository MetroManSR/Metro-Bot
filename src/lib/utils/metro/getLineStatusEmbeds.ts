import { lineColors, lineIcons, lineNames, lineStatusMappings, stationStatusMappings } from 'lib/metro/metroconfig';
import { LineId } from 'lib/metro/api/types';
import { container } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { getMultiLineString } from '#utils/string/getMultiLineString';

export async function getLineStatusEmbeds() {
	const result = [];
	const data = await container.metro.getNetworkInfo();

	for (const [line, lineInfo] of Object.entries(data)) {
		const key = line as LineId;

		const stationNames = lineInfo.stations
			.map((station) => {
				// Agregar icono de estado al nombre de la estación y reemplazar el código de linea si está presente por su respectivo icono
				let name = `${stationStatusMappings[station.statusCode]} ${station.name.replace(key.toUpperCase(), lineIcons[key])}`;

				// Si la estación tiene una combinación agregarla al nombre ej: L1 + ↔️ L2
				if (station.transfer) {
					const transferId = station.transfer.toLowerCase() as LineId;
					name = `${name}↔️${lineIcons[transferId]}`;
				}

				return name;
			})
			.join('\n');

		const statusEmbed = new EmbedBuilder()
			.setTitle(`${lineIcons[key]} ${lineNames[key]}`)
			.setColor(lineColors[key])
			.setDescription(
				getMultiLineString(`📡 **Estado:**: ${lineStatusMappings[lineInfo.statusCode]}`, ` 📝 **Detalles:** ${lineInfo.messages.primary}`)
			)
			.addFields({ name: '🚆 Estaciones', value: stationNames })
			.setTimestamp();
		result.push(statusEmbed);
	}

	return result;
}
