import axios from 'axios';
import { container } from '@sapphire/framework';
import { NetworkStatusResponse } from './types';

export class MetroAPI {
	public async getNeworkStatus() {
		try {
			const response = await axios.get<NetworkStatusResponse>('https://www.metro.cl/api/estadoRedDetalle.php');

			return response.data;
		} catch (error) {
			container.logger.error('whoops', error);
			throw new Error('whoops');
		}
	}
}
