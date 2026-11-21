const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const config = require('../config');
const { data, save } = require('../db');
const { progress, applyRewards } = require('../levels');
const { requirePerm } = require('../utils');

const bar = (xp, needed) => {
  const filled = Math.round((xp / needed) * 10);
  return '🟦'.repeat(filled) + '⬜'.repeat(10 - filled);
};
const ranking = () => Object.entries(data.levels).sort((a, b) => b[1].xp - a[1].xp);

module.exports = [
  {
    category: 'Niveaux',
    data: new SlashCommandBuilder().setName('niveau').setDescription('Voir ton niveau et ton XP')
      .addUserOption((o) => o.setName('utilisateur').setDescription('Membre (toi par défaut)')),
    async execute(i) {
      const user = i.options.getUser('utilisateur') || i.user;
      if (user.bot) return i.reply({ content: '❌ Les bots n\'ont pas de niveau.', flags: MessageFlags.Ephemeral });
      const total = data.levels[user.id]?.xp || 0;
      const p = progress(total);
      const rank = ranking().findIndex(([id]) => id === user.id) + 1;
      const next = Object.keys(config.levelRewards).map(Number).sort((a, b) => a - b).find((l) => l > p.level);
      const e = new EmbedBuilder().setColor(config.color)
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setTitle(`Niveau ${p.level}`)
        .setDescription(`${bar(p.xp, p.needed)}\n**${p.xp} / ${p.needed}** XP`)
        .addFields(
          { name: 'XP total', value: String(total), inline: true },
          { name: 'Classement', value: rank ? `#${rank}` : '—', inline: true },
        );
      if (next) e.setFooter({ text: `Prochaine récompense : niveau ${next}` });
      i.reply({ embeds: [e] });
    },
  },
  {
    category: 'Niveaux',
    data: new SlashCommandBuilder().setName('classement').setDescription('Top 10 des membres les plus actifs'),
    async execute(i) {
      const top = ranking().slice(0, 10);
      const medals = ['🥇', '🥈', '🥉'];
      const txt = top.map(([id, u], n) => `${medals[n] || `**${n + 1}.**`} <@${id}> — niveau **${progress(u.xp).level}** · ${u.xp} XP`).join('\n');
      i.reply({ embeds: [new EmbedBuilder().setColor(config.color).setTitle('🏆 Classement').setDescription(txt || 'Personne n\'a encore gagné d\'XP.')] });
    },
  },
  {
    category: 'Niveaux',
    data: new SlashCommandBuilder().setName('xp').setDescription('(Admin) Gérer l\'XP d\'un membre')
      .addSubcommand((s) => s.setName('ajouter').setDescription('Ajouter de l\'XP')
        .addUserOption((o) => o.setName('utilisateur').setDescription('Membre').setRequired(true))
        .addIntegerOption((o) => o.setName('montant').setDescription('XP à ajouter').setRequired(true).setMinValue(1)))
      .addSubcommand((s) => s.setName('retirer').setDescription('Retirer de l\'XP')
        .addUserOption((o) => o.setName('utilisateur').setDescription('Membre').setRequired(true))
        .addIntegerOption((o) => o.setName('montant').setDescription('XP à retirer').setRequired(true).setMinValue(1)))
      .addSubcommand((s) => s.setName('reset').setDescription('Remettre à zéro')
        .addUserOption((o) => o.setName('utilisateur').setDescription('Membre').setRequired(true))),
    async execute(i) {
      if (!(await requirePerm(i, P.ManageGuild))) return;
      const user = i.options.getUser('utilisateur');
      const u = (data.levels[user.id] ||= { xp: 0, level: 0, last: 0 });
      const sub = i.options.getSubcommand();
      const amount = i.options.getInteger('montant');
      if (sub === 'ajouter') u.xp += amount;
      else if (sub === 'retirer') u.xp = Math.max(0, u.xp - amount);
      else u.xp = 0;
      u.level = progress(u.xp).level;
      save();
      if (sub === 'ajouter') {
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (member) await applyRewards(member, u.level);
      }
      i.reply({ content: `✅ ${user} : **${u.xp} XP** (niveau ${u.level}).`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    },
  },
];
