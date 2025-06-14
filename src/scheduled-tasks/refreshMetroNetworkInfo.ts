import { ApplyOptions } from '@sapphire/decorators';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';

@ApplyOptions<ScheduledTask.Options>({
	interval: 60_000
})
export class UserTask extends ScheduledTask {
	public async run() {
		const updates = await this.container.prisma.metroStatusMessage.findMany();

		for (const update of updates) {
			const currentInfoHash = await this.container.metro.getNetworkStatusHash();

			if (update.api_data_hash === currentInfoHash) return;

			const guild = this.container.client.guilds.cache.get(update.guild_id);

			if (!guild) return;

			const channel = guild.channels.cache.get(update.channel_id);

			if (!channel) return;

			if (!channel.isTextBased()) return;

			const message = channel.messages.cache.get(update.message_id);

			if (!message) return;

			message.edit(`Mensaje editado: ${new Date()}`);
		}
	}
}
