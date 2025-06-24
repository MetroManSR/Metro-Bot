import { container } from '@sapphire/framework';

/**
 * Elimina todos los mensajes de estado asociados a un servidor
 */
export async function clearMetroStatusMessages(guildId: string) {
	return await container.prisma.metroStatusMessage.deleteMany({
		where: { guildId: guildId }
	});
}
