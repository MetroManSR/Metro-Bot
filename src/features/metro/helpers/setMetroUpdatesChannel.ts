import { container } from '@sapphire/framework';

/**
 * Establece el canal de actualizaciones de estado del Metro de Santiago
 */
export async function setMetroUpdatesChannel(guildId: string, channelId: string) {
	return await container.prisma.guildConfig.upsert({
		where: { guildId: guildId },
		create: { guildId: guildId, metroUpdatesChannelId: channelId },
		update: { metroUpdatesChannelId: channelId }
	});
}
