const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const { data, save } = require('../db');
const { parseDate, ts } = require('../utils');

module.exports = {
  category: 'Coaching',
  data: new SlashCommandBuilder().setName('reserver').setDescription('Réserver une séance de coaching')
    .addStringOption((o) => o.setName('offre').setDescription('Ton offre').setRequired(true)
      .addChoices(...config.offers.map((x) => ({ name: x.name, value: x.id }))))
    .addStringOption((o) => o.setName('date').setDescription('Format : JJ/MM/AAAA HH:mm (ex: 25/12/2026 14:30)').setRequired(true))
    .addStringOption((o) => o.setName('note').setDescription('Ton objectif / précisions')),

  async execute(i) {
    const date = parseDate(i.options.getString('date'));
    if (!date || date.getTime() < Date.now())
      return i.reply({ content: '❌ Date invalide ou passée. Format : `JJ/MM/AAAA HH:mm`', flags: MessageFlags.Ephemeral });

    const offer = config.offers.find((o) => o.id === i.options.getString('offre'));
    const note = i.options.getString('note') || 'Aucune';
    const clash = data.bookings.find((b) => b.status !== 'cancelled' && Math.abs(b.date - date.getTime()) < 3600000);
    if (clash)
      return i.reply({ content: '❌ Ce créneau est déjà pris (ou trop proche d\'un autre). Choisis un autre horaire.', flags: MessageFlags.Ephemeral });

    await i.deferReply({ flags: MessageFlags.Ephemeral });

    const booking = { id: data.nextId++, userId: i.user.id, offerName: offer.name, date: date.getTime(), note, status: 'pending', reminded: false };
    data.bookings.push(booking); save();

    // Ticket privé
    const overwrites = [
      { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: i.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ];
    if (process.env.COACH_ROLE_ID)
      overwrites.push({ id: process.env.COACH_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

    let channel;
    try {
      channel = await i.guild.channels.create({
        name: `rdv-${booking.id}-${i.user.username}`.slice(0, 90),
        type: ChannelType.GuildText,
        parent: process.env.TICKET_CATEGORY_ID || null,
        topic: i.user.id,
        permissionOverwrites: overwrites,
      });
    } catch (e) { console.error(e); }

    const embed = new EmbedBuilder().setColor(config.color).setTitle(`📅 Réservation #${booking.id}`)
      .addFields(
        { name: 'Client', value: `${i.user}`, inline: true },
        { name: 'Offre', value: `${offer.name} (${offer.price})`, inline: true },
        { name: 'Date', value: `${ts(booking.date)} (${ts(booking.date, 'R')})` },
        { name: 'Note', value: note },
        { name: 'Statut', value: '⏳ En attente de confirmation' },
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger));

    if (channel) {
      await channel.send({ content: process.env.COACH_ROLE_ID ? `<@&${process.env.COACH_ROLE_ID}> nouvelle réservation !` : undefined, embeds: [embed], components: [row] });
      booking.channelId = channel.id; save();
    }
    i.editReply(`✅ Réservation **#${booking.id}** enregistrée ! ${channel ? `Rendez-vous dans ${channel}.` : ''}`);
  },
};
