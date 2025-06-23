import { LineId, LineInfo } from '#metro/api/types';
import { lineColors, lineIcons, lineNames, lineStatusMappings, stationStatusMappings } from '#metro/metroconfig';
import { chunk } from '#utils/array/chunk';
import { getMultiLineString } from '#utils/string/getMultiLineString';
import { EmbedBuilder } from 'discord.js';

/**
 * Crea un embed de estado para la linea deseada
 */
export async function getMetroLineStatusEmbed(line: LineInfo) {
	const stationNames = line.stations.map((station) => {
		// Agregar icono de estado al nombre de la estación y reemplazar el código de linea si está presente por su respectivo icono
		let name = `${stationStatusMappings[station.statusCode]} ${station.name.replace(line.id.toUpperCase(), lineIcons[line.id])}`;

		// Si la estación tiene una combinación agregarla al nombre ej: L1 + ↔️ L2
		if (station.transfer) {
			const transferId = station.transfer.toLowerCase() as LineId;
			name = `${name}↔️${lineIcons[transferId]}`;
		}

		return name;
	});

	const embed = new EmbedBuilder()
		.setTitle(`${lineIcons[line.id]} ${lineNames[line.id]}`)
		.setColor(lineColors[line.id])
		.setDescription(getMultiLineString(`📡 **Estado:**: ${lineStatusMappings[line.statusCode]}`, ` 📝 **Detalles:** ${line.messages.primary}`))
		.setTimestamp();

	const chunks = chunk(stationNames);

	for (let i = 0; i < chunks.length; i++) {
		embed.addFields({ name: `🚆 Estaciones [${i + 1}]`, value: chunks[i].join('\n') });
	}

	return embed;
}
