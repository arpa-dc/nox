const { SlashCommandBuilder, ActivityType, MessageFlags } = require('discord.js');
const { data, save } = require('../db');
const { isOwner } = require('../utils');

const TYPES = {
  joue: ActivityType.Playing,
  regarde: ActivityType.Watching,
  ecoute: ActivityType.Listening,
  participe: ActivityType.Competing,
};
const LABELS = { joue: 'Joue à', regarde: 'Regarde', ecoute: 'Écoute', participe: 'Participe à' };

function apply(client) {
  const p = data.presence;
  if (!p) return;
  client.user.setPresence({
    status: p.status,
    activities: [{ name: p.text, type: TYPES[p.type] }],
  });
}

module.exports = {
  category: 'Admin',
  apply,
  data: new SlashCommandBuilder().setName('statutbot').setDescription('(Owner) Changer le statut du bot')
    .addStringOption((o) => o.setName('type').setDescription('Type d\'activité').setRequired(true)
      .addChoices(
        { name: 'Joue à…', value: 'joue' },
        { name: 'Regarde…', value: 'regarde' },
        { name: 'Écoute…', value: 'ecoute' },
        { name: 'Participe à…', value: 'participe' },
      ))
    .addStringOption((o) => o.setName('texte').setDescription('Texte affiché (ex: vos séances de coaching)').setRequired(true).setMaxLength(100))
    .addStringOption((o) => o.setName('presence').setDescription('Pastille de présence (en ligne par défaut)')
      .addChoices(
        { name: '🟢 En ligne', value: 'online' },
        { name: '🌙 Inactif', value: 'idle' },
        { name: '⛔ Ne pas déranger', value: 'dnd' },
        { name: '⚫ Invisible', value: 'invisible' },
      )),

  async execute(i) {
    if (!isOwner(i.user.id))
      return i.reply({ content: '❌ Seuls les owners du bot peuvent changer son statut.', flags: MessageFlags.Ephemeral });

    data.presence = {
      type: i.options.getString('type'),
      text: i.options.getString('texte'),
      status: i.options.getString('presence') || 'online',
    };
    save();
    apply(i.client);
    i.reply({ content: `✅ Statut mis à jour : **${LABELS[data.presence.type]} ${data.presence.text}**`, flags: MessageFlags.Ephemeral });
  },
};
