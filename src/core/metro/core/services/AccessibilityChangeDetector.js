const axios = require('axios');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('../../../../bot/discord/commands/slash/Bot_Info/bot.js');
const { getClient } = require('../../../../utils/clientManager');
const TimeHelpers = require('../../../chronos/timeHelpers');
const { EmbedBuilder } = require('discord.js');
const metroConfig = require('../../../../config/metro/metroConfig');
const loadJsonFile = require('../../../../utils/jsonLoader.js');

const API_URL = process.env.ACCESSARIEL; // Ensure this is set in your environment
const STATE_FILE = path.join(__dirname, 'lastAccessState.json');
const CACHE_FILE = path.join(__dirname, 'accessibilityCache.json');
const TELEGRAM_CHANNEL = '804';
const DISCORD_CHANNEL = '1381634611225821346';
const DISCORD_SUMMARY_CHANNEL = '901592257591930920';

// MetroCore instance management (singleton pattern)
let metroCoreInstance = null;
async function getMetroCore() {
    if (!metroCoreInstance) {
        const MetroCore = require('../MetroCore');
        metroCoreInstance = await MetroCore.getInstance();
    }
    return metroCoreInstance;
}

class AccessibilityChangeDetector {
    constructor() {
        this.logger = {
            info: (message) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
            warn: (message) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
            error: (message) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`)
        };

        this.timeHelpers = TimeHelpers;  // Initialize TimeHelpers instance
        this.initializeStorage();
        this.lastStates = this.loadDataFile(STATE_FILE, 'last state');
        this.cachedStates = this.loadDataFile(CACHE_FILE, 'cache');

        if (Object.keys(this.cachedStates).length === 0 && Object.keys(this.lastStates).length > 0) {
            this.logger.info('Initializing cache from last state data');
            this.cachedStates = JSON.parse(JSON.stringify(this.lastStates));
            this.saveCache(this.cachedStates);
        }
    }

    initializeStorage() {
        try {
            const dir = path.dirname(CACHE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.logger.info(`Created storage directory: ${dir}`);
            }

            [STATE_FILE, CACHE_FILE].forEach(file => {
                if (!fs.existsSync(file)) {
                    fs.writeFileSync(file, JSON.stringify({}, null, 2));
                    this.logger.info(`Initialized empty file: ${file}`);
                }
            });
        } catch (error) {
            this.logger.error(`Storage initialization failed: ${error.message}`);
            throw error;
        }
    }

    loadDataFile(filePath, type) {
        try {
            const data = loadJsonFile(filePath);
            
            if (typeof data !== 'object' || data === null) {
                throw new Error(`Invalid ${type} file structure`);
            }

            this.logger.info(`Loaded ${type} data from ${filePath}`);
            return this.cleanData(data);
        } catch (error) {
            this.logger.error(`Error loading ${type} data: ${error.message}`);
            
            if (fs.existsSync(filePath) && error instanceof SyntaxError) {
                const backupPath = `${filePath}.bak`;
                fs.copyFileSync(filePath, backupPath);
                this.logger.warn(`Created backup of corrupted file at ${backupPath}`);
            }

            return {};
        }
    }

    cleanData(data) {
        const cleanData = {};
        for (const [id, equipment] of Object.entries(data)) {
            if (!equipment || typeof equipment !== 'object') continue;
            
            cleanData[id] = {
                time: equipment.time || this.timeHelpers.currentTime.toISOString(),
                estado: equipment.estado !== undefined ? equipment.estado : -1,
                tipo: equipment.tipo || 'unknown',
                estacion: equipment.estacion || 'unknown',
                texto: equipment.texto || 'No description'
            };
        }
        return cleanData;
    }

    saveLastStates(newData = null) {
        try {
            if (newData) {
                this.lastStates = newData;
            }
            const cleanData = this.cleanData(this.lastStates);
            fs.writeFileSync(STATE_FILE, JSON.stringify(cleanData, null, 2));
            this.logger.info(`Saved last states to ${STATE_FILE}`);
        } catch (error) {
            this.logger.error(`Error saving last states: ${error.message}`);
        }
    }

    saveCache(data) {
        try {
            const cleanData = this.cleanData(data);
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cleanData, null, 2));
            this.cachedStates = cleanData;
            this.logger.info(`Updated cache at ${CACHE_FILE}`);
        } catch (error) {
            this.logger.error(`Error saving cache: ${error.message}`);
        }
    }

    isWithinUpdateWindow() {
        const currentTime = this.timeHelpers.currentTime;
        const currentHour = currentTime.hour();
        const currentMinute = currentTime.minute();
        
        const isFirstWindow = (
            currentHour === 6 && 
            currentMinute >= 20 && 
            currentMinute <= 25
        );
        
        const isSecondWindow = (
            currentHour === 9 && 
            currentMinute >= 20 && 
            currentMinute <= 24
        );
        
        const isThirdWindow = (
            currentHour === 12 && 
            currentMinute >= 48 && 
            currentMinute <= 51
        );

        const isFourthWindow = (
            currentHour === 16 && 
            currentMinute >= 10 && 
            currentMinute <= 15
        );

        const isFifthWindow = (
            currentHour === 20 && 
            currentMinute >= 40 && 
            currentMinute <= 45
        );
        
        return isFirstWindow || isSecondWindow || isThirdWindow || isFourthWindow || isFifthWindow;
    }

    async checkAccessibility() {
        try {
            const withinWindow = this.isWithinUpdateWindow();
            this.logger.info(`Starting accessibility check. Within update window: ${withinWindow}`);

            let currentStates;
            let dataSource;
            let comparisonBaseline;
            
            if (withinWindow) {
                // During window: fetch live API data
                this.logger.info('Fetching fresh data from API');
                const response = await axios.get(API_URL);
                currentStates = response.data;
                dataSource = 'API';
                comparisonBaseline = this.lastStates;
                this.saveCache(currentStates);
            } else {
                // Outside window: use cached data
                if (Object.keys(this.cachedStates).length > 0) {
                    currentStates = this.cachedStates;
                    comparisonBaseline = this.lastStates;
                    dataSource = 'cache';
                    this.logger.info('Using cached data for comparison');
                } else {
                    this.logger.error('No cached data available');
                    return [];
                }
            }

            const cleanCurrentStates = this.cleanData(currentStates);
            const cleanComparisonBaseline = this.cleanData(comparisonBaseline);

            if (Object.keys(cleanComparisonBaseline).length === 0) {
                this.logger.info('First run detected, saving initial state');
                this.saveLastStates(cleanCurrentStates);
                return [];
            }
            
            const changes = this.detectChanges(cleanCurrentStates, cleanComparisonBaseline);
            this.logger.info(`Detected ${changes.length} changes`);

            if (changes.length > 0) {
                await this.notifyChanges(changes);
                
                // Always update lastStates when changes are detected
                this.logger.info('Updating lastStates with current data');
                this.saveLastStates(cleanCurrentStates);
            }

            this.cachedStates = this.loadDataFile(CACHE_FILE, 'cache');
            
            return changes;
        } catch (error) {
            this.logger.error(`Error in accessibility check: ${error.message}`);
            return [];
        }
    }

    detectChanges(currentStates, comparisonBaseline) {
        const changes = [];
        
        // Detect new equipment and state changes
        for (const [equipmentId, currentData] of Object.entries(currentStates)) {
            const lastData = comparisonBaseline[equipmentId];
            
            if (!lastData) {
                changes.push({
                    equipmentId,
                    type: 'new',
                    current: currentData,
                });
                this.logger.info(`New equipment detected: ${equipmentId}`);
            } else if (lastData.estado !== currentData.estado) {
                changes.push({
                    equipmentId,
                    type: 'state_change',
                    previous: lastData,
                    current: currentData,
                });
                this.logger.info(`State change detected for equipment: ${equipmentId}`);
            }
        }
        
        // Detect removed equipment
        for (const equipmentId of Object.keys(comparisonBaseline)) {
            if (!currentStates[equipmentId]) {
                changes.push({
                    equipmentId,
                    type: 'removed',
                    previous: comparisonBaseline[equipmentId],
                });
                this.logger.info(`Equipment removed: ${equipmentId}`);
            }
        }
        
        return changes;
    }

    async notifyChanges(changes) {
        try {
            // Telegram message (split into multiple messages if too long)
            const telegramMessages = await this.formatTelegramMessages(changes);
            if (telegramMessages.length > 0) {
                this.logger.info(`Sending ${telegramMessages.length} Telegram message(s)`);
                for (const message of telegramMessages) {
                    await TelegramBot.sendTelegramMessage(message, { parse_mode: 'Markdown' });
                    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
                }
            }

            // Discord embeds
            const client = getClient();
            
            // Original detailed embeds
            const statusChannel = client.channels.cache.get(DISCORD_CHANNEL);
            if (statusChannel) {
                const discordEmbeds = await this.formatDiscordEmbeds(changes);
                if (discordEmbeds.length > 0) {
                    this.logger.info(`Sending ${discordEmbeds.length} Discord embed(s) to main channel`);
                    for (let i = 0; i < discordEmbeds.length; i += 5) {
                        const batch = discordEmbeds.slice(i, i + 5);
                        await statusChannel.send({ embeds: batch });
                        if (i + 5 < discordEmbeds.length) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
            }
            
            // New summary embeds
            const summaryChannel = client.channels.cache.get(DISCORD_SUMMARY_CHANNEL);
            if (summaryChannel && changes.length > 0) {
                const metro = await getMetroCore();
                const summaryEmbeds = this.formatSummaryEmbeds(changes, metro);
                if (summaryEmbeds.length > 0) {
                    this.logger.info(`Sending ${summaryEmbeds.length} summary embed(s) to summary channel`);
                    await summaryChannel.send({ embeds: summaryEmbeds });
                }
            }
        } catch (error) {
            this.logger.error(`Error notifying changes: ${error.message}`);
        }
    }

    formatSummaryEmbeds(changes, metro) {
    const elevators = [];
    const escalators = [];
    
    // Separate changes by equipment type
    changes.forEach(change => {
        const equipment = change.current || change.previous;
        if (!equipment) return;
        
        const isElevator = equipment.tipo.toLowerCase().includes('ascensor');
        const isEscalator = equipment.tipo.toLowerCase().includes('escalera');
        
        if (isElevator) {
            elevators.push(change);
        } else if (isEscalator) {
            escalators.push(change);
        }
    });
    
    const embeds = [];
    
    // Elevator Embed
    if (elevators.length > 0) {
        const nowOperational = [];
        const nowNonOperational = [];
        
        elevators.forEach(change => {
            const stationCode = change.equipmentId.split('-')[0];
            const station = Object.values(metro._staticData.stations).find(s => s.code === stationCode);
            const lineNumber = station?.line || '?';
            const stationName = station?.displayName || stationCode;
            
            const equipmentText = change.current?.texto || change.previous?.texto;
            
            if (change.type === 'state_change' || change.type === 'new') {
                if (change.current?.estado === 1) {
                    nowOperational.push(`- ${metroConfig.linesEmojis[lineNumber]} ${stationName}:\n  - ${equipmentText}`);
                } else if (change.current?.estado === 0) {
                    nowNonOperational.push(`- ${metroConfig.linesEmojis[lineNumber]} ${stationName}:\n  - ${equipmentText}`);
                }
            }
        });
        
        // Split into multiple embeds if needed
        const maxFieldLength = 1000; // Discord field limit
        const maxEmbedLength = 6000; // Discord embed limit
        
        // Create elevator embeds with proper chunking
        let elevatorEmbed = new EmbedBuilder()
            .setColor(0x0052A5)
            .setTitle('♿ Resumen de Actualización de Accesibilidad (Ascensores)')
            .setDescription(`Actualizado: ${this.timeHelpers.formatDateTime('DD/MM/YYYY HH:mm')}\n\n`)
            .setTimestamp();
        
        // Add operational changes in chunks
        if (nowOperational.length > 0) {
            let operationalChunks = this.chunkArray(nowOperational.join('\n'), maxFieldLength);
            operationalChunks.forEach((chunk, index) => {
                if (index > 0 || elevatorEmbed.toJSON().fields?.length > 0) {
                    // If we already have fields or this is a subsequent chunk, create new embed
                    embeds.push(elevatorEmbed);
                    elevatorEmbed = new EmbedBuilder()
                        .setColor(0x0052A5)
                        .setTitle('♿ Resumen de Actualización de Accesibilidad (Ascensores) - Continuación')
                        .setTimestamp();
                }
                elevatorEmbed.addFields({
                    name: '- ✅ Ascensores ahora operativos',
                    value: chunk,
                    inline: false
                });
            });
        }
        
        // Add non-operational changes in chunks
        if (nowNonOperational.length > 0) {
            let nonOperationalChunks = this.chunkArray(nowNonOperational.join('\n'), maxFieldLength);
            nonOperationalChunks.forEach((chunk, index) => {
                if (elevatorEmbed.toJSON().fields?.length >= 5 || 
                    JSON.stringify(elevatorEmbed.toJSON()).length > maxEmbedLength - 2000) {
                    embeds.push(elevatorEmbed);
                    elevatorEmbed = new EmbedBuilder()
                        .setColor(0x0052A5)
                        .setTitle('♿ Resumen de Actualización de Accesibilidad (Ascensores) - Continuación')
                        .setTimestamp();
                }
                elevatorEmbed.addFields({
                    name: '- ❌ Ascensores ahora fuera de servicio',
                    value: chunk,
                    inline: false
                });
            });
        }
        
        // Add the last elevator embed if it has content
        if (elevatorEmbed.toJSON().fields?.length > 0) {
            embeds.push(elevatorEmbed);
        }
    }
    
    // Escalator Embed
    if (escalators.length > 0) {
        const nowOperational = [];
        const nowNonOperational = [];
        
        escalators.forEach(change => {
            const stationCode = change.equipmentId.split('-')[0];
            const station = Object.values(metro._staticData.stations).find(s => s.code === stationCode);
            const lineNumber = station?.line || '?';
            const stationName = station?.displayName || stationCode;
            
            const equipmentText = change.current?.texto || change.previous?.texto;
            
            if (change.type === 'state_change' || change.type === 'new') {
                if (change.current?.estado === 1) {
                    nowOperational.push(`- ${metroConfig.linesEmojis[lineNumber]} ${stationName}:\n  - ${equipmentText}`);
                } else if (change.current?.estado === 0) {
                    nowNonOperational.push(`- ${metroConfig.linesEmojis[lineNumber]} ${stationName}:\n  - ${equipmentText}`);
                }
            }
        });
        
        // Split into multiple embeds if needed
        const maxFieldLength = 1000; // Discord field limit
        const maxEmbedLength = 6000; // Discord embed limit
        
        // Create escalator embeds with proper chunking
        let escalatorEmbed = new EmbedBuilder()
            .setColor(0x0052A5)
            .setTitle('♿ Resumen de Actualización de Accesibilidad (Escaleras Mecánicas)')
            .setDescription(`Actualizado: ${this.timeHelpers.formatDateTime('DD/MM/YYYY HH:mm')}\n\n`)
            .setTimestamp();
        
        // Add operational changes in chunks
        if (nowOperational.length > 0) {
            let operationalChunks = this.chunkArray(nowOperational.join('\n'), maxFieldLength);
            operationalChunks.forEach((chunk, index) => {
                if (index > 0 || escalatorEmbed.toJSON().fields?.length > 0) {
                    // If we already have fields or this is a subsequent chunk, create new embed
                    embeds.push(escalatorEmbed);
                    escalatorEmbed = new EmbedBuilder()
                        .setColor(0x0052A5)
                        .setTitle('♿ Resumen de Actualización de Accesibilidad (Escaleras Mecánicas) - Continuación')
                        .setTimestamp();
                }
                escalatorEmbed.addFields({
                    name: '- ✅ Escaleras ahora operativas',
                    value: chunk,
                    inline: false
                });
            });
        }
        
        // Add non-operational changes in chunks
        if (nowNonOperational.length > 0) {
            let nonOperationalChunks = this.chunkArray(nowNonOperational.join('\n'), maxFieldLength);
            nonOperationalChunks.forEach((chunk, index) => {
                if (escalatorEmbed.toJSON().fields?.length >= 5 || 
                    JSON.stringify(escalatorEmbed.toJSON()).length > maxEmbedLength - 2000) {
                    embeds.push(escalatorEmbed);
                    escalatorEmbed = new EmbedBuilder()
                        .setColor(0x0052A5)
                        .setTitle('♿ Resumen de Actualización de Accesibilidad (Escaleras Mecánicas) - Continuación')
                        .setTimestamp();
                }
                escalatorEmbed.addFields({
                    name: '- ❌ Escaleras ahora fuera de servicio',
                    value: chunk,
                    inline: false
                });
            });
        }
        
        // Add the last escalator embed if it has content
        if (escalatorEmbed.toJSON().fields?.length > 0) {
            embeds.push(escalatorEmbed);
        }
    }
    
    return embeds;
}

// Helper method to split long strings into chunks
chunkArray(str, size) {
    const chunks = [];
    for (let i = 0; i < str.length; i += size) {
        chunks.push(str.substring(i, i + size));
    }
    return chunks;
}
    
    async formatTelegramMessages(changes) {
        if (!changes || changes.length === 0) return [];

        const metro = await getMetroCore();
        const messages = [];
        let currentMessage = '♿ *Actualización de Accesibilidad* ♿\n\n';
        
        // Group changes by line → station → equipment type
        const groupedChanges = this.groupChanges(changes, metro);

        for (const [lineDisplay, stations] of Object.entries(groupedChanges)) {
            let lineSection = `*${lineDisplay}*\n`;
            
            for (const [stationName, equipmentTypes] of Object.entries(stations)) {
                let stationSection = `*${stationName}* (${Object.values(equipmentTypes).flat().length} cambios)\n`;
                
                for (const [equipType, equipChanges] of Object.entries(equipmentTypes)) {
                    let typeSection = `_${equipType}_\n`;
                    
                    for (const change of equipChanges) {
                        const changeText = this.formatChangeText(change);
                        
                        // Check if adding this would exceed Telegram's 4096 character limit
                        if (currentMessage.length + lineSection.length + stationSection.length + 
                            typeSection.length + changeText.length > 4000) {
                            // Finalize current message
                            currentMessage += `\n_Actualizado: ${this.timeHelpers.formatDateTime()}_`;
                            messages.push(currentMessage);
                            
                            // Start new message
                            currentMessage = '♿ *Actualización de Accesibilidad* ♿ (cont.)\n\n';
                            lineSection = `*${lineDisplay}*\n`;
                            stationSection = `*${stationName}* (${Object.values(equipmentTypes).flat().length} cambios)\n`;
                            typeSection = `_${equipType}_\n`;
                        }
                        
                        typeSection += changeText;
                    }
                    
                    stationSection += typeSection + '\n';
                }
                
                lineSection += stationSection + '\n';
            }
            
            currentMessage += lineSection;
        }
        
        // Add final message if it has content
        if (currentMessage.length > 50) { // More than just the header
            currentMessage += `\n_Actualizado: ${this.timeHelpers.formatDateTime()}_`;
            messages.push(currentMessage);
        }
        
        return messages;
    }

    async formatDiscordEmbeds(changes) {
        if (!changes || changes.length === 0) return [];

        const metro = await getMetroCore();
        const embeds = [];
        
        // Group changes by line → station → equipment type
        const groupedChanges = this.groupChanges(changes, metro);

        let currentEmbed = new EmbedBuilder()
            .setColor(0x0052A5)
            .setTitle(`${metroConfig.accessibility.logo} Actualización de Accesibilidad`)
            .setTimestamp();
        
        for (const [lineDisplay, stations] of Object.entries(groupedChanges)) {
            let lineField = {
                name: lineDisplay,
                value: '',
                inline: false
            };
            
            for (const [stationName, equipmentTypes] of Object.entries(stations)) {
                let stationSection = `**${stationName}** (${Object.values(equipmentTypes).flat().length} cambios)\n`;
                
                for (const [equipType, equipChanges] of Object.entries(equipmentTypes)) {
                    let typeSection = `*${equipType}*\n`;
                    
                    for (const change of equipChanges) {
                        typeSection += this.formatChangeText(change);
                    }
                    
                    stationSection += typeSection + '\n';
                }
                
                // Check if adding this station would exceed field limit (1024 chars)
                if (lineField.value.length + stationSection.length > 1000) {
                    // Add current line field to embed
                    if (lineField.value) {
                        currentEmbed.addFields(lineField);
                    }
                    
                    // Check if embed is getting too big (fields + title = ~6000 chars)
                    if (currentEmbed.toJSON().fields?.length >= 5 || 
                        JSON.stringify(currentEmbed.toJSON()).length > 5500) {
                        embeds.push(currentEmbed);
                        currentEmbed = new EmbedBuilder()
                            .setColor(0x0052A5)
                            .setTitle(`${metroConfig.accessibility.logo} Actualización de Accesibilidad`)
                            .setTimestamp();
                    }
                    
                    // Start new line field
                    lineField = {
                        name: lineDisplay,
                        value: stationSection,
                        inline: false
                    };
                } else {
                    lineField.value += stationSection;
                }
            }
            
            // Add remaining line field
            if (lineField.value) {
                currentEmbed.addFields(lineField);
            }
        }
        
        // Add final embed if it has content
        if (currentEmbed.toJSON().fields?.length > 0) {
            embeds.push(currentEmbed);
        }
        
        return embeds;
    }

    groupChanges(changes, metro) {
        return changes.reduce((acc, change) => {
            const stationCode = change.equipmentId.split('-')[0];
            const station = Object.values(metro._staticData.stations).find(s => s.code === stationCode);
            
            const lineNumber = station?.line || 'Desconocida';
            const lineKey = station?.line ? `l${station.line}` : 'unknown';
            const lineEmoji = metroConfig.linesEmojis[lineKey] || '';
            const lineDisplay = lineEmoji ? `${lineEmoji} Línea ${lineNumber}` : `Línea ${lineNumber}`;
            const stationName = station?.displayName || stationCode;
            const equipType = change.current?.tipo || change.previous?.tipo || 'Equipo';
            
            if (!acc[lineDisplay]) acc[lineDisplay] = {};
            if (!acc[lineDisplay][stationName]) acc[lineDisplay][stationName] = {};
            if (!acc[lineDisplay][stationName][equipType]) acc[lineDisplay][stationName][equipType] = [];
            
            acc[lineDisplay][stationName][equipType].push(change);
            return acc;
        }, {});
    }

    formatChangeText(change) {
        let text = '';
        if (change.type === 'new') {
            text = `➕ Nuevo: ${change.current.texto} - `;
            text += `Estado: ${change.current.estado === 1 ? '✅ Operativo' : '❌ Fuera de servicio'}`;
        } else if (change.type === 'state_change') {
            text = `🔄 Cambio: ${change.current.texto}\n`;
            text += `- De: ${change.previous.estado === 1 ? '✅ Operativo' : '❌ Fuera de servicio'}\n`;
            text += `- A: ${change.current.estado === 1 ? '✅ Operativo' : '❌ Fuera de servicio'}`;
        } else if (change.type === 'removed') {
            text = `➖ Eliminado: ${change.previous.texto || 'Equipo desconocido'}`;
        }
        return text + '\n'; // Ensure each change ends with a newline
    }
}

module.exports = new AccessibilityChangeDetector();
