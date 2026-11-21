const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('./config');

const isOwner = (id) => config.ownerIds.includes(id);

const isCoach = (member) =>
  isOwner(member.id) ||
  member.permissions.has(PermissionFlagsBits.ManageGuild) ||
  (process.env.COACH_ROLE_ID && member.roles.cache.has(process.env.COACH_ROLE_ID));

// Vrai si l'utilisateur est owner du bot OU possède la permission Discord
const hasPerm = (i, perm) => isOwner(i.user.id) || i.memberPermissions?.has(perm);

async function requirePerm(i, perm) {
  if (hasPerm(i, perm)) return true;
  await i.reply({ content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.', flags: MessageFlags.Ephemeral });
  return false;
}

// Format attendu : JJ/MM/AAAA HH:mm  (ex: 25/12/2026 14:30)
function parseDate(str) {
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[:h](\d{2})$/);
  if (!m) return null;
  const [, d, mo, y, h, mi] = m.map(Number);
  const date = new Date(y, mo - 1, d, h, mi);
  return isNaN(date) ? null : date;
}

const ts = (ms, style = 'F') => `<t:${Math.floor(ms / 1000)}:${style}>`;

// Journal de modération (salon LOG_CHANNEL_ID, optionnel)
async function modlog(guild, embed) {
  const ch = guild.channels.cache.get(config.logChannelId || process.env.LOG_CHANNEL_ID);
  if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
}

const dm = (user, text) => user.send(text).catch(() => {});

module.exports = { isOwner, isCoach, hasPerm, requirePerm, parseDate, ts, modlog, dm };
