import { Listener } from '@sapphire/framework';
import { gray } from 'colorette';

const dev = process.env.NODE_ENV !== 'production';

export class UserEvent extends Listener {
	public run(message: string) {
		if (!dev) return;

		this.container.logger.debug(gray(message));
	}
}
