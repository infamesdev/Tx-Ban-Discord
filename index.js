const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { tokenDiscordBot, allowedChannelsCommand } = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const bansFilePath1 = path.resolve(''); // Ruta del archivo de bans sistema de FiveGuard.
const bansFilePath2 = path.resolve(''); // Ruta del archivo de bans sistema de txAdmin.

let bansCache1 = null;
let bansLastModified = null;
let bansIndex1 = null;
let bansCache2 = null;
let bansLastLoad2 = 0;
let bansIndex2 = null;

client.once('ready', () => console.log('Iniciado Bot de Comunidad Hispana de FiveM!'));

client.login(tokenDiscordBot);

function isBanActive(ban) {
    if (ban.revocation?.timestamp) return false;
    if (ban.expiration === false) return true;
    if (typeof ban.expiration === 'number') {
        return Math.floor(Date.now() / 1000) < ban.expiration;
    }
    return false;
}

function buildIndexBansFile1(bans) {
    const index = {};
    for (const [key, value] of Object.entries(bans)) {
        if (value.discord) index[value.discord] = { key, ...value };
        if (value.license) index[value.license] = { key, ...value };
        if (value.steam) index[value.steam] = { key, ...value };
        if (value.live && value.live !== "Inválido") index[value.live] = { key, ...value };
        if (value.xbl && value.xbl !== "Inválido") index[value.xbl] = { key, ...value };
        if (value.tokens) {
            value.tokens.forEach(token => {
                index[token] = { key, ...value };
            });
        }
    }
    return index;
}

function buildIndexPlayersDB(bans) {
    const index = {};
    const prefixes = ['license:', 'steam:', 'discord:', 'live:', 'xbl:'];
    for (const ban of bans) {
        for (const id of ban.ids || []) {
            const normalizedIds = [id];
            prefixes.forEach(prefix => {
                if (!id.startsWith(prefix)) {
                    normalizedIds.push(`${prefix}${id}`);
                }
            });
            normalizedIds.forEach(normalizedId => {
                index[normalizedId] = ban;
            });
        }
        if (ban.tokens) {
            ban.tokens.forEach(token => {
                index[token] = ban;
            });
        }
    }
    return index;
}

function loadBansFromFile1() {
    try {
        const stats = fs.statSync(bansFilePath1);
        if (!bansCache1 || stats.mtime > bansLastModified) {
            const rawData = fs.readFileSync(bansFilePath1, 'utf8');
            bansCache1 = JSON.parse(rawData);
            bansLastModified = stats.mtime;
            bansIndex1 = buildIndexBansFile1(bansCache1);
        }
    } catch {
        bansCache1 = null;
        bansIndex1 = null;
    }
}

function loadBansFromFile2() {
    const currentTime = Date.now();
    if (!bansCache2 || currentTime - bansLastLoad2 >= 60 * 60 * 1000) {
        try {
            const rawData = fs.readFileSync(bansFilePath2, 'utf8');
            const bansData = JSON.parse(rawData);
            const filteredBans = (bansData.actions || []).filter(action => action.type === 'ban' && isBanActive(action));
            bansIndex2 = buildIndexPlayersDB(filteredBans);
            bansLastLoad2 = currentTime;
        } catch {
            bansCache2 = null;
            bansIndex2 = null;
        }
    }
}

function normalizeIdentifier(userId) {
    const prefixes = ['license:', 'steam:', 'discord:', 'live:', 'xbl:'];
    const possibleIds = [userId];
    prefixes.forEach(prefix => {
        if (!userId.startsWith(prefix)) {
            possibleIds.push(`${prefix}${userId}`);
        }
    });
    return possibleIds;
}

function findBan(identifier, index) {
    if (!index) return null;
    const possibleIds = normalizeIdentifier(identifier);
    for (const id of possibleIds) {
        if (index[id]) return index[id];
    }
    return null;
}

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('+check') || message.author.bot) return;
    if (!allowedChannelsCommand.includes(message.channel.id)) {
        await message.reply('Este comando no está permitido en este canal.');
        return;
    }
    const args = message.content.slice(6).trim().split(' ');
    const userId = args[0];
    if (!userId) {
        await message.reply('Por favor, proporciona un identificador para verificar.');
        return;
    }
    loadBansFromFile1();
    loadBansFromFile2();
    const ban1 = findBan(userId, bansIndex1);
    const ban2 = findBan(userId, bansIndex2);
    const embeds = [];
    if (ban1) {
        const banDate1 = ban1.timestamp ? new Date(ban1.timestamp * 1000).toLocaleString() : 'Desconocido';
        const banAuthor1 = ban1.author || 'Desconocido';
        const identifiers1 = [
            `License: ${ban1.license || 'Desconocido'}`,
            `Steam: ${ban1.steam || 'Desconocido'}`,
            `Discord: ${ban1.discord || 'Desconocido'}`,
            `Live: ${ban1.live || 'Desconocido'}`,
            `Xbl: ${ban1.xbl || 'Desconocido'}`
        ];
        const steamId1 = ban1.ids.find(id => id.startsWith('steam:'));
        const licenseId1 = ban1.ids.find(id => id.startsWith('license:'));
        const discordId1 = ban1.ids.find(id => id.startsWith('discord:'))?.replace('discord:', '');
        const steamLink1 = steamId1 ? `https://steamcommunity.com/profiles/${steamId1.replace('steam:', '')}` : 'No hemos podido encontrar la cuenta de Steam.';
        const fivemLink1 = licenseId1 ? `https://fivem.net/lookup/${licenseId1.replace('license:', '')}` : 'No hemos podido encontrar la cuenta de FiveM.';
        const discordAvatarHash1 = ban1.discordAvatarHash1 || null;
        const discordAvatar1 = discordId1 ? (discordAvatarHash1 ? `https://cdn.discordapp.com/avatars/${discordId1}/${discordAvatarHash1}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`) : null; 
        const embed1 = new EmbedBuilder()
            .setTitle('Se ha detectado un baneo a través del sistema de anticheat.')
            .setColor('#979c9f')
            .setThumbnail(discordAvatar1) 
            .addFields(
                { name: 'Nombre:', value: ban1.name || 'Desconocido' },
                { name: 'Razón:', value: ban1.reason || 'Desconocido' },
                { name: 'Expiración:', value: ban1.expiration === false ? 'PermaBan' : new Date(ban1.expiration * 1000).toLocaleString() || 'Desconocido', inline: true },
                { name: 'Fecha de baneo:', value: banDate1, inline: true }, 
                { name: 'Autor del baneo:', value: banAuthor1, inline: true }, 
                { name: 'Coincidencia en el identificador:', value: userId },
                { name: 'Identificadores:', value: identifiers1.join('\n') },
                { name: 'Cuentas:', value: `${steamLink1}\n${fivemLink1}`, inline: true }
            )
            .setFooter({
                text: '© Comunidad Hispana de FiveM'
            });
        embeds.push(embed1);
    }
    if (ban2 && (!ban1 || ban1.id !== ban2.id)) {
        const banDate = ban2.timestamp ? new Date(ban2.timestamp * 1000).toLocaleString('es-ES', { timeZone: 'UTC' }) : 'Desconocido';
        const banAuthor = ban2.author || 'Desconocido';
        const identifiers2 = [
            `Steam: ${ban2.ids.find(id => id.startsWith('steam:')) || 'Desconocido'}`,
            `License: ${ban2.ids.find(id => id.startsWith('license:')) || 'Desconocido'}`,
            `Discord: ${ban2.ids.find(id => id.startsWith('discord:')) || 'Desconocido'}`,
            `Live: ${ban2.ids.find(id => id.startsWith('live:')) || 'Desconocido'}`,
            `Xbl: ${ban2.ids.find(id => id.startsWith('xbl:')) || 'Desconocido'}`
        ];
        const steamId = ban2.ids.find(id => id.startsWith('steam:'));
        const licenseId = ban2.ids.find(id => id.startsWith('license:'));
        const discordId = ban2.ids.find(id => id.startsWith('discord:'))?.replace('discord:', '');
        const steamLink = steamId ? `https://steamcommunity.com/profiles/${steamId.replace('steam:', '')}` : 'No hemos podido encontrar la cuenta de Steam.';
        const fivemLink = licenseId ? `https://fivem.net/lookup/${licenseId.replace('license:', '')}` : 'No hemos podido encontrar la cuenta de FiveM.';
        const discordAvatarHash = ban2.discordAvatarHash || null;
        const discordAvatar = discordId ? (discordAvatarHash ? `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatarHash}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`) : null; 
        const embed2 = new EmbedBuilder()
            .setTitle('Se ha detectado un baneo a través del sistema de txAdmin.')
            .setColor('#979c9f')
            .setThumbnail(discordAvatar) 
            .addFields(
                { name: 'Nombre:', value: ban2.playerName || 'Desconocido', inline: true },
                { name: 'Razón:', value: ban2.reason || 'Desconocido', inline: true },
                { name: 'Expiración:', value: ban2.expiration === false ? 'PermaBan' : new Date(ban2.expiration * 1000).toLocaleString() || 'Desconocido', inline: true },
                { name: 'Fecha de baneo:', value: banDate, inline: true }, 
                { name: 'Autor del baneo:', value: banAuthor, inline: true }, 
                { name: 'Coincidencia en el identificador:', value: userId },
                { name: 'Identificadores:', value: identifiers2.join('\n') },
                { name: 'Cuentas:', value: `${steamLink}\n${fivemLink}`, inline: true }
            )
            .setFooter({
                text: '© Comunidad Hispana de FiveM'
            });
        embeds.push(embed2);
    }
    if (embeds.length > 0) {
        for (const embed of embeds) {
            await message.reply({ embeds: [embed] });
        }
    } else {
        await message.reply('No se encontró ningún baneo relacionado con el identificador proporcionado.');
    }
});

loadBansFromFile1();
loadBansFromFile2();