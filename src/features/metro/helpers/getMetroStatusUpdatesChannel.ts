import { container } from '@sapphire/framework';

/**
 * Recupera el canal de actualizaciones de estado del Metro de Santiago
 */
export async function getMetroStatusUpdatesChannel(guildId: string) {
	const config = await container.prisma.guildConfig.findUnique({ where: { guildId: guildId } });

	return config ? config.metroUpdatesChannelId : null;
}
