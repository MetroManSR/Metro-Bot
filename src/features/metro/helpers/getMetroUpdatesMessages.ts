import { container } from '@sapphire/framework';

export async function getMetroUpdatesMessages(guildId?: string) {
	return await container.prisma.metroStatusMessage.findMany(guildId ? { where: { guildId: guildId } } : undefined);
}
