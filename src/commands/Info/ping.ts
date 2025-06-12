import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: '🏓 Mide la latencia del bot.'
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) => builder.setName(this.name).setDescription(this.description));
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const startTime = Date.now();
		const socketLatency = Math.max(0, this.container.client.ws.ping);

		await interaction.deferReply({ flags: 'Ephemeral' });

		await interaction.followUp({ content: 'Calculando latencia...' });

		const endTime = Date.now();
		const apiLatency = endTime - startTime;

		const embed = new EmbedBuilder().setTitle('**🏓 Pong!**').addFields([
			{ name: 'API 🕸️', value: `${apiLatency}ms`, inline: true },
			{ name: 'Socket 📡', value: `${socketLatency}ms`, inline: true }
		]);

		interaction.editReply({ content: null, embeds: [embed] });
	}
}
