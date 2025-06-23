import { container } from '@sapphire/framework';

/**
 * Registra un metro status updater para el estado de red del Metro de Santiago
 */
export async function createMetroStatusUpdater(guildId: string, channelId: string) {
	return await container.prisma.metroStatusUpdater.create({ data: { guild_id: guildId, channel_id: channelId } });
}
