const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { data, save } = require('../db');

module.exports = {
  category: 'Coaching',
  data: new SlashCommandBuilder().setName('objectif').setDescription('Suivi de tes objectifs')
    .addSubcommand((s) => s.setName('ajouter').setDescription('Ajouter un objectif')
      .addStringOption((o) => o.setName('texte').setDescription('Ton objectif').setRequired(true)))
    .addSubcommand((s) => s.setName('liste').setDescription('Voir mes objectifs'))
    .addSubcommand((s) => s.setName('valider').setDescription('Marquer un objectif comme atteint')
      .addIntegerOption((o) => o.setName('numero').setDescription('Numéro (voir /objectif liste)').setRequired(true))),
  async execute(i) {
    const eph = { flags: MessageFlags.Ephemeral };
    const mine = data.goals.filter((g) => g.userId === i.user.id);
    const sub = i.options.getSubcommand();
    if (sub === 'ajouter') {
      data.goals.push({ userId: i.user.id, text: i.options.getString('texte'), done: false }); save();
      return i.reply({ ...eph, content: '🎯 Objectif ajouté !' });
    }
    if (sub === 'liste') {
      const txt = mine.map((g, n) => `${g.done ? '✅' : '🔲'} **${n + 1}.** ${g.text}`).join('\n') || 'Aucun objectif. Ajoute-en avec `/objectif ajouter`.';
      const done = mine.filter((g) => g.done).length;
      return i.reply({ ...eph, embeds: [new EmbedBuilder().setColor(config.color).setTitle(`🎯 Mes objectifs (${done}/${mine.length})`).setDescription(txt)] });
    }
    const g = mine[i.options.getInteger('numero') - 1];
    if (!g) return i.reply({ ...eph, content: '❌ Numéro invalide.' });
    g.done = true; save();
    i.reply({ ...eph, content: '🎉 Bravo, objectif atteint !' });
  },
};
