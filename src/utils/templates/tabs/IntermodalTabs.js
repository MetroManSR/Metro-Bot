// templates/tabs/IntermodalTabs.js
const { TabsTemplate } = require('./tabs');
const { EmbedBuilder } = require('discord.js');

class IntermodalTabs extends TabsTemplate {
    static create() {
        return {
            idPrefix: 'intermodal',
            tabs: [
                { id: 'info', label: 'Información', emoji: 'ℹ️', style: ButtonStyle.Primary },
                { id: 'routes', label: 'Recorridos', emoji: '🔄', style: ButtonStyle.Success }
            ],
            async fetchTabData(tabId, interaction) {
                const [_, __, userId, interactionId] = interaction.customId.split('_');
                const cachedData = await CacheManager.get(`intermodal_${userId}_${interactionId}`);

                return {
                    tabId,
                    stationData: cachedData,
                    page: parseInt(interaction.customId.split('_')[4] || 0)
                };
            },
            buildEmbed: (tabData) => {
                // This component appears to be unused or broken.
                // Decoupling from the old StatusEmbed system.
                return new EmbedBuilder()
                    .setTitle('Componente no disponible')
                    .setDescription('Este componente está actualmente en mantenimiento.')
                    .setColor(0xff0000);
            },
            buildComponents: (tabData, interaction) => {
                const rows = [];

                // Main tab row
                rows.push(super.createTabRow(tabData.tabId));

                // Pagination row for routes
                if (tabData.tabId === 'routes') {
                    rows.push(this._createPaginationRow(
                        tabData.stationData.Recorridos?.length || 0,
                        tabData.page,
                        interaction
                    ));
                }

                return rows;
            },
            _createPaginationRow(totalItems, currentPage, interaction) {
                const totalPages = Math.ceil(totalItems / 10);
                const [_, __, userId, interactionId] = interaction.customId.split('_');

                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`intermodal_routes_${userId}_${interactionId}_${currentPage - 1}`)
                        .setLabel('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage <= 0),
                    new ButtonBuilder()
                        .setCustomId(`intermodal_routes_${userId}_${interactionId}_${currentPage + 1}`)
                        .setLabel('▶️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage >= totalPages - 1)
                );
            }
        };
    }
}

module.exports = IntermodalTabs;
