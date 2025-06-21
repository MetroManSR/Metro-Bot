import axios from 'axios';
import { sha256hash } from '#utils/string/sha256hash';
import { lineId, MetroLine, RawNetworkInfo } from '#types/metro-api';

export class MetroAPI {
	private async fetchRawNetworkData(): Promise<RawNetworkInfo> {
		const { data } = await axios.get<RawNetworkInfo>('https://www.metro.cl/api/estadoRedDetalle.php');
		return data;
	}

	public async getNetworkStatusInfo(): Promise<MetroLine[]> {
		const data = await this.fetchRawNetworkData();
		return this.formatNetworkInfo(data);
	}

	public async getNetworkStatusHash(): Promise<string> {
		const data = await this.fetchRawNetworkData();
		return sha256hash(JSON.stringify(data));
	}

	private formatNetworkInfo(data: RawNetworkInfo): MetroLine[] {
		return Object.entries(data).map(([_, info]) => {
			const id = _ as lineId;
			return { id, status: info.estado, message: info.mensaje, appMessage: info.mensaje_app, stations: info.estaciones };
		});
	}
}
