const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const config = require('../config');
const { data, save } = require('../db');
const { requirePerm, ts } = require('../utils');

const EPH = { flags: MessageFlags.Ephemeral };
const UNITS = { s: 1000, m: 60000, h: 3600000, j: 86400000, d: 86400000 };

function parseDuration(str) {
  const m = str.trim().toLowerCase().match(/^(\d+)\s*(s|m|h|j|d)$/);
  return m ? Number(m[1]) * UNITS[m[2]] : null;
}

// Tirage au sort équitable (Fisher-Yates)
function pick(list, n) {
  const a = [...list];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a.slice(0, n);
}

const row = (id, disabled = false) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`gw_enter:${id}`).setLabel('Participer').setEmoji('🎉').setStyle(ButtonStyle.Secondary).setDisabled(disabled));

const runningEmbed = (gw) => new EmbedBuilder().setColor(config.color).setTitle(`🎉 ${gw.prize}`)
  .setDescription(
    `Clique sur **Participer** pour tenter ta chance !\n\n` +
    `⏰ Fin : ${ts(gw.endsAt, 'R')} (${ts(gw.endsAt)})\n` +
    `🏆 Gagnant(s) : **${gw.winnersCount}**\n` +
    `👤 Organisé par : <@${gw.hostId}>` +
    (gw.requiredRoleId ? `\n🔒 Réservé au rôle <@&${gw.requiredRoleId}>` : ''))
  .setFooter({ text: `${gw.entries.length} participant(s)` });

async function finish(client, gw) {
  gw.ended = true;
  gw.winners = pick(gw.entries, gw.winnersCount);
  save();
  const channel = await client.channels.fetch(gw.channelId).catch(() => null);
  if (!channel) return;
  const msg = await channel.messages.fetch(gw.messageId).catch(() => null);
  const winText = gw.winners.length ? gw.winners.map((id) => `<@${id}>`).join(', ') : 'Aucun participant';
  const embed = new EmbedBuilder().setColor(config.color).setTitle(`🎉 ${gw.prize}`)
    .setDescription(`⏰ Terminé\n🏆 Gagnant(s) : ${winText}\n👤 Organisé par : <@${gw.hostId}>`)
    .setFooter({ text: `${gw.entries.length} participant(s)` });
  if (msg) await msg.edit({ embeds: [embed], components: [row(gw.id, true)] }).catch(() => {});
  channel.send({
    content: gw.winners.length
      ? `🎉 Félicitations ${winText} ! Tu gagnes **${gw.prize}** !`
      : `😕 Le giveaway **${gw.prize}** est terminé sans participant.`,
    allowedMentions: { users: gw.winners },
  }).catch(() => {});
}

module.exports = {
  category: 'Giveaway',

  // Appelée toutes les 15 s : termine les giveaways arrivés à échéance
  async tick(client) {
    for (const gw of data.giveaways) {
      if (!gw.ended && gw.endsAt <= Date.now()) await finish(client, gw);
    }
  },

  // Clic sur le bouton "Participer" (clic à nouveau = se retirer)
  async enter(i) {
    const gw = data.giveaways.find((g) => g.id === Number(i.customId.split(':')[1]));
    if (!gw || gw.ended) return i.reply({ content: '❌ Ce giveaway est terminé.', ...EPH });
    if (gw.requiredRoleId && !i.member.roles.cache.has(gw.requiredRoleId))
      return i.reply({ content: `❌ Ce giveaway est réservé au rôle <@&${gw.requiredRoleId}>.`, ...EPH, allowedMentions: { parse: [] } });
    const idx = gw.entries.indexOf(i.user.id);
    if (idx >= 0) { gw.entries.splice(idx, 1); await i.reply({ content: '↩️ Participation retirée.', ...EPH }); }
    else { gw.entries.push(i.user.id); await i.reply({ content: '✅ Tu participes !', ...EPH }); }
    save();
    i.message.edit({ embeds: [runningEmbed(gw)] }).catch(() => {});
  },

  data: new SlashCommandBuilder().setName('giveaway').setDescription('Gérer les giveaways')
    .addSubcommand((s) => s.setName('creer').setDescription('Lancer un giveaway dans ce salon')
      .addStringOption((o) => o.setName('prix').setDescription('Ce qui est à gagner').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('duree').setDescription('Durée : 30m, 2h, 1j… (s, m, h, j)').setRequired(true))
      .addIntegerOption((o) => o.setName('gagnants').setDescription('Nombre de gagnants (1 par défaut)').setMinValue(1).setMaxValue(20))
      .addRoleOption((o) => o.setName('role').setDescription('Réserver aux membres ayant ce rôle')))
    .addSubcommand((s) => s.setName('terminer').setDescription('Terminer un giveaway maintenant')
      .addIntegerOption((o) => o.setName('id').setDescription('Numéro du giveaway (voir /giveaway liste)').setRequired(true)))
    .addSubcommand((s) => s.setName('relancer').setDescription('Tirer un nouveau gagnant')
      .addIntegerOption((o) => o.setName('id').setDescription('Numéro du giveaway').setRequired(true)))
    .addSubcommand((s) => s.setName('liste').setDescription('Giveaways en cours')),

  async execute(i) {
    if (!(await requirePerm(i, P.ManageGuild))) return;
    const sub = i.options.getSubcommand();

    if (sub === 'creer') {
      const dur = parseDuration(i.options.getString('duree'));
      if (!dur || dur < 10000 || dur > 30 * 86400000)
        return i.reply({ content: '❌ Durée invalide (ex : `30m`, `2h`, `1j`, entre 10 s et 30 jours).', ...EPH });
      const gw = {
        id: data.giveawayId++, guildId: i.guild.id, channelId: i.channel.id, hostId: i.user.id,
        prize: i.options.getString('prix'), endsAt: Date.now() + dur,
        winnersCount: i.options.getInteger('gagnants') || 1,
        requiredRoleId: i.options.getRole('role')?.id || null,
        entries: [], winners: [], ended: false,
      };
      const msg = await i.channel.send({ embeds: [runningEmbed(gw)], components: [row(gw.id)] });
      gw.messageId = msg.id;
      data.giveaways.push(gw); save();
      return i.reply({ content: `✅ Giveaway **#${gw.id}** lancé.`, ...EPH });
    }

    if (sub === 'liste') {
      const list = data.giveaways.filter((g) => !g.ended);
      const txt = list.map((g) => `**#${g.id}** · ${g.prize} · fin ${ts(g.endsAt, 'R')} · ${g.entries.length} participant(s)`).join('\n') || 'Aucun giveaway en cours.';
      return i.reply({ ...EPH, embeds: [new EmbedBuilder().setColor(config.color).setTitle('🎁 Giveaways en cours').setDescription(txt)] });
    }

    const gw = data.giveaways.find((g) => g.id === i.options.getInteger('id'));
    if (!gw) return i.reply({ content: '❌ Giveaway introuvable.', ...EPH });

    if (sub === 'terminer') {
      if (gw.ended) return i.reply({ content: '❌ Ce giveaway est déjà terminé.', ...EPH });
      await finish(i.client, gw);
      return i.reply({ content: `✅ Giveaway **#${gw.id}** terminé.`, ...EPH });
    }

    if (sub === 'relancer') {
      if (!gw.ended) return i.reply({ content: '❌ Ce giveaway n\'est pas encore terminé.', ...EPH });
      const [winner] = pick(gw.entries.filter((id) => !gw.winners.includes(id)), 1);
      if (!winner) return i.reply({ content: '❌ Plus aucun participant disponible.', ...EPH });
      gw.winners.push(winner); save();
      i.channel.send({ content: `🎉 Nouveau tirage pour **${gw.prize}** : félicitations <@${winner}> !`, allowedMentions: { users: [winner] } });
      return i.reply({ content: '✅ Nouveau gagnant tiré.', ...EPH });
    }
  },
};
