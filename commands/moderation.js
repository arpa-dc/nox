const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const { data, save } = require('../db');
const { isOwner, hasPerm, ts, modlog, dm } = require('../utils');

const EPH = { flags: MessageFlags.Ephemeral };
const reasonOpt = (o) => o.setName('raison').setDescription('Raison');
const userOpt = (o) => o.setName('utilisateur').setDescription('Membre ciblé').setRequired(true);
const getReason = (i) => i.options.getString('raison') || 'Aucune raison fournie';

// Vérifie permission + hiérarchie. Retourne true si l'action est autorisée.
async function guard(i, perm, user, member, botOk = true) {
  const deny = (m) => { i.reply({ content: `❌ ${m}`, ...EPH }); return false; };
  if (!hasPerm(i, perm)) return deny('Tu n\'as pas la permission d\'utiliser cette commande.');
  if (user.id === i.user.id) return deny('Tu ne peux pas faire ça sur toi-même.');
  if (user.id === i.client.user.id) return deny('Je ne peux pas me cibler moi-même.');
  if (isOwner(user.id) && !isOwner(i.user.id)) return deny('Cet utilisateur est protégé.');
  if (member) {
    if (!isOwner(i.user.id) && i.guild.ownerId !== i.user.id && i.member.roles.highest.position <= member.roles.highest.position)
      return deny('Ce membre a un rôle supérieur ou égal au tien.');
    if (!botOk) return deny('Mon rôle est trop bas pour agir sur ce membre (place le rôle du bot plus haut).');
  }
  return true;
}

const logEmbed = (title, i, user, reason, extra = []) =>
  new EmbedBuilder().setColor(0xffffff).setTitle(title).setTimestamp()
    .addFields({ name: 'Membre', value: `${user} (${user.id})`, inline: true },
      { name: 'Modérateur', value: `${i.user}`, inline: true }, ...extra, { name: 'Raison', value: reason });

const ok = (i, text) => i.reply({ embeds: [new EmbedBuilder().setColor(0xffffff).setDescription(text)] });

const cmds = [
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('ban').setDescription('Bannir un membre')
      .addUserOption(userOpt).addStringOption(reasonOpt)
      .addIntegerOption((o) => o.setName('jours').setDescription('Supprimer ses messages des X derniers jours (0-7)').setMinValue(0).setMaxValue(7)),
    async execute(i) {
      const user = i.options.getUser('utilisateur'), member = i.options.getMember('utilisateur'), reason = getReason(i);
      if (!(await guard(i, P.BanMembers, user, member, member ? member.bannable : true))) return;
      await dm(user, `🔨 Tu as été banni de **${i.guild.name}**.\nRaison : ${reason}`);
      await i.guild.members.ban(user, { reason: `${reason} (par ${i.user.tag})`, deleteMessageSeconds: (i.options.getInteger('jours') || 0) * 86400 });
      await ok(i, `🔨 **${user.tag}** a été banni. Raison : ${reason}`);
      modlog(i.guild, logEmbed('🔨 Ban', i, user, reason));
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('unban').setDescription('Débannir un utilisateur')
      .addStringOption((o) => o.setName('id').setDescription('ID de l\'utilisateur').setRequired(true)).addStringOption(reasonOpt),
    async execute(i) {
      if (!hasPerm(i, P.BanMembers)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      const id = i.options.getString('id').trim();
      try {
        const user = await i.guild.members.unban(id, `${getReason(i)} (par ${i.user.tag})`);
        await ok(i, `✅ **${user.tag}** a été débanni.`);
        modlog(i.guild, logEmbed('✅ Unban', i, user, getReason(i)));
      } catch { i.reply({ content: '❌ Utilisateur introuvable dans la liste des bannis.', ...EPH }); }
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('kick').setDescription('Expulser un membre')
      .addUserOption(userOpt).addStringOption(reasonOpt),
    async execute(i) {
      const user = i.options.getUser('utilisateur'), member = i.options.getMember('utilisateur'), reason = getReason(i);
      if (!member) return i.reply({ content: '❌ Ce membre n\'est pas sur le serveur.', ...EPH });
      if (!(await guard(i, P.KickMembers, user, member, member.kickable))) return;
      await dm(user, `👢 Tu as été expulsé de **${i.guild.name}**.\nRaison : ${reason}`);
      await member.kick(`${reason} (par ${i.user.tag})`);
      await ok(i, `👢 **${user.tag}** a été expulsé. Raison : ${reason}`);
      modlog(i.guild, logEmbed('👢 Kick', i, user, reason));
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('timeout').setDescription('Rendre muet un membre (exclusion temporaire)')
      .addUserOption(userOpt)
      .addIntegerOption((o) => o.setName('minutes').setDescription('Durée en minutes (max 40320 = 28 j)').setRequired(true).setMinValue(1).setMaxValue(40320))
      .addStringOption(reasonOpt),
    async execute(i) {
      const user = i.options.getUser('utilisateur'), member = i.options.getMember('utilisateur'), reason = getReason(i);
      const min = i.options.getInteger('minutes');
      if (!member) return i.reply({ content: '❌ Ce membre n\'est pas sur le serveur.', ...EPH });
      if (!(await guard(i, P.ModerateMembers, user, member, member.moderatable))) return;
      await member.timeout(min * 60000, `${reason} (par ${i.user.tag})`);
      await dm(user, `🔇 Tu as été rendu muet sur **${i.guild.name}** pendant ${min} min.\nRaison : ${reason}`);
      await ok(i, `🔇 **${user.tag}** est muet jusqu'à ${ts(Date.now() + min * 60000)}. Raison : ${reason}`);
      modlog(i.guild, logEmbed('🔇 Timeout', i, user, reason, [{ name: 'Durée', value: `${min} min`, inline: true }]));
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('untimeout').setDescription('Retirer le mute d\'un membre').addUserOption(userOpt),
    async execute(i) {
      const user = i.options.getUser('utilisateur'), member = i.options.getMember('utilisateur');
      if (!member) return i.reply({ content: '❌ Ce membre n\'est pas sur le serveur.', ...EPH });
      if (!(await guard(i, P.ModerateMembers, user, member, member.moderatable))) return;
      await member.timeout(null);
      await ok(i, `🔊 **${user.tag}** peut de nouveau parler.`);
      modlog(i.guild, logEmbed('🔊 Untimeout', i, user, '—'));
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('warn').setDescription('Avertir un membre')
      .addUserOption(userOpt).addStringOption((o) => o.setName('raison').setDescription('Raison').setRequired(true)),
    async execute(i) {
      const user = i.options.getUser('utilisateur'), member = i.options.getMember('utilisateur'), reason = getReason(i);
      if (!(await guard(i, P.ModerateMembers, user, member))) return;
      const w = { id: data.warnId++, userId: user.id, modId: i.user.id, reason, date: Date.now() };
      data.warns.push(w); save();
      const total = data.warns.filter((x) => x.userId === user.id).length;
      await dm(user, `⚠️ Avertissement sur **${i.guild.name}** : ${reason}\n(Total : ${total})`);
      await ok(i, `⚠️ **${user.tag}** averti (#${w.id}, total ${total}). Raison : ${reason}`);
      modlog(i.guild, logEmbed('⚠️ Warn', i, user, reason, [{ name: 'Total', value: String(total), inline: true }]));
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('warns').setDescription('Voir les avertissements d\'un membre').addUserOption(userOpt),
    async execute(i) {
      if (!hasPerm(i, P.ModerateMembers)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      const user = i.options.getUser('utilisateur');
      const list = data.warns.filter((w) => w.userId === user.id);
      const txt = list.map((w) => `**#${w.id}** · ${ts(w.date, 'd')} · <@${w.modId}> · ${w.reason}`).join('\n').slice(0, 4000) || 'Aucun avertissement.';
      i.reply({ ...EPH, embeds: [new EmbedBuilder().setColor(0xffffff).setTitle(`⚠️ Avertissements de ${user.tag} (${list.length})`).setDescription(txt)] });
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('clearwarns').setDescription('Effacer les avertissements d\'un membre').addUserOption(userOpt),
    async execute(i) {
      if (!hasPerm(i, P.ModerateMembers)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      const user = i.options.getUser('utilisateur');
      const before = data.warns.length;
      data.warns = data.warns.filter((w) => w.userId !== user.id); save();
      ok(i, `🧹 ${before - data.warns.length} avertissement(s) effacé(s) pour **${user.tag}**.`);
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('clear').setDescription('Supprimer des messages')
      .addIntegerOption((o) => o.setName('nombre').setDescription('Nombre de messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption((o) => o.setName('utilisateur').setDescription('Ne supprimer que ses messages')),
    async execute(i) {
      if (!hasPerm(i, P.ManageMessages)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      await i.deferReply(EPH);
      const n = i.options.getInteger('nombre'), user = i.options.getUser('utilisateur');
      let toDelete = n;
      if (user) {
        const msgs = await i.channel.messages.fetch({ limit: 100 });
        toDelete = [...msgs.filter((m) => m.author.id === user.id).values()].slice(0, n);
      }
      const deleted = await i.channel.bulkDelete(toDelete, true);
      i.editReply(`🧹 ${deleted.size} message(s) supprimé(s) (les messages de plus de 14 jours ne peuvent pas l'être).`);
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('lock').setDescription('Verrouiller le salon actuel'),
    async execute(i) {
      if (!hasPerm(i, P.ManageChannels)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
      ok(i, '🔒 Salon verrouillé.');
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('unlock').setDescription('Déverrouiller le salon actuel'),
    async execute(i) {
      if (!hasPerm(i, P.ManageChannels)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
      ok(i, '🔓 Salon déverrouillé.');
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('slowmode').setDescription('Définir le mode lent du salon')
      .addIntegerOption((o) => o.setName('secondes').setDescription('0 pour désactiver (max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600)),
    async execute(i) {
      if (!hasPerm(i, P.ManageChannels)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      const s = i.options.getInteger('secondes');
      await i.channel.setRateLimitPerUser(s);
      ok(i, s ? `🐢 Mode lent : ${s} s.` : '⚡ Mode lent désactivé.');
    },
  },
  {
    category: 'Modération',
    data: new SlashCommandBuilder().setName('role').setDescription('Ajouter ou retirer un rôle')
      .addSubcommand((s) => s.setName('ajouter').setDescription('Donner un rôle')
        .addUserOption(userOpt).addRoleOption((o) => o.setName('role').setDescription('Rôle').setRequired(true)))
      .addSubcommand((s) => s.setName('retirer').setDescription('Retirer un rôle')
        .addUserOption(userOpt).addRoleOption((o) => o.setName('role').setDescription('Rôle').setRequired(true))),
    async execute(i) {
      if (!hasPerm(i, P.ManageRoles)) return i.reply({ content: '❌ Permission manquante.', ...EPH });
      const member = i.options.getMember('utilisateur'), role = i.options.getRole('role');
      if (!member) return i.reply({ content: '❌ Membre introuvable.', ...EPH });
      if (!role.editable) return i.reply({ content: '❌ Mon rôle est trop bas pour gérer ce rôle.', ...EPH });
      if (!isOwner(i.user.id) && i.guild.ownerId !== i.user.id && i.member.roles.highest.position <= role.position)
        return i.reply({ content: '❌ Ce rôle est supérieur ou égal au tien.', ...EPH });
      if (i.options.getSubcommand() === 'ajouter') { await member.roles.add(role); ok(i, `✅ ${role} ajouté à ${member}.`); }
      else { await member.roles.remove(role); ok(i, `✅ ${role} retiré à ${member}.`); }
    },
  },
];

module.exports = cmds;
