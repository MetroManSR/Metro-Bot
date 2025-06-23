import axios from 'axios';
import { RawNetworkInfo, NetworkInfo, LineId, RawStationInfo, StationInfo } from './types';

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
			result[line as LineId] = {
				statusCode: this.isOperating() ? lineInfo.estado : '0',
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
			statusCode: this.isOperating() ? station.estado : '0',
			name: station.nombre,
			transfer: station.combinacion || null,
			messages: { primary: station.descripcion, secondary: station.descripcion_app, tertiary: station.mensaje || null }
		}));
	}

	private isOperating() {
		const now = new Date();
		const day = now.getDay(); // 0 = Domingo, 6 = Sábado
		const minutes = now.getHours() * 60 + now.getMinutes();

		let start: number, end: number;

		switch (day) {
			case 0: {
				// Domingo
				start = 7 * 60 + 30; // 7:30
				end = 23 * 60; // 23:00
				break;
			}

			case 6: {
				// Sábado
				start = 6 * 60 + 30; // 6:30
				end = 23 * 60; // 23:00
				break;
			}

			default: {
				// Lunes a viernes
				start = 6 * 60; // 6:00
				end = 23 * 60; // 23:00
			}
		}

		// start ≤ ahora ≤ end
		return minutes >= start && minutes <= end;
	}
}
