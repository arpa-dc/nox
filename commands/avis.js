const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { isOwner } = require('../utils');

module.exports = {
  category: 'Coaching',
  data: new SlashCommandBuilder().setName('avis').setDescription('Laisser un avis sur ton coaching (réservé aux clients)')
    .addIntegerOption((o) => o.setName('note').setDescription('Ta note (menu déroulant)').setRequired(true)
      .addChoices(
        { name: '⭐ (1/5)', value: 1 },
        { name: '⭐⭐ (2/5)', value: 2 },
        { name: '⭐⭐⭐ (3/5)', value: 3 },
        { name: '⭐⭐⭐⭐ (4/5)', value: 4 },
        { name: '⭐⭐⭐⭐⭐ (5/5)', value: 5 },
      ))
    .addStringOption((o) => o.setName('commentaire').setDescription('Ton avis').setRequired(true).setMaxLength(1000)),

  async execute(i) {
    if (!isOwner(i.user.id) && !i.member.roles.cache.has(config.clientRoleId))
      return i.reply({ content: '❌ Seuls les clients peuvent laisser un avis.', flags: MessageFlags.Ephemeral });

    const channel = await i.guild.channels.fetch(config.reviewsChannelId).catch(() => null);
    if (!channel)
      return i.reply({ content: '❌ Salon des avis introuvable. Préviens le coach.', flags: MessageFlags.Ephemeral });

    const note = i.options.getInteger('note');
    const embed = new EmbedBuilder()
      .setColor(0xffffff)
      .setAuthor({ name: i.member.displayName, iconURL: i.member.displayAvatarURL() })
      .setTitle('⭐'.repeat(note))
      .setDescription(i.options.getString('commentaire'))
      .setFooter({ text: `Note : ${note}/5` })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] }).catch(() => null);
    if (!msg)
      return i.reply({ content: '❌ Je ne peux pas écrire dans le salon des avis (permissions du bot).', flags: MessageFlags.Ephemeral });

    i.reply({ content: `🙏 Merci pour ton avis ! Il est publié ici : ${msg.url}`, flags: MessageFlags.Ephemeral });
  },
};
