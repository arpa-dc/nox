const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits: P, MessageFlags, ChannelType, version } = require('discord.js');
const config = require('../config');
const { hasPerm, ts } = require('../utils');

const EPH = { flags: MessageFlags.Ephemeral };
const base = () => new EmbedBuilder().setColor(config.color);

module.exports = [
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('ping').setDescription('Latence du bot'),
    async execute(i) {
      await i.reply(`🏓 Pong ! API : **${Math.round(i.client.ws.ping)} ms**`);
    },
  },
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('avatar').setDescription('Afficher l\'avatar d\'un membre')
      .addUserOption((o) => o.setName('utilisateur').setDescription('Membre (toi par défaut)')),
    async execute(i) {
      const u = i.options.getUser('utilisateur') || i.user;
      i.reply({ embeds: [base().setTitle(`Avatar de ${u.username}`).setImage(u.displayAvatarURL({ size: 1024 }))] });
    },
  },
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('userinfo').setDescription('Informations sur un membre')
      .addUserOption((o) => o.setName('utilisateur').setDescription('Membre (toi par défaut)')),
    async execute(i) {
      const u = i.options.getUser('utilisateur') || i.user;
      const m = i.options.getMember('utilisateur') || (u.id === i.user.id ? i.member : null);
      const e = base().setTitle(u.tag).setThumbnail(u.displayAvatarURL({ size: 256 }))
        .addFields({ name: 'ID', value: u.id, inline: true },
          { name: 'Compte créé', value: ts(u.createdTimestamp, 'D'), inline: true });
      if (m) e.addFields({ name: 'A rejoint', value: ts(m.joinedTimestamp, 'D'), inline: true },
        { name: 'Rôles', value: m.roles.cache.filter((r) => r.id !== i.guild.id).map((r) => `${r}`).join(' ').slice(0, 1000) || 'Aucun' });
      i.reply({ embeds: [e] });
    },
  },
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Informations sur le serveur'),
    async execute(i) {
      const g = i.guild;
      i.reply({ embeds: [base().setTitle(g.name).setThumbnail(g.iconURL({ size: 256 }))
        .addFields({ name: 'Propriétaire', value: `<@${g.ownerId}>`, inline: true },
          { name: 'Membres', value: String(g.memberCount), inline: true },
          { name: 'Créé', value: ts(g.createdTimestamp, 'D'), inline: true },
          { name: 'Salons', value: String(g.channels.cache.size), inline: true },
          { name: 'Rôles', value: String(g.roles.cache.size), inline: true },
          { name: 'Boosts', value: String(g.premiumSubscriptionCount || 0), inline: true })] });
    },
  },
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('botinfo').setDescription('Informations sur le bot'),
    async execute(i) {
      const up = Math.floor(process.uptime());
      i.reply({ embeds: [base().setTitle('🤖 Bot').addFields(
        { name: 'Uptime', value: `${Math.floor(up / 3600)} h ${Math.floor((up % 3600) / 60)} min`, inline: true },
        { name: 'Serveurs', value: String(i.client.guilds.cache.size), inline: true },
        { name: 'Mémoire', value: `${Math.round(process.memoryUsage().rss / 1048576)} Mo`, inline: true },
        { name: 'Versions', value: `Node ${process.version} · discord.js ${version}` })] });
    },
  },
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('sondage').setDescription('Créer un sondage')
      .addStringOption((o) => o.setName('question').setDescription('Question').setRequired(true))
      .addStringOption((o) => o.setName('option1').setDescription('Option 1 (vide = Oui/Non)'))
      .addStringOption((o) => o.setName('option2').setDescription('Option 2'))
      .addStringOption((o) => o.setName('option3').setDescription('Option 3'))
      .addStringOption((o) => o.setName('option4').setDescription('Option 4')),
    async execute(i) {
      const opts = [1, 2, 3, 4].map((n) => i.options.getString(`option${n}`)).filter(Boolean);
      const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
      const emojis = opts.length >= 2 ? nums.slice(0, opts.length) : ['👍', '👎'];
      const desc = opts.length >= 2 ? opts.map((o, n) => `${nums[n]} ${o}`).join('\n') : 'Vote avec 👍 ou 👎';
      await i.reply({ embeds: [base().setTitle(`📊 ${i.options.getString('question')}`).setDescription(desc).setFooter({ text: `Par ${i.user.username}` })] });
      const msg = await i.fetchReply();
      for (const e of emojis) await msg.react(e).catch(() => {});
    },
  },
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('say').setDescription('Faire parler le bot')
      .addStringOption((o) => o.setName('message').setDescription('Message').setRequired(true))
      .addChannelOption((o) => o.setName('salon').setDescription('Salon cible').addChannelTypes(ChannelType.GuildText)),
    async execute(i) {
      if (!hasPerm(i, P.ManageMessages)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      const ch = i.options.getChannel('salon') || i.channel;
      await ch.send({ content: i.options.getString('message'), allowedMentions: { parse: [] } });
      i.reply({ content: '✅ Envoyé.', ...EPH });
    },
  },
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('pileouface').setDescription('Lancer une pièce'),
    async execute(i) { i.reply(`🪙 ${Math.random() < 0.5 ? '**Pile**' : '**Face**'} !`); },
  },
  {
    category: 'Utilitaire',
    data: new SlashCommandBuilder().setName('de').setDescription('Lancer un dé')
      .addIntegerOption((o) => o.setName('faces').setDescription('Nombre de faces (6 par défaut)').setMinValue(2).setMaxValue(1000)),
    async execute(i) {
      const f = i.options.getInteger('faces') || 6;
      i.reply(`🎲 Dé à ${f} faces : **${1 + Math.floor(Math.random() * f)}**`);
    },
  },
];
