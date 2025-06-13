import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: '⚙️ Panel de control para MetroBot',
	preconditions: ['OwnerOnly']
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		registry.registerChatInputCommand((builder) => builder.setName(this.name).setDescription(this.description));
	}

	public override async chatInputRun(interaction: ChatInputCommandInteraction) {
		const dashboardEmbed = new EmbedBuilder().setTitle('⚙️ Panel de control');
		const dashboardSelectMenu = new StringSelectMenuBuilder()
			.setCustomId('dashboard-select-menu')
			.setPlaceholder('Selecciona una opción')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Enviar embeds estado de red de metro')
					.setEmoji('ℹ️')
					.setDescription('Envia la información de la red de metro al canal deseado')
					.setValue('send-network-status-embeds')
			);

		const row = new ActionRowBuilder().addComponents(dashboardSelectMenu);

		interaction.reply({ embeds: [dashboardEmbed], components: [row.toJSON()] });
	}
}
