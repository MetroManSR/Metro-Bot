const { Markup } = require('telegraf');
const MetroCore = require('../../modules/metro/core/MetroCore');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const TimeHelpers = require('../../modules/chronos/timeHelpers');

// MetroCore instance (singleton pattern)
let metroCoreInstance = null;
const ADMIN_USER_ID = 6566554074;
const EDIT_TIMEOUT = 300000; // 5 minutes
const ACCESS_DETAILS_DIR = path.join(__dirname, '../../modules/metro/data/json/accessDetails');

async function getMetroCore() {
    if (!metroCoreInstance) {
        metroCoreInstance = await MetroCore.getInstance();
    }
    return metroCoreInstance;
}

function formatDate(dateString) {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return TimeHelpers.formatDateTime(date, 'DD/MM/YYYY HH:mm');
}

// Status mapping configuration
const STATUS_CONFIG = {
    elevator: { 
        emoji: '🛗',
        name: 'Ascensor',
        statuses: {
            'operativa': '🟢 Operativo',
            'en mantención': '🟡 En mantención',
            'fuera de servicio': '🔴 Fuera de servicio',
            'restringido': '🟡 Restringido'
        }
    },
    escalator: {
        emoji: '🪜',
        name: 'Escalera',
        statuses: {
            'operativa': '🟢 Operativa',
            'en mantención': '🟡 En mantención',
            'fuera de servicio': '🔴 Fuera de servicio',
            'restringido': '🟡 Restringida'
        }
    },
    accesses: {
        emoji: '🚪',
        name: 'Acceso',
        statuses: {
            'abierto': '🟢 Abierto',
            'cerrado': '🔴 Cerrado',
            'restringido': '🟡 Restringido',
            'horario especial': '🟡 Horario especial'
        }
    }
};

// Helper functions for JSON operations
async function ensureAccessDetailsDir() {
    try {
        await fs.access(ACCESS_DETAILS_DIR);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(ACCESS_DETAILS_DIR, { recursive: true });
        } else {
            throw error;
        }
    }
}

function normalizeKey(str) {
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .trim();
}

function getConfigPath(stationKey, linekey) {
    const normalized = normalizeKey(stationKey);
    const regex = /.*(l[1-6]|4a)$/;
    if (regex.test(normalized)) {
        return path.join(ACCESS_DETAILS_DIR, `access_${normalized}.json`);                          
    } else {
        return path.join(ACCESS_DETAILS_DIR, `access_${normalized}-${linekey}.json`);
    }
} 

async function getAccessConfig(stationKey, lineKey) {
    const configPath = getConfigPath(stationKey, lineKey);
    try {
        const data = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(data);

        // Ensure all required fields exist
        config.accesses = config.accesses?.map(access => ({
            status: 'abierto',
            lastUpdated: TimeHelpers.currentTime.toISOString(),
            notes: '',
            ...access
        })) || [];
        
        config.elevators = config.elevators?.map(elevator => ({
            status: 'operativa',
            lastUpdated: TimeHelpers.currentTime.toISOString(),
            notes: '',
            ...elevator
        })) || [];
        
        config.escalators = config.escalators?.map(escalator => ({
            status: 'operativa',
            lastUpdated: TimeHelpers.currentTime.toISOString(),
            notes: '',
            ...escalator
        })) || [];

        config.changeHistory = config.changeHistory || [];
        
        return config;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {
                elevators: [],
                escalators: [],
                accesses: [],
                changeHistory: []
            };
        }
        throw error;
    }
}

async function saveAccessConfig(stationKey, config) {
    await ensureAccessDetailsDir();
    const configPath = getConfigPath(stationKey, config.line);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

async function updateMainAccessibilityStatus(stationName, accessConfig) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.displayName.toLowerCase() === stationName.toLowerCase()
        );

        if (!station) return;

        const outOfService = [
            ...accessConfig.elevators.filter(e => e.status.toLowerCase().includes('fuera de servicio')),
            ...accessConfig.escalators.filter(e => e.status.toLowerCase().includes('fuera de servicio'))
        ];

        let statusText = 'Todos los ascensores y escaleras mecánicas están operativos';
        if (outOfService.length > 0) {
            statusText = outOfService.map(item => 
                `${item.id} (${item.name}): ${item.status}`
            ).join('\\n');
        }

        statusText += `\\n-# Última Actualización ${TimeHelpers.formatDateTime(TimeHelpers.currentTime, 'DD/MM/YYYY HH:mm')}`;

        // Update in MetroCore's data
        station.accessStatus = statusText;
    } catch (error) {
        console.error('Error updating main accessibility status:', error);
    }
}

module.exports = {
    execute: async (ctx) => {
        try {
            // Check if user is authorized
            if (!await checkAccessPermissions(ctx.from.id)) {
                return ctx.reply('🔒 No tienes permisos para usar este comando.');
            }

            const args = ctx.message.text.split(' ').slice(1);
            const [action, ...restArgs] = args;

            if (!action) {
                return showMainMenu(ctx);
            }

            switch (action.toLowerCase()) {
                case 'config':
                case 'configure':
                case 'configurar':
                    return handleConfigure(ctx, restArgs);
                case 'status':
                case 'estado':
                    return handleStatus(ctx, restArgs);
                case 'view':
                case 'ver':
                    return handleView(ctx, restArgs);
                case 'list':
                case 'listar':
                    return handleList(ctx);
                case 'history':
                case 'historial':
                    return handleHistory(ctx, restArgs);
                case 'aedit':
                case 'advancededit':
                    return handleAdvancedEdit(ctx, restArgs);
                case 'replace':
                case 'reemplazar':
                    return handleReplace(ctx, restArgs);
                case 'help':
                case 'ayuda':
                    return showHelp(ctx);
                default:
                    return showMainMenu(ctx);
            }
        } catch (error) {
            console.error('Error in stationaccess command:', error);
            handleError(ctx, error);
        }
    },

    registerActions: (bot) => {
        // Main menu actions
        bot.action('access_main', async (ctx) => {
            await ctx.answerCbQuery();
            await showMainMenu(ctx);
        });

        // List stations action
        bot.action('access_list', async (ctx) => {
            await ctx.answerCbQuery();
            await handleList(ctx);
        });

        // Line selection action
        bot.action(/access_list_line:(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const line = ctx.match[1];
            await handleList(ctx, 0, line);
        });

        // Paginated station list action
        bot.action(/access_list_page:(\d+):(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const page = parseInt(ctx.match[1]);
            const line = ctx.match[2];
            await handleList(ctx, page, line);
        });

        // Station selection actions
        bot.action(/access_view:(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const stationId = ctx.match[1];
            await showStationAccessInfo(ctx, stationId);
        });

        // Element type selection actions
        bot.action(/access_status:(.+):(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            let [stationId, elementType] = ctx.match.slice(1);
            if (elementType.includes("access")) elementType = "accesses";
            await showStatusUpdateMenu(ctx, stationId, elementType);
        });

        // Individual element update actions
        bot.action(/access_status_update:(.+):(.+):(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            let [stationId, elementType, elementId] = ctx.match.slice(1);
            if (elementType.includes("access")) elementType = "accesses";
            await showElementStatusOptions(ctx, stationId, elementType, elementId);
        });

        // Bulk status update actions
        bot.action(/ac_st_set:(.+):(.+):(.+):(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            let [stationId, elementType, scope, newStatus] = ctx.match.slice(1);
            if (elementType.includes("access")) elementType = "accesses";
            await updateElementStatus(ctx, stationId, elementType, scope, newStatus);
        });

        // Configuration actions
        bot.action(/access_config:(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const stationId = ctx.match[1];
            await showStationConfigMenu(ctx, stationId);
        });

        // Add element actions
        bot.action(/access_config_add:(.+):(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            let [stationId, elementType] = ctx.match.slice(1);
            if (elementType.includes("access")) elementType = "accesses";
            await startAddElementFlow(ctx, stationId, elementType);
        });

        // Remove element actions
        bot.action(/access_config_remove:(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const stationId = ctx.match[1];
            await showRemoveElementMenu(ctx, stationId);
        });

        // History actions
        bot.action(/access_history:(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const stationId = ctx.match[1];
            await showStationHistory(ctx, stationId);
        });

        // Global history action
        bot.action('access_global_history', async (ctx) => {
            await ctx.answerCbQuery();
            await showGlobalHistory(ctx);
        });

        // Help action
        bot.action('access_help', async (ctx) => {
            await ctx.answerCbQuery();
            await showHelp(ctx);
        });

        // Finish action
        bot.action('access_finish', async (ctx) => {
            await ctx.answerCbQuery();
            await ctx.editMessageText('✅ Comando de accesibilidad completado.', {
                reply_markup: { inline_keyboard: [] }
            });
            if (ctx.session.editingContext) {
                delete ctx.session.editingContext;
            }
        });

        // Advanced edit actions
        bot.action('access_aedit_start', async (ctx) => {
            await ctx.answerCbQuery();
            await showAdvancedEditMenu(ctx);
        });

        bot.action(/access_aedit_station:(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const stationId = ctx.match[1];
            await showAdvancedEditStationOptions(ctx, stationId);
        });

        bot.action(/access_aedit_field:(.+):(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const [stationId, field] = ctx.match.slice(1);
            await showAdvancedEditFieldOptions(ctx, stationId, field);
        });

        // Replace actions
        bot.action('access_replace_start', async (ctx) => {
            await ctx.answerCbQuery();
            await showReplaceMenu(ctx);
        });

        // Remove element confirmation
        bot.action(/access_remove_confirm:(.+):(.+):(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            let [stationId, elementType, elementId] = ctx.match.slice(1);
            if (elementType.includes("access")) elementType = "accesses";
            await removeElement(ctx, stationId, elementType, elementId);
        });

        // Cancel any pending operation
        bot.action('access_cancel', async (ctx) => {
            await ctx.answerCbQuery();
            if (ctx.session.editingContext) {
                delete ctx.session.editingContext;
            }
            await showMainMenu(ctx);
        });
    },

    handleMessage: async (ctx) => {
        try {
            if (!ctx.session.editingContext) return;

            const { action, stationId, field, elementType } = ctx.session.editingContext;
            const messageText = ctx.message.text.trim();

            switch (action) {
                case 'aedit':
                    await handleAdvancedEditInput(ctx, stationId, field, messageText);
                    break;
                case 'replace':
                    await handleReplaceInput(ctx, messageText);
                    break;
                case 'add_element':
                    await handleAddElementInput(ctx, stationId, elementType, messageText);
                    break;
                default:
                    delete ctx.session.editingContext;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            handleError(ctx, error);
        }
    }
};

// Permission check function
async function checkAccessPermissions(userId) {
    return userId === ADMIN_USER_ID;
}

// Error handling function
async function handleError(ctx, error, action = 'procesar el comando') {
    if (!ctx.session) {
        ctx.session = {};
    }
    
    console.error(`[StationAccess Error] Error al ${action}:`, error);
    
    let errorMessage;
    if (error.message.includes('not available')) {
        errorMessage = 'Funcionalidad no disponible temporalmente';
    } else if (error.message.includes('not found')) {
        errorMessage = 'Recurso no encontrado';
    } else if (error.message.includes('permission')) {
        errorMessage = 'No tienes permisos para esta acción';
    } else {
        errorMessage = `Error al ${action}: ${error.message}`;
    }
    
    const keyboard = [
        [Markup.button.callback('🔙 Volver', 'access_main')]
    ];

    if (ctx.callbackQuery) {
        await ctx.editMessageText(`❌ ${errorMessage}`, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        await ctx.replyWithHTML(`❌ ${errorMessage}`, {
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    if (ctx.session?.editingContext) {
        delete ctx.session.editingContext;
    }
}

// Main menu
async function showMainMenu(ctx) {
    if (!ctx.session) {
        ctx.session = {};
    }
    
    const message = `🛗 <b>Menú Principal de Gestión de Accesibilidad</b>\n\nSelecciona una acción:`;
    
    const keyboard = [
        [Markup.button.callback('📋 Listar estaciones', 'access_list')],
        [Markup.button.callback('⚙️ Configuración avanzada', 'access_aedit_start')],
        [Markup.button.callback('🔄 Reemplazo masivo', 'access_replace_start')],
        [Markup.button.callback('📜 Historial global', 'access_global_history')],
        [Markup.button.callback('ℹ️ Ayuda', 'access_help')],
        [Markup.button.callback('✅ Finalizar', 'access_finish')]
    ];

    if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        await ctx.replyWithHTML(message, {
            reply_markup: { inline_keyboard: keyboard }
        });
    }

    if (ctx.session.editingContext) {
        delete ctx.session.editingContext;
    }
}

// List stations with line grouping
async function handleList(ctx, page = 0, line = null) {
    try {
        const metro = await getMetroCore();
        
        if (!line) {
            // Show line selection first
            const lines = {};
            Object.values(metro._staticData.stations)
                .filter(s => s.accessDetails)
                .forEach(station => {
                    if (!lines[station.line]) {
                        lines[station.line] = {
                            name: station.line,
                            count: 0
                        };
                    }
                    lines[station.line].count++;
                });

            let message = `<b>📋 Líneas con estaciones configuradas</b>\n\n`;
            message += `Selecciona una línea para ver sus estaciones:`;

            const keyboard = Object.values(lines).map(lineInfo => [
                Markup.button.callback(
                    `🚇 Línea ${lineInfo.name} (${lineInfo.count} estaciones)`,
                    `access_list_line:${lineInfo.name}`
                )
            ]);

            keyboard.push([Markup.button.callback('🔙 Menú principal', 'access_main')]);

            if (ctx.callbackQuery) {
                await ctx.editMessageText(message, {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: keyboard }
                });
            } else {
                await ctx.replyWithHTML(message, {
                    reply_markup: { inline_keyboard: keyboard }
                });
            }
            return;
        }

        // Show stations for selected line
        const allStations = Object.values(metro._staticData.stations)
            .filter(s => s.accessDetails && s.line === line)
            .sort((a, b) => a.displayName.localeCompare(b.displayName));

        if (allStations.length === 0) {
            return ctx.reply(`No hay estaciones con configuración de accesibilidad en la Línea ${line}.`);
        }

        const STATIONS_PER_PAGE = 5;
        const totalPages = Math.ceil(allStations.length / STATIONS_PER_PAGE);
        const startIdx = page * STATIONS_PER_PAGE;
        const stations = allStations.slice(startIdx, startIdx + STATIONS_PER_PAGE);

        let message = `<b>📋 Estaciones de Línea ${line}</b>\n\n`;
        message += `Página ${page + 1} de ${totalPages}\n\n`;
        
        const keyboard = stations.map(station => [
            Markup.button.callback(
                `${station.displayName}`,
                `access_view:${station.code}`
            )
        ]);

        const paginationRow = [];
        if (page > 0) {
            paginationRow.push(Markup.button.callback('⬅️ Anterior', `access_list_page:${page - 1}:${line}`));
        }
        if (page < totalPages - 1) {
            paginationRow.push(Markup.button.callback('Siguiente ➡️', `access_list_page:${page + 1}:${line}`));
        }
        
        if (paginationRow.length > 0) {
            keyboard.push(paginationRow);
        }

        keyboard.push([
            Markup.button.callback('↩️ Volver a líneas', 'access_list'),
            Markup.button.callback('🔙 Menú principal', 'access_main')
        ]);

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            await ctx.replyWithHTML(message, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    } catch (error) {
        handleError(ctx, error, 'listar estaciones');
    }
}

// Station access info
async function showStationAccessInfo(ctx, stationId) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        let message = `<b>♿ ${station.displayName} - Accesibilidad</b>\n\n`;
        
        // Summary information
        if (station.accessDetails.elevators?.length) {
            const operational = station.accessDetails.elevators.filter(e => e.status === 'operativa').length;
            message += `🛗 <b>Ascensores:</b> ${operational}/${station.accessDetails.elevators.length} operativos\n`;
        } else {
            message += `🛗 <b>Ascensores:</b> No configurados\n`;
        }
        
        if (station.accessDetails.escalators?.length) {
            const operational = station.accessDetails.escalators.filter(e => e.status === 'operativa').length;
            message += `🪜 <b>Escaleras:</b> ${operational}/${station.accessDetails.escalators.length} operativas\n`;
        } else {
            message += `🪜 <b>Escaleras:</b> No configuradas\n`;
        }
        
        if (station.accessDetails.accesses?.length) {
            const open = station.accessDetails.accesses.filter(a => a.status === 'abierto').length;
            message += `🚪 <b>Accesos:</b> ${open}/${station.accessDetails.accesses.length} abiertos\n\n`;
        } else {
            message += `🚪 <b>Accesos:</b> No configurados\n\n`;
        }

        // Latest change
        if (station.accessDetails.changeHistory?.length) {
            const latestChange = station.accessDetails.changeHistory
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            message += `📝 <b>Último cambio:</b>\n`;
            message += `- Acción: ${latestChange.action}\n`;
            message += `- Por: ${latestChange.user}\n`;
            message += `- Fecha: ${formatDate(latestChange.timestamp)}\n\n`;
        } else {
            message += `📝 <b>Último cambio:</b> Sin registros\n\n`;
        }

        const keyboard = [
            [
                Markup.button.callback('🛗 Ascensores', `access_status:${station.code}:elevator`),
                Markup.button.callback('🪜 Escaleras', `access_status:${station.code}:escalator`)
            ],
            [
                Markup.button.callback('🚪 Accesos', `access_status:${station.code}:access`),
                Markup.button.callback('📋 Historial', `access_history:${station.code}`)
            ],
            [
                Markup.button.callback('⚙️ Configurar', `access_config:${station.code}`),
                Markup.button.callback('🔙 Menú principal', 'access_main')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar información de estación');
    }
}

// Status update menu
async function showStatusUpdateMenu(ctx, stationId, elementType) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.displayName === stationId || s.code === stationId.trim() 
        );

        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        const elements = station.accessDetails[`${elementType}s`] || [];
        const config = STATUS_CONFIG[elementType];
        
        let message = `<b>${config.emoji} Actualizar estado - ${station.displayName}</b>\n\n`;
        message += `Selecciona el ${config.name.toLowerCase()} a actualizar:\n\n`;
        
        const keyboard = elements.map(element => [
            Markup.button.callback(
                `${getStatusEmoji(element.status)} ${element.id || element.name} (${element.status})`,
                `access_status_update:${station.code}:${elementType}:${element.id}`
            )
        ]);

        if (elements.length > 0) {
            const statusButtons = Object.entries(config.statuses).map(([status, label]) => 
                Markup.button.callback(label, `ac_st_set:${station.code}:${elementType}:all:${status}`)
            );
            
            for (let i = 0; i < statusButtons.length; i += 2) {
                keyboard.push(statusButtons.slice(i, i + 2));
            }
        } else {
            message += `No hay ${config.name.toLowerCase()}s configurados.\n`;
        }

        keyboard.push([
            Markup.button.callback('🔙 Atrás', `access_view:${station.code}`),
            Markup.button.callback('🏠 Menú principal', 'access_main')
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar menú de actualización');
    }
}

// Element status options
async function showElementStatusOptions(ctx, stationId, elementType, elementId) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim()
        );
        
        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        const elements = station.accessDetails[`${elementType}s`] || [];
        const element = elements.find(e => e.id === elementId);
        const config = STATUS_CONFIG[elementType];

        if (!element) {
            await ctx.answerCbQuery('Elemento no encontrado', { show_alert: true });
            return;
        }

        let message = `<b>${config.emoji} Actualizar estado - ${station.displayName}</b>\n\n`;
        message += `<b>Elemento:</b> ${elementId || element.name}\n`;
        message += `<b>Estado actual:</b> ${getStatusEmoji(element.status)} ${element.status}\n\n`;
        message += `Selecciona el nuevo estado:`;

        const keyboard = Object.entries(config.statuses).map(([status, label]) => 
            Markup.button.callback(label, `ac_st_set:${station.code}:${elementType}:${elementId}:${status}`)
        );

        const statusRows = [];
        for (let i = 0; i < keyboard.length; i += 2) {
            statusRows.push(keyboard.slice(i, i + 2));
        }

        statusRows.push([
            Markup.button.callback('🔙 Atrás', `access_status:${station.code}:${elementType}`),
            Markup.button.callback('🏠 Menú principal', 'access_main')
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: statusRows }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar opciones de estado');
    }
}

// Update element status
async function updateElementStatus(ctx, stationId, elementType, scope, newStatus) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );

        const config = STATUS_CONFIG[elementType];
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        const elements = station.accessDetails[`${elementType}s`];
        let updatedElements = [];
        let actionDescription = '';

        if (scope === 'all') {
            for (const element of elements) {
                element.status = newStatus;
                element.lastUpdated = TimeHelpers.currentTime.toISOString();
                updatedElements.push(element.id || element.name);
            }
            actionDescription = `Actualizados todos los ${config.name.toLowerCase()}s a ${newStatus}`;
        } else {
            const element = elements.find(e => e.id === scope);
            if (element) {
                element.status = newStatus;
                element.lastUpdated = TimeHelpers.currentTime.toISOString();
                updatedElements.push(element.id || element.name);
                actionDescription = `Actualizado ${config.name.toLowerCase()} ${scope} a ${newStatus}`;
            } else {
                throw new Error('Elemento no encontrado');
            }
        }

        // Add to changelog
        station.accessDetails.changeHistory.push({
            timestamp: TimeHelpers.currentTime.toISOString(),
            user: `${ctx.from.first_name} (${ctx.from.id})`,
            action: actionDescription,
            details: `Updated: ${updatedElements.join(', ')}`,
        });

        // Save changes to JSON file
        await saveAccessConfig(station.displayName, station.accessDetails);
        await updateMainAccessibilityStatus(station.displayName, station.accessDetails);

        let message = `<b>✅ Estado actualizado</b>\n\n`;
        message += `<b>Estación:</b> ${station.displayName}\n`;
        message += `<b>Elementos afectados:</b> ${updatedElements.join(', ') || 'Ninguno'}\n`;
        message += `<b>Nuevo estado:</b> ${newStatus}`;

        const keyboard = [
            [
                Markup.button.callback('🔄 Actualizar otro', `access_status:${station.code}:${elementType}`),
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'actualizar estado');
    }
}

// Station history
async function showStationHistory(ctx, stationId) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        if (!station.accessDetails.changeHistory?.length) {
            return ctx.reply('No hay historial de cambios para esta estación.');
        }

        const history = station.accessDetails.changeHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 15);

        let message = `<b>📋 Historial de cambios - ${station.displayName}</b>\n\n`;
        
        history.forEach(change => {
            message += `📅 <b>${formatDate(change.timestamp)}</b>\n`;
            message += `👤 <i>${change.user}</i>\n`;
            message += `🔄 ${change.action}\n\n`;
        });

        const keyboard = [
            [
                Markup.button.callback('🔙 Volver', `access_view:${station.code}`),
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar historial');
    }
}

// Global history
async function showGlobalHistory(ctx) {
    try {
        const metro = await getMetroCore();
        const stations = Object.values(metro._staticData.stations);

        let allChanges = [];
        
        // Load history from all station JSON files
        for (const station of stations) {
            const accessDetails = await getAccessConfig(station.displayName, station.line);
            if (accessDetails.changeHistory?.length) {
                allChanges.push(...accessDetails.changeHistory.map(change => ({
                    ...change,
                    stationName: station.displayName
                })));
            }
        }

        allChanges = allChanges
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 20);

        let message = `<b>📜 Historial Global de Accesibilidad</b>\n\n`;
        
        if (allChanges.length === 0) {
            message += 'No hay registros de cambios recientes.';
        } else {
            allChanges.forEach(change => {
                message += `📅 <b>${formatDate(change.timestamp)}</b>\n`;
                message += `🏷️ <i>${change.stationName}</i>\n`;
                message += `👤 ${change.user}\n`;
                message += `🔄 ${change.action}\n\n`;
            });
        }

        const keyboard = [
            [
                Markup.button.callback('🔙 Volver', 'access_main'),
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar historial global');
    }
}

// Help menu
async function showHelp(ctx) {
    const message = `<b>ℹ️ Ayuda - Gestión de Accesibilidad</b>\n\n`
        + `Este módulo permite gestionar el estado de los elementos de accesibilidad en las estaciones.\n\n`
        + `<b>Funcionalidades principales:</b>\n`
        + `- Ver y actualizar estados de ascensores, escaleras y accesos\n`
        + `- Configuración detallada por estación\n`
        + `- Edición avanzada de múltiples estaciones\n`
        + `- Reemplazo masivo de valores\n`
        + `- Historial completo de cambios\n\n`
        + `<b>Uso desde mensaje:</b>\n`
        + `<code>/stationaccess ver "Estación Ejemplo"</code>\n`
        + `<code>/stationaccess estado "Estación" ascensor A1 "fuera de servicio"</code>\n`
        + `<code>/stationaccess aedit "Estación" escaleras</code>\n`
        + `<code>/stationaccess replace "fuera de servicio" "operativa"</code>\n\n`
        + `También puedes usar los botones para navegar por todas las opciones.`;

    const keyboard = [
        [Markup.button.callback('🔙 Volver', 'access_main')]
    ];

    await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
    });
}

// Status emoji helper
function getStatusEmoji(status) {
    if (!status) return '⚪';
    
    const statusMap = {
        'operativa': '🟢',
        'operativo': '🟢',
        'abierto': '🟢',
        'fuera de servicio': '🔴',
        'cerrado': '🔴',
        'en mantención': '🟡',
        'restringido': '🟡',
        'restringida': '🟡',
        'normal': '🟢',
        'alterado': '🟡',
        'suspendido': '🔴',
        'horario especial': '🟡'
    };
    
    return statusMap[status.toLowerCase()] || '⚪';
}

// Configuration menu
async function showStationConfigMenu(ctx, stationId) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        let message = `<b>⚙️ Configuración - ${station.displayName}</b>\n\n`;
        message += `Opciones de configuración para esta estación:`;

        const keyboard = [
            [
                Markup.button.callback('➕ Añadir ascensor', `access_config_add:${station.code}:elevator`),
                Markup.button.callback('➕ Añadir escalera', `access_config_add:${station.code}:escalator`)
            ],
            [
                Markup.button.callback('➕ Añadir acceso', `access_config_add:${station.code}:access`),
                Markup.button.callback('➖ Eliminar elemento', `access_config_remove:${station.code}`)
            ],
            [
                Markup.button.callback('📝 Editar notas', `access_config_edit:${station.code}:notes`),
                Markup.button.callback('🔄 Restablecer', `access_config_reset:${station.code}`)
            ],
            [
                Markup.button.callback('🔙 Volver', `access_view:${station.code}`),
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar menú de configuración');
    }
}

// Add element flow
async function startAddElementFlow(ctx, stationId, elementType) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );

        const config = STATUS_CONFIG[elementType];
        if (!config) {
            throw new Error('Tipo de elemento no válido');
        }

        ctx.session.editingContext = {
            action: 'add_element',
            stationId,
            elementType,
            timestamp: TimeHelpers.currentTime.getTime()
        };

        let message = `<b>➕ Añadir ${config.name.toLowerCase()} - ${station.displayName}</b>\n\n`;
        message += `Por favor, envía los detalles del nuevo ${config.name.toLowerCase()} en el siguiente formato:\n\n`;
        message += `<code>Identificador, Ubicación, Estado</code>\n\n`;
        message += `Ejemplo: <code>A1, Andén norte, operativa</code>\n\n`;
        message += `Estados disponibles: ${Object.keys(config.statuses).join(', ')}`;

        const keyboard = [
            [Markup.button.callback('❌ Cancelar', `access_config:${station.code}`)]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'iniciar añadir elemento');
    }
}

async function handleAddElementInput(ctx, stationId, elementType, inputText) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );

        const config = STATUS_CONFIG[elementType];
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        const [id, location, status, ...rest] = inputText.split(',').map(s => s.trim());
        
        if (!id || !location || !status) {
            throw new Error('Formato incorrecto. Usa: Identificador, Ubicación, Estado');
        }

        if (!Object.keys(config.statuses).includes(status)) {
            throw new Error(`Estado no válido. Usa uno de: ${Object.keys(config.statuses).join(', ')}`);
        }

        const newElement = {
            id,
            name: location,
            status,
            lastUpdated: TimeHelpers.currentTime.toISOString(),
            notes: rest.join(', ') || ''
        };

        station.accessDetails[`${elementType}s`].push(newElement);

        // Add to changelog
        station.accessDetails.changeHistory.push({
            timestamp: TimeHelpers.currentTime.toISOString(),
            user: `${ctx.from.first_name} (${ctx.from.id})`,
            action: `Añadido ${config.name.toLowerCase()} ${id} (${status})`
        });

        // Save changes to JSON file
        await saveAccessConfig(station.displayName, station.accessDetails);
        await updateMainAccessibilityStatus(station.displayName, station.accessDetails);
        delete ctx.session.editingContext;

        let message = `<b>✅ ${config.name} añadido</b>\n\n`;
        message += `<b>ID:</b> ${id}\n`;
        message += `<b>Ubicación:</b> ${location}\n`;
        message += `<b>Estado:</b> ${status}\n\n`;
        message += `El nuevo ${config.name.toLowerCase()} ha sido registrado.`;

        const keyboard = [
            [
                Markup.button.callback('➕ Añadir otro', `access_config_add:${station.code}:${elementType}`),
                Markup.button.callback('⚙️ Configuración', `access_config:${station.code}`)
            ],
            [
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.replyWithHTML(message, {
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'añadir elemento');
    }
}

// Remove element menu
async function showRemoveElementMenu(ctx, stationId) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code.toUpperCase() === stationId.toUpperCase() 
        );
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        let message = `<b>➖ Eliminar elemento - ${station.displayName}</b>\n\n`;
        message += `Selecciona el elemento a eliminar:`;

        const keyboard = [];

        if (station.accessDetails.elevators?.length > 0) {
            keyboard.push([Markup.button.callback('🛗 Ascensores', `access_status:${station.code}:elevator`)]);
            station.accessDetails.elevators.forEach(elevator => {
                keyboard.push([
                    Markup.button.callback(
                        `❌ ${elevator.id} (${elevator.status})`,
                        `access_remove_confirm:${station.code}:elevator:${elevator.id}`
                    )
                ]);
            });
        }

        if (station.accessDetails.escalators?.length > 0) {
            keyboard.push([Markup.button.callback('🪜 Escaleras', `access_status:${station.code}:escalator`)]);
            station.accessDetails.escalators.forEach(escalator => {
                keyboard.push([
                    Markup.button.callback(
                        `❌ ${escalator.id} (${escalator.status})`,
                        `access_remove_confirm:${station.code}:escalator:${escalator.id}`
                    )
                ]);
            });
        }

        if (station.accessDetails.accesses?.length > 0) {
            keyboard.push([Markup.button.callback('🚪 Accesos', `access_status:${station.code}:access`)]);
            station.accessDetails.accesses.forEach(access => {
                keyboard.push([
                    Markup.button.callback(
                        `❌ ${access.id} (${access.status})`,
                        `access_remove_confirm:${station.code}:access:${access.id}`
                    )
                ]);
            });
        }

        if (keyboard.length === 0) {
            message += '\n\nNo hay elementos configurados para eliminar.';
        }

        keyboard.push([
            Markup.button.callback('🔙 Volver', `access_config:${station.code}`),
            Markup.button.callback('🏠 Menú principal', 'access_main')
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar menú de eliminación');
    }
}

// Remove element
async function removeElement(ctx, stationId, elementType, elementId) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );

        const config = STATUS_CONFIG[elementType];
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        const elements = station.accessDetails[`${elementType}s`];
        const index = elements.findIndex(e => e.id === elementId);

        if (index === -1) {
            throw new Error('Elemento no encontrado');
        }

        const [removedElement] = elements.splice(index, 1);

        // Add to changelog
        station.accessDetails.changeHistory.push({
            timestamp: TimeHelpers.currentTime.toISOString(),
            user: `${ctx.from.first_name} (${ctx.from.id})`,
            action: `Eliminado ${config.name.toLowerCase()} ${elementId}`
        });

        // Save changes to JSON file
        await saveAccessConfig(station.displayName, station.accessDetails);
        await updateMainAccessibilityStatus(station.displayName, station.accessDetails);

        let message = `<b>✅ Elemento eliminado</b>\n\n`;
        message += `<b>Tipo:</b> ${config.name}\n`;
        message += `<b>ID:</b> ${elementId}\n`;
        message += `<b>Ubicación:</b> ${removedElement.name}\n`;
        message += `<b>Estado:</b> ${removedElement.status}\n\n`;
        message += `El elemento ha sido eliminado de la configuración.`;

        const keyboard = [
            [
                Markup.button.callback('➖ Eliminar otro', `access_config_remove:${station.code}`),
                Markup.button.callback('⚙️ Configuración', `access_config:${station.code}`)
            ],
            [
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'eliminar elemento');
    }
}

// Advanced edit functionality
async function showAdvancedEditMenu(ctx) {
    try {
        const metro = await getMetroCore();
        const stations = Object.values(metro._staticData.stations)
            .filter(s => s.accessDetails)
            .sort((a, b) => a.displayName.localeCompare(b.displayName));

        if (stations.length === 0) {
            return ctx.reply('No hay estaciones con configuración de accesibilidad para editar.');
        }

        let message = `<b>⚙️ Edición Avanzada</b>\n\n`;
        message += `Selecciona estaciones para edición masiva:`;

        const keyboard = stations.map(station => [
            Markup.button.callback(
                `${station.displayName}`,
                `access_aedit_station:${station.code}`
            )
        ]);

        keyboard.push([
            Markup.button.callback('🔙 Menú principal', 'access_main')
        ]);

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar menú de edición avanzada');
    }
}

async function showAdvancedEditStationOptions(ctx, stationId) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        let message = `<b>⚙️ Edición Avanzada - ${station.displayName}</b>\n\n`;
        message += `Selecciona qué campo deseas editar:`;

        const keyboard = [
            [
                Markup.button.callback('🛗 Ascensores', `access_aedit_field:${station.code}:elevators`),
                Markup.button.callback('🪜 Escaleras', `access_aedit_field:${station.code}:escalators`)
            ],
            [
                Markup.button.callback('🚪 Accesos', `access_aedit_field:${station.code}:accesses`),
                Markup.button.callback('📝 Notas', `access_aedit_field:${station.code}:notes`)
            ],
            [
                Markup.button.callback('🔙 Atrás', 'access_aedit_start'),
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar opciones de edición');
    }
}

async function showAdvancedEditFieldOptions(ctx, stationId, field) {
    try {
        const fieldNames = {
            'elevators': 'ascensores',
            'escalators': 'escaleras',
            'accesses': 'accesos',
            'notes': 'notas'
        };

        if (!fieldNames[field]) {
            throw new Error('Campo no válido para edición');
        }

        ctx.session.editingContext = {
            action: 'aedit',
            stationId,
            field,
            timestamp: TimeHelpers.currentTime.getTime()
        };

        let message = `<b>⚙️ Edición Avanzada</b>\n\n`;
        message += `Editando ${fieldNames[field]} para la estación seleccionada.\n\n`;
        
        if (field === 'notes') {
            message += `Envía las nuevas notas para esta estación:`;
        } else {
            message += `Envía el nuevo valor para este campo en formato JSON:\n\n`;
            message += `Ejemplo para ascensores:\n<code>[{"id": "A1", "name": "Andén norte", "status": "operativa"}]</code>`;
        }

        const keyboard = [
            [
                Markup.button.callback('❌ Cancelar', `access_aedit_station:${stationId}`),
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar opciones de campo');
    }
}

async function handleAdvancedEditInput(ctx, stationId, field, inputText) {
    try {
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.name === stationId || s.code === stationId.trim() 
        );
        
        if (!station) {
            throw new Error('Estación no encontrada');
        }

        // Load from JSON file
        const accessDetails = await getAccessConfig(station.displayName, station.line);
        station.accessDetails = accessDetails;

        if (field === 'notes') {
            station.accessDetails.notes = inputText;
        } else {
            try {
                const newValue = JSON.parse(inputText);
                if (!Array.isArray(newValue)) {
                    throw new Error('Se esperaba un array de elementos');
                }
                
                const requiredFields = ['id', 'status'];
                for (const element of newValue) {
                    for (const field of requiredFields) {
                        if (!element[field]) {
                            throw new Error(`Falta el campo requerido: ${field}`);
                        }
                    }
                }
                
                station.accessDetails[field] = newValue;
            } catch (error) {
                throw new Error(`Error al parsear JSON: ${error.message}`);
            }
        }

        // Add to changelog
        station.accessDetails.changeHistory.push({
            timestamp: TimeHelpers.currentTime.toISOString(),
            user: `${ctx.from.first_name} (${ctx.from.id})`,
            action: `Edición avanzada de ${field}`
        });

        // Save changes to JSON file
        await saveAccessConfig(station.displayName, station.accessDetails);
        await updateMainAccessibilityStatus(station.displayName, station.accessDetails);
        delete ctx.session.editingContext;

        let message = `<b>✅ Edición completada</b>\n\n`;
        message += `El campo <b>${field}</b> ha sido actualizado.`;

        const keyboard = [
            [
                Markup.button.callback('⚙️ Editar otro campo', `access_aedit_station:${station.code}`),
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.replyWithHTML(message, {
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'procesar edición avanzada');
    }
}

// Replace functionality
async function showReplaceMenu(ctx) {
    try {
        ctx.session.editingContext = {
            action: 'replace',
            timestamp: TimeHelpers.currentTime.getTime()
        };

        let message = `<b>🔄 Reemplazo Masivo</b>\n\n`;
        message += `Esta herramienta permite reemplazar valores en múltiples estaciones.\n\n`;
        message += `Envía el valor a buscar y el valor de reemplazo en el formato:\n`;
        message += `<code>valor_buscar → valor_reemplazo</code>\n\n`;
        message += `Ejemplo: <code>fuera de servicio → operativa</code>\n\n`;
        message += `También puedes especificar el ámbito:\n`;
        message += `<code>valor_buscar → valor_reemplazo → ascensores</code>`;

        const keyboard = [
            [
                Markup.button.callback('❌ Cancelar', 'access_main'),
                Markup.button.callback('ℹ️ Ejemplos', 'access_replace_examples')
            ]
        ];

        await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'mostrar menú de reemplazo');
    }
}

async function handleReplaceInput(ctx, inputText) {
    try {
        const parts = inputText.split('→').map(s => s.trim());
        if (parts.length < 2) {
            throw new Error('Formato incorrecto. Usa: valor_buscar → valor_reemplazo');
        }

        const searchValue = parts[0];
        const replaceValue = parts[1];
        const scope = parts[2] || 'all';

        if (!searchValue || !replaceValue) {
            throw new Error('Debes especificar ambos valores');
        }

        await executeReplace(ctx, searchValue, replaceValue, scope);
    } catch (error) {
        handleError(ctx, error, 'procesar reemplazo');
    }
}

async function executeReplace(ctx, searchValue, replaceValue, scope = 'all') {
    try {
        const metro = await getMetroCore();
        const stations = Object.values(metro._staticData.stations);

        let affectedStations = 0;
        let affectedElements = 0;
        const scopes = scope === 'all' 
            ? ['elevators', 'escalators', 'accesses'] 
            : [scope.endsWith('s') ? scope : `${scope}s`];

        for (const station of stations) {
            const accessDetails = await getAccessConfig(station.displayName, station.line);
            if (!accessDetails) continue;

            let stationChanged = false;
            
            for (const scope of scopes) {
                if (!accessDetails[scope]) continue;
                
                for (const element of accessDetails[scope]) {
                    if (element.status === searchValue) {
                        element.status = replaceValue;
                        element.lastUpdated = TimeHelpers.currentTime.toISOString();
                        affectedElements++;
                        stationChanged = true;
                    }
                }
            }

            if (stationChanged) {
                affectedStations++;
                
                accessDetails.changeHistory.push({
                    timestamp: TimeHelpers.currentTime.toISOString(),
                    user: `${ctx.from.first_name} (${ctx.from.id})`,
                    action: `Reemplazo masivo: "${searchValue}" → "${replaceValue}"`
                });

                await saveAccessConfig(station.displayName, accessDetails);
                await updateMainAccessibilityStatus(station.displayName, accessDetails);
            }
        }

        delete ctx.session.editingContext;

        let message = `<b>✅ Reemplazo completado</b>\n\n`;
        message += `<b>Buscado:</b> "${searchValue}"\n`;
        message += `<b>Reemplazado por:</b> "${replaceValue}"\n`;
        message += `<b>Ámbito:</b> ${scope === 'all' ? 'Todos los elementos' : scope}\n\n`;
        message += `<b>Estaciones afectadas:</b> ${affectedStations}\n`;
        message += `<b>Elementos actualizados:</b> ${affectedElements}`;

        const keyboard = [
            [
                Markup.button.callback('🔄 Otro reemplazo', 'access_replace_start'),
                Markup.button.callback('🏠 Menú principal', 'access_main')
            ]
        ];

        await ctx.replyWithHTML(message, {
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        handleError(ctx, error, 'ejecutar reemplazo');
    }
}

// Command handlers for text commands
async function handleConfigure(ctx, args) {
    try {
        if (args.length < 1) {
            throw new Error('Uso: /stationaccess config <estación> [parámetros]');
        }

        const stationName = args.join(' ');
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.displayName.toLowerCase().includes(stationName.toLowerCase())
        );

        if (!station) {
            throw new Error('Estación no encontrada');
        }

        await showStationConfigMenu(ctx, station.id);
    } catch (error) {
        handleError(ctx, error, 'configurar estación');
    }
}

async function handleStatus(ctx, args) {
    try {
        if (args.length < 4) {
            throw new Error('Uso: /stationaccess status <estación> <tipo> <id> <nuevo estado>');
        }

        const stationName = args[0];
        const elementType = args[1];
        const elementId = args[2];
        const newStatus = args.slice(3).join(' ');

        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.displayName.toLowerCase().includes(stationName.toLowerCase())
        );

        if (!station) {
            throw new Error('Estación no encontrada');
        }

        if (!STATUS_CONFIG[elementType]) {
            throw new Error(`Tipo de elemento no válido. Usa: ${Object.keys(STATUS_CONFIG).join(', ')}`);
        }

        await updateElementStatus(ctx, station.id, elementType, elementId, newStatus);
    } catch (error) {
        handleError(ctx, error, 'actualizar estado');
    }
}

async function handleView(ctx, args) {
    try {
        if (args.length < 1) {
            throw new Error('Uso: /stationaccess view <estación>');
        }

        const stationName = args.join(' ');
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.displayName.toLowerCase().includes(stationName.toLowerCase())
        );

        if (!station) {
            throw new Error('Estación no encontrada');
        }

        await showStationAccessInfo(ctx, station.id);
    } catch (error) {
        handleError(ctx, error, 'ver información de estación');
    }
}

async function handleHistory(ctx, args) {
    try {
        if (args.length < 1) {
            return showGlobalHistory(ctx);
        }

        const stationName = args.join(' ');
        const metro = await getMetroCore();
        const station = Object.values(metro._staticData.stations).find(s => 
            s.displayName.toLowerCase().includes(stationName.toLowerCase())
        );

        if (!station) {
            throw new Error('Estación no encontrada');
        }

        await showStationHistory(ctx, station.id);
    } catch (error) {
        handleError(ctx, error, 'mostrar historial');
    }
}

async function handleAdvancedEdit(ctx, args) {
    try {
        if (args.length > 0) {
            const stationName = args[0];
            const field = args[1] || 'all';
            
            const metro = await getMetroCore();
            const station = Object.values(metro._staticData.stations).find(s => 
                s.displayName.toLowerCase().includes(stationName.toLowerCase())
            );

            if (!station) {
                throw new Error('Estación no encontrada');
            }

            ctx.session.editingContext = {
                action: 'aedit',
                stationId: station.id,
                field,
                timestamp: TimeHelpers.currentTime.getTime()
            };

            return showAdvancedEditFieldOptions(ctx, station.id, field);
        }

        await showAdvancedEditMenu(ctx);
    } catch (error) {
        handleError(ctx, error, 'iniciar edición avanzada');
    }
}

async function handleReplace(ctx, args) {
    try {
        if (args.length >= 2) {
            const searchValue = args[0];
            const replaceValue = args[1];
            const scope = args[2] || 'all';
            
            return executeReplace(ctx, searchValue, replaceValue, scope);
        }

        await showReplaceMenu(ctx);
    } catch (error) {
        handleError(ctx, error, 'iniciar reemplazo');
    }
}
