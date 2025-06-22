import axios from 'axios';
import { RawNetworkInfo, NetworkInfo, lineId, RawStationInfo, StationInfo } from './types';

/**
 * Clase principal para interactuar con las APIs del Metro de Santiago
 */
export class MetroAPI {
	/**
	 * Obtiene el estado general de la red del Metro de Santiago
	 * @async
	 */
	public async getNetworkInfo() {
		const rawData: RawNetworkInfo = await this.fetchRawNetworkData();
		const result = {} as NetworkInfo;

		for (const [line, lineInfo] of Object.entries(rawData)) {
			result[line as lineId] = {
				statusCode: lineInfo.estado,
				messages: {
					primary: lineInfo.mensaje_app,
					secondary: lineInfo.mensaje || null
				},
				stations: this.normalizeRawStations(lineInfo.estaciones)
			};
		}

		return result;
	}

	private async fetchRawNetworkData() {
		const { data } = await axios.get('https://www.metro.cl/api/estadoRedDetalle.php');
		return data;
	}

	private normalizeRawStations(stations: RawStationInfo[]): StationInfo[] {
		return stations.map((station) => ({
			code: station.codigo,
			statusCode: station.estado,
			name: station.nombre,
			transfer: station.combinacion || null,
			messages: { primary: station.descripcion, secondary: station.descripcion_app, tertiary: station.mensaje || null }
		}));
	}
}
