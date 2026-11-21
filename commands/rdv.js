const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { data, save } = require('../db');
const { isCoach, ts } = require('../utils');

const line = (b) => `**#${b.id}** · ${b.offerName} · ${ts(b.date)} · <@${b.userId}> · ${b.status === 'confirmed' ? '✅' : b.status === 'cancelled' ? '❌' : '⏳'}`;

module.exports = {
  category: 'Coaching',
  data: new SlashCommandBuilder().setName('rdv').setDescription('Gérer les rendez-vous')
    .addSubcommand((s) => s.setName('mes').setDescription('Voir mes rendez-vous'))
    .addSubcommand((s) => s.setName('annuler').setDescription('Annuler un rendez-vous')
      .addIntegerOption((o) => o.setName('id').setDescription('Numéro du rdv').setRequired(true)))
    .addSubcommand((s) => s.setName('liste').setDescription('(Coach) Tous les rdv à venir'))
    .addSubcommand((s) => s.setName('confirmer').setDescription('(Coach) Confirmer un rdv')
      .addIntegerOption((o) => o.setName('id').setDescription('Numéro du rdv').setRequired(true))),

  async execute(i) {
    const sub = i.options.getSubcommand();
    const eph = { flags: MessageFlags.Ephemeral };
    const upcoming = (b) => b.status !== 'cancelled' && b.date > Date.now();

    if (sub === 'mes') {
      const list = data.bookings.filter((b) => b.userId === i.user.id && upcoming(b)).sort((a, b) => a.date - b.date);
      return i.reply({ ...eph, embeds: [new EmbedBuilder().setColor(config.color).setTitle('📅 Mes rendez-vous').setDescription(list.map(line).join('\n') || 'Aucun rendez-vous à venir.')] });
    }
    if (sub === 'liste') {
      if (!isCoach(i.member)) return i.reply({ ...eph, content: '❌ Réservé au coach.' });
      const list = data.bookings.filter(upcoming).sort((a, b) => a.date - b.date);
      return i.reply({ ...eph, embeds: [new EmbedBuilder().setColor(config.color).setTitle('📋 Rendez-vous à venir').setDescription(list.map(line).join('\n') || 'Aucun rendez-vous.')] });
    }

    const b = data.bookings.find((x) => x.id === i.options.getInteger('id'));
    if (!b) return i.reply({ ...eph, content: '❌ Rendez-vous introuvable.' });

    if (sub === 'confirmer') {
      if (!isCoach(i.member)) return i.reply({ ...eph, content: '❌ Réservé au coach.' });
      b.status = 'confirmed'; save();
      i.client.users.fetch(b.userId).then((u) => u.send(`✅ Ton rendez-vous **#${b.id}** (${b.offerName}) du ${ts(b.date)} est confirmé !`)).catch(() => {});
      return i.reply({ ...eph, content: `✅ Rdv #${b.id} confirmé.` });
    }
    if (sub === 'annuler') {
      if (b.userId !== i.user.id && !isCoach(i.member)) return i.reply({ ...eph, content: '❌ Ce rdv n\'est pas le tien.' });
      if (b.userId === i.user.id && !isCoach(i.member) && b.date - Date.now() < 24 * 3600000)
        return i.reply({ ...eph, content: '❌ Annulation impossible moins de 24 h avant. Contacte le coach.' });
      b.status = 'cancelled'; save();
      return i.reply({ ...eph, content: `🗑️ Rdv #${b.id} annulé.` });
    }
  },
};
