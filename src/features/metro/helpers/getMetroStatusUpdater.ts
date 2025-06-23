import { container } from '@sapphire/framework';

/**
 * Obtiene el metro status updater para el servidor
 */
export async function getMetroStatusUpdater(guildId: string) {
	return await container.prisma.metroStatusUpdater.findUnique({ where: { guild_id: guildId } });
}
