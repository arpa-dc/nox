const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { isOwner } = require('../utils');

const ORDER = ['Coaching', 'Niveaux', 'Giveaway', 'Modération', 'Utilitaire', 'Admin', 'Autres'];
const ICON = { Coaching: '💼', Niveaux: '📈', Giveaway: '🎁', Modération: '🛡️', Utilitaire: '🧰', Admin: '👑', Autres: '📦' };

module.exports = {
  category: 'Utilitaire',
  data: new SlashCommandBuilder().setName('help').setDescription('Liste de toutes les commandes')
    .addStringOption((o) => o.setName('commande').setDescription('Détails sur une commande (ex: rdv)')),

  async execute(i) {
    const cmds = i.client.commands;
    const wanted = i.options.getString('commande')?.replace(/^\//, '').toLowerCase();

    if (wanted) {
      const c = cmds.get(wanted);
      if (!c) return i.reply({ content: `❌ Commande \`/${wanted}\` introuvable. Tape \`/help\`.`, flags: MessageFlags.Ephemeral });
      const json = c.data.toJSON();
      const subs = (json.options || []).filter((o) => o.type === 1);
      const lines = subs.length
        ? subs.map((s) => `\`/${json.name} ${s.name}${(s.options || []).map((o) => (o.required ? ` <${o.name}>` : ` [${o.name}]`)).join('')}\` — ${s.description}`)
        : [`\`/${json.name}${(json.options || []).map((o) => (o.required ? ` <${o.name}>` : ` [${o.name}]`)).join('')}\``];
      return i.reply({ embeds: [new EmbedBuilder().setColor(config.color).setTitle(`/${json.name}`)
        .setDescription(`${json.description}\n\n${lines.join('\n')}\n\n*<obligatoire> · [optionnel]*`)] });
    }

    const groups = {};
    for (const c of cmds.values()) (groups[c.category || 'Autres'] ||= []).push(c.data.toJSON());
    const text = ORDER.filter((k) => groups[k]).map((k) =>
      `**${ICON[k]} ${k}**\n` + groups[k].sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => `\`/${c.name}\` — ${c.description}`).join('\n')).join('\n\n');

    const e = new EmbedBuilder().setColor(config.color).setTitle(`📖 ${config.brandName} — Aide`)
      .setDescription(text.slice(0, 4000))
      .setFooter({ text: 'Détails : /help commande:<nom>' });
    if (isOwner(i.user.id)) e.addFields({ name: '👑 Accès', value: 'Tu es **owner du bot** : toutes les permissions te sont accordées.' });
    i.reply({ embeds: [e] });
  },
};
