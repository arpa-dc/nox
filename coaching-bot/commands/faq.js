const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
module.exports = {
  category: 'Coaching',
  data: new SlashCommandBuilder().setName('faq').setDescription('Questions fréquentes'),
  async execute(i) {
    const e = new EmbedBuilder().setColor(config.color).setTitle('❓ FAQ')
      .addFields(config.faq.map((f) => ({ name: f.q, value: f.a })));
    i.reply({ embeds: [e] });
  },
};
