import axios from 'axios';
import { sha256hash } from '../util';
import { ParsedMetroLine, RawNetworkInfo } from './types';

export class MetroAPI {
	private async fetchRawNetworkData(): Promise<RawNetworkInfo> {
		const { data } = await axios.get<RawNetworkInfo>('https://www.metro.cl/api/estadoRedDetalle.php');
		return data;
	}

	public async getNetworkStatusInfo(): Promise<ParsedMetroLine[]> {
		const data = await this.fetchRawNetworkData();
		return this.formatNetworkInfo(data);
	}

	public async getNetworkStatusHash(): Promise<string> {
		const data = await this.fetchRawNetworkData();
		return sha256hash(JSON.stringify(data));
	}

	private formatNetworkInfo(data: RawNetworkInfo): ParsedMetroLine[] {
		return Object.entries(data).map(([id, info]) => ({
			id,
			status: info.estado,
			message: info.mensaje,
			appMessage: info.mensaje_app,
			stations: info.estaciones
		}));
	}
}
