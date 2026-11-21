const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
module.exports = {
  category: 'Coaching',
  data: new SlashCommandBuilder().setName('services').setDescription('Découvre mes offres de coaching'),
  async execute(i) {
    const e = new EmbedBuilder().setColor(config.color).setTitle(`💼 ${config.brandName} — Offres`)
      .addFields(config.offers.map((o) => ({
        name: `${o.name} — ${o.price}`, value: `${o.desc}\n⏱️ ${o.duration}`,
      })))
      .setFooter({ text: 'Réserve avec /reserver' });
    i.reply({ embeds: [e] });
  },
};
