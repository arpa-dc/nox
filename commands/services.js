const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
module.exports = {
  category: 'Coaching',
  data: new SlashCommandBuilder().setName('services').setDescription('Découvre mes offres de coaching'),
  async execute(i) {
    const e = new EmbedBuilder().setColor(config.color).setTitle(`💼 ${config.brandName} — Offres`)
      .addFields([
        { name: '15 minutes — 2,99 €', value: '\u200B' },
        { name: '30 minutes — 4,99 €', value: '\u200B' },
        { name: '1 heure — 7,99 €', value: '\u200B' },
        { name: '1h30 — 12,99 €', value: '45 min + 15 min de pause + 45 min' },
        { name: '2 heures — 16,99 €', value: '1h + 15 min de pause + 1h' },
        { name: '2h30 — 21,99 €', value: '1h15 + 15 min de pause + 1h15' },
        { name: '3 heures — 25,99 €', value: '1h30 + 15 min de pause + 1h30' },
      ])
      .setFooter({ text: 'Réserve avec /reserver' });
    i.reply({ embeds: [e] });
  },
};
