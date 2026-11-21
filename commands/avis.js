const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');

module.exports = {
  category: 'Coaching',
  data: new SlashCommandBuilder().setName('avis').setDescription('Laisser un avis sur ton coaching'),
  async execute(i) {
    const modal = new ModalBuilder().setCustomId('avis').setTitle('Ton avis')
      .addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('note').setLabel('Note sur 5').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('Ton commentaire').setStyle(TextInputStyle.Paragraph).setMaxLength(800).setRequired(true)),
      );
    i.showModal(modal);
  },
  async modal(i) {
    const note = parseInt(i.fields.getTextInputValue('note'), 10);
    if (!(note >= 1 && note <= 5)) return i.reply({ content: '❌ La note doit être entre 1 et 5.', flags: MessageFlags.Ephemeral });
    const embed = new EmbedBuilder().setColor(config.color).setAuthor({ name: i.user.username, iconURL: i.user.displayAvatarURL() })
      .setTitle('⭐'.repeat(note) + '☆'.repeat(5 - note)).setDescription(i.fields.getTextInputValue('comment'));
    const ch = process.env.REVIEWS_CHANNEL_ID && i.guild.channels.cache.get(process.env.REVIEWS_CHANNEL_ID);
    if (ch) await ch.send({ embeds: [embed] });
    i.reply({ content: '🙏 Merci pour ton avis !', flags: MessageFlags.Ephemeral });
  },
};
