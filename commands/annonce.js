const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { requirePerm } = require('../utils');
const config = require('../config');

module.exports = {
  category: 'Admin',
  data: new SlashCommandBuilder().setName('annonce').setDescription('(Coach) Publier une annonce')
    .addChannelOption((o) => o.setName('salon').setDescription('Salon cible').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((o) => o.setName('titre').setDescription('Titre').setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Contenu').setRequired(true)),
  async execute(i) {
    if (!(await requirePerm(i, PermissionFlagsBits.ManageGuild))) return;
    const ch = i.options.getChannel('salon');
    await ch.send({ embeds: [new EmbedBuilder().setColor(config.color).setTitle(i.options.getString('titre')).setDescription(i.options.getString('message').replace(/\\n/g, '\n')).setTimestamp()] });
    i.reply({ content: `📢 Annonce publiée dans ${ch}.`, flags: MessageFlags.Ephemeral });
  },
};
