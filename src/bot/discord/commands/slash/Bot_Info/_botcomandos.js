const { EmbedBuilder } = require('discord.js');
const ComandoButton = require('../../../../../events/interactions/buttons/ComandoButton');

/**
 * @file Subcommand for the 'bot' command, providing a list of available commands.
 * @description This subcommand allows users to view all available commands, categorized for easy navigation, or search for a specific command.
 */
module.exports = {
    parentCommand: 'bot',
    data: (subcommand) => subcommand
        .setName('comandos')
        .setDescription('Muestra todos los comandos disponibles.')
        .addStringOption(option =>
            option.setName('buscar')
                .setDescription('Busca un comando específico por nombre o descripción.')
                .setAutocomplete(true)),

    /**
     * Executes the 'comandos' subcommand.
     * @param {import('discord.js').Interaction} interaction The interaction object.
     */
    async execute(interaction) {
        const searchTerm = interaction.options.getString('buscar');
        const comandoButton = new ComandoButton();

        try {
            if (searchTerm) {
                const results = this._searchCommands(interaction.client, searchTerm);
                if (results.length === 0) {
                    return interaction.reply({
                        content: '🔍 No se encontraron comandos que coincidan con tu búsqueda.',
                        ephemeral: true
                    });
                }
                return interaction.reply(await comandoButton.buildSearchView(results, searchTerm));
            }

            // If no search term is provided, show the default category view.
            interaction.reply(await comandoButton.buildCategoryView(interaction.client));
        } catch (error) {
            console.error('Error executing "comandos" command:', error);
            return interaction.reply({
                content: '❌ Ocurrió un error al intentar mostrar los comandos.',
                ephemeral: true
            });
        }
    },

    /**
     * Handles autocomplete for the 'buscar' option.
     * @param {import('discord.js').Interaction} interaction The interaction object.
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const commands = this._getAllCommands(interaction.client);

        const filtered = commands
            .filter(cmd => 
                cmd.name.toLowerCase().includes(focusedValue) ||
                cmd.description.toLowerCase().includes(focusedValue))
            .slice(0, 25); // Limit to 25 results for Discord API compliance

        await interaction.respond(
            filtered.map(cmd => ({
                name: `/${cmd.name} - ${cmd.description}`,
                value: cmd.name
            }))
        );
    },

    /**
     * Retrieves all commands and subcommands from the client.
     * @param {import('discord.js').Client} client The Discord client instance.
     * @returns {Array<object>} A list of command objects with name, description, and category.
     * @private
     */
    _getAllCommands(client) {
        const commands = [];
        client.commands.forEach(cmd => {
            commands.push({
                name: cmd.data.name,
                description: cmd.data.description,
                category: cmd.category
            });

            if (cmd.subcommands) {
                cmd.subcommands.forEach(subCmd => {
                    commands.push({
                        name: `${cmd.data.name} ${subCmd.data.name}`,
                        description: subCmd.data.description,
                        category: subCmd.category || cmd.category
                    });
                });
            }
        });
        return commands;
    },

    /**
     * Searches for commands based on a search term.
     * @param {import('discord.js').Client} client The Discord client instance.
     * @param {string} term The search term.
     * @returns {Array<object>} A list of commands that match the search term.
     * @private
     */
    _searchCommands(client, term) {
        const allCommands = this._getAllCommands(client);
        return allCommands.filter(cmd => 
            cmd.name.toLowerCase().includes(term.toLowerCase()) || 
            cmd.description.toLowerCase().includes(term.toLowerCase())
        );
    }
};