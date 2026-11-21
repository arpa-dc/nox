const { EmbedBuilder, AuditLogEvent: A, AttachmentBuilder, ChannelType } = require('discord.js');
const config = require('./config');
const { ts } = require('./utils');

const cut = (s, n = 1000) => (!s ? '*(vide)*' : s.length > n ? s.slice(0, n - 1) + '…' : s);
const tag = (u) => (u ? `${u} · \`${u.id}\`` : '*inconnu*');
const CH = {
  [ChannelType.GuildText]: 'Texte', [ChannelType.GuildVoice]: 'Vocal', [ChannelType.GuildCategory]: 'Catégorie',
  [ChannelType.GuildAnnouncement]: 'Annonces', [ChannelType.GuildForum]: 'Forum', [ChannelType.GuildStageVoice]: 'Conférence',
};
const UNKNOWN = '*inconnu (message envoyé avant le démarrage du bot)*';

module.exports = (client) => {
  const embed = (title) => new EmbedBuilder().setColor(config.color).setTitle(title).setTimestamp();
  const fields = (e, list) => e.addFields(list.filter(Boolean));
  const who = (u, title) => embed(title).setAuthor({ name: u.tag, iconURL: u.displayAvatarURL() });
  const on = (ev, fn) => client.on(ev, (...a) => Promise.resolve(fn(...a)).catch((e) => console.error(`log ${ev}:`, e)));

  async function send(guild, e, files = []) {
    const ch = guild.channels.cache.get(config.logChannelId) || (await guild.channels.fetch(config.logChannelId).catch(() => null));
    if (!ch) return;
    await ch.send({ embeds: [e], files, allowedMentions: { parse: [] } }).catch((err) => console.warn('log:', err.message));
  }

  // Cherche dans le journal d'audit QUI a fait l'action (nécessite la permission "Voir les logs du serveur")
  async function audit(guild, type, targetId, extra = () => true) {
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const logs = await guild.fetchAuditLogs({ type, limit: 8 });
      const entry = logs.entries.find((x) => (!targetId || x.targetId === targetId) && Date.now() - x.createdTimestamp < 10000 && extra(x));
      return entry ? { user: entry.executor, reason: entry.reason } : null;
    } catch { return null; }
  }
  const byBot = (x) => x?.user?.id === client.user.id; // actions du bot déjà loguées par les commandes de modération
  const by = (x) => (x?.user ? `${x.user} · \`${x.user.id}\`` : null);

  // ───────── MESSAGES ─────────
  const skip = (m) => !m.guild || m.channelId === config.logChannelId || m.author?.id === client.user.id || m.system;

  on('messageCreate', async (m) => {
    if (!config.logSentMessages || skip(m)) return;
    const e = who(m.author, '💬 Message envoyé');
    if (m.content) e.setDescription(cut(m.content, 3900));
    fields(e, [
      { name: 'Auteur', value: tag(m.author), inline: true },
      { name: 'Salon', value: `${m.channel}`, inline: true },
      m.attachments.size && { name: 'Pièces jointes', value: cut(m.attachments.map((a) => a.url).join('\n')) },
      { name: 'Lien', value: `[Aller au message](${m.url})` },
    ]);
    await send(m.guild, e);
  });

  on('messageUpdate', async (o, n) => {
    if (n.partial) n = await n.fetch().catch(() => n);
    if (skip(n) || !n.author) return;
    if (!o.partial && o.content === n.content) return; // simple aperçu de lien, pas une vraie modification
    const e = who(n.author, '✏️ Message modifié');
    fields(e, [
      { name: 'Avant', value: o.partial ? UNKNOWN : cut(o.content) },
      { name: 'Après', value: cut(n.content) },
      { name: 'Auteur', value: tag(n.author), inline: true },
      { name: 'Salon', value: `${n.channel}`, inline: true },
      { name: 'Lien', value: `[Aller au message](${n.url})` },
    ]);
    await send(n.guild, e);
  });

  on('messageDelete', async (m) => {
    if (!m.guild || m.channelId === config.logChannelId || m.author?.id === client.user.id) return;
    const exec = m.author ? await audit(m.guild, A.MessageDelete, m.author.id, (x) => x.extra?.channel?.id === m.channelId) : null;
    const e = m.author ? who(m.author, '🗑️ Message supprimé') : embed('🗑️ Message supprimé');
    e.setDescription(m.content == null ? UNKNOWN : m.content ? cut(m.content, 3900) : '*(aucun texte)*');
    fields(e, [
      { name: 'Auteur', value: m.author ? tag(m.author) : '*inconnu*', inline: true },
      { name: 'Salon', value: `<#${m.channelId}>`, inline: true },
      { name: 'Supprimé par', value: by(exec) || (m.author ? "L'auteur (ou inconnu)" : '*inconnu*') },
      m.attachments?.size && { name: 'Pièces jointes', value: cut(m.attachments.map((a) => a.url).join('\n')) },
    ]);
    await send(m.guild, e);
  });

  on('messageDeleteBulk', async (msgs, channel) => {
    if (!channel.guild || channel.id === config.logChannelId) return;
    const lines = [...msgs.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp).map((m) =>
      `[${new Date(m.createdTimestamp).toLocaleString('fr-FR')}] ${m.author?.tag ?? 'inconnu'} : ${m.content ?? '(contenu inconnu)'}` +
      (m.attachments?.size ? ` [${m.attachments.map((a) => a.url).join(' ')}]` : ''));
    const e = embed('🧹 Suppression en masse').setDescription(`**${msgs.size}** messages supprimés dans ${channel}. Contenu dans le fichier joint.`);
    await send(channel.guild, e, [new AttachmentBuilder(Buffer.from(lines.join('\n') || 'vide', 'utf8'), { name: 'messages-supprimes.txt' })]);
  });

  // ───────── VOCAL ─────────
  on('voiceStateUpdate', async (o, n) => {
    const member = n.member || o.member;
    if (!member || member.id === client.user.id) return;
    const L = [];
    if (o.channelId !== n.channelId) {
      if (!o.channelId) L.push(`🔊 A rejoint ${n.channel}`);
      else if (!n.channelId) L.push(`🔇 A quitté ${o.channel}`);
      else L.push(`🔀 Déplacé de ${o.channel} vers ${n.channel}`);
    } else if (o.channelId) {
      const f = (a, b, yes, no) => { if (!!a !== !!b) L.push(b ? yes : no); };
      f(o.selfMute, n.selfMute, '🎙️ S\'est mute (micro coupé)', '🎙️ A réactivé son micro');
      f(o.selfDeaf, n.selfDeaf, '🎧 S\'est mis en sourdine (casque coupé)', '🎧 A réactivé son casque');
      f(o.serverMute, n.serverMute, '🔇 Mute par un modérateur', '🔊 Mute serveur retiré');
      f(o.serverDeaf, n.serverDeaf, '🔕 Sourdine imposée par un modérateur', '🔔 Sourdine serveur retirée');
      f(o.streaming, n.streaming, '🖥️ A lancé un partage d\'écran / stream', '🖥️ A arrêté le partage d\'écran');
      f(o.selfVideo, n.selfVideo, '📹 A activé sa caméra', '📹 A coupé sa caméra');
    }
    if (!L.length) return;
    const e = who(member.user, '🎧 Vocal').setDescription(L.join('\n'));
    fields(e, [
      { name: 'Membre', value: tag(member.user), inline: true },
      { name: 'Salon', value: `${n.channel || o.channel}`, inline: true },
    ]);
    await send(member.guild, e);
  });

  // ───────── MEMBRES ─────────
  on('guildMemberAdd', async (m) => {
    const e = embed('📥 Membre arrivé').setThumbnail(m.user.displayAvatarURL({ size: 256 })).setDescription(`${m} · ${m.user.tag}`);
    fields(e, [
      { name: 'ID', value: m.id, inline: true },
      { name: 'Membres', value: String(m.guild.memberCount), inline: true },
      { name: 'Compte créé', value: `${ts(m.user.createdTimestamp, 'F')} (${ts(m.user.createdTimestamp, 'R')})` },
    ]);
    await send(m.guild, e);
  });

  on('guildMemberRemove', async (m) => {
    const exec = await audit(m.guild, A.MemberKick, m.id);
    if (byBot(exec)) return; // déjà logué par /kick
    const roles = m.roles?.cache?.filter((r) => r.id !== m.guild.id).map((r) => `${r}`).join(' ');
    const e = embed(exec ? '👢 Membre expulsé' : '📤 Membre parti').setThumbnail(m.user.displayAvatarURL({ size: 256 })).setDescription(`${m.user} · ${m.user.tag}`);
    fields(e, [
      { name: 'ID', value: m.id, inline: true },
      { name: 'Membres', value: String(m.guild.memberCount), inline: true },
      m.joinedTimestamp && { name: 'Avait rejoint', value: ts(m.joinedTimestamp, 'F') },
      { name: 'Rôles', value: cut(roles || 'Aucun') },
      exec && { name: 'Expulsé par', value: by(exec) },
      exec?.reason && { name: 'Raison', value: cut(exec.reason) },
    ]);
    await send(m.guild, e);
  });

  on('guildMemberUpdate', async (o, n) => {
    if (o.partial) return;
    const user = n.user;
    if (o.nickname !== n.nickname) {
      const e = who(user, '✏️ Pseudo modifié');
      fields(e, [
        { name: 'Membre', value: tag(user) },
        { name: 'Avant', value: o.nickname || '*aucun*', inline: true },
        { name: 'Après', value: n.nickname || '*aucun*', inline: true },
      ]);
      await send(n.guild, e);
    }
    const added = n.roles.cache.filter((r) => !o.roles.cache.has(r.id));
    const removed = o.roles.cache.filter((r) => !n.roles.cache.has(r.id));
    if (added.size || removed.size) {
      const exec = await audit(n.guild, A.MemberRoleUpdate, n.id);
      const e = who(user, '🏷️ Rôles modifiés');
      fields(e, [
        { name: 'Membre', value: tag(user) },
        added.size && { name: '➕ Ajouté', value: added.map((r) => `${r}`).join(' ') },
        removed.size && { name: '➖ Retiré', value: removed.map((r) => `${r}`).join(' ') },
        { name: 'Modifié par', value: by(exec) || '*inconnu*' },
      ]);
      await send(n.guild, e);
    }
    const a = o.communicationDisabledUntilTimestamp, b = n.communicationDisabledUntilTimestamp;
    if (a !== b) {
      const active = b && b > Date.now();
      const exec = await audit(n.guild, A.MemberUpdate, n.id);
      if (!byBot(exec)) {
        const e = who(user, active ? '🔇 Membre rendu muet (timeout)' : '🔊 Timeout retiré');
        fields(e, [
          { name: 'Membre', value: tag(user) },
          active && { name: 'Jusqu\'à', value: `${ts(b, 'F')} (${ts(b, 'R')})` },
          exec && { name: 'Par', value: by(exec) },
          exec?.reason && { name: 'Raison', value: cut(exec.reason) },
        ]);
        await send(n.guild, e);
      }
    }
  });

  on('userUpdate', async (o, n) => {
    if (o.partial) return;
    const ch = [];
    if (o.username !== n.username) ch.push({ name: "Nom d'utilisateur", value: `${o.username} → ${n.username}` });
    if (o.globalName !== n.globalName) ch.push({ name: "Nom d'affichage", value: `${o.globalName || '*aucun*'} → ${n.globalName || '*aucun*'}` });
    if (o.avatar !== n.avatar) ch.push({ name: 'Avatar', value: 'Photo de profil modifiée' });
    if (!ch.length) return;
    const guild = client.guilds.cache.find((g) => g.members.cache.has(n.id));
    if (!guild) return;
    const e = who(n, '👤 Profil modifié').setThumbnail(n.displayAvatarURL({ size: 256 }));
    fields(e, [{ name: 'Membre', value: tag(n) }, ...ch]);
    await send(guild, e);
  });

  on('guildBanAdd', async (b) => {
    const exec = await audit(b.guild, A.MemberBanAdd, b.user.id);
    if (byBot(exec)) return; // déjà logué par /ban
    const e = embed('🔨 Membre banni').setThumbnail(b.user.displayAvatarURL({ size: 256 }));
    fields(e, [
      { name: 'Membre', value: tag(b.user) },
      exec && { name: 'Par', value: by(exec) },
      { name: 'Raison', value: cut(exec?.reason || b.reason || 'Aucune raison') },
    ]);
    await send(b.guild, e);
  });

  on('guildBanRemove', async (b) => {
    const exec = await audit(b.guild, A.MemberBanRemove, b.user.id);
    if (byBot(exec)) return; // déjà logué par /unban
    const e = embed('✅ Membre débanni');
    fields(e, [{ name: 'Membre', value: tag(b.user) }, exec && { name: 'Par', value: by(exec) }]);
    await send(b.guild, e);
  });

  // ───────── SALONS ─────────
  on('channelCreate', async (c) => {
    if (!c.guild) return;
    const exec = await audit(c.guild, A.ChannelCreate, c.id);
    if (byBot(exec)) return; // tickets créés par le bot
    const e = embed('📁 Salon créé');
    fields(e, [
      { name: 'Salon', value: `${c} (\`${c.name}\`)`, inline: true },
      { name: 'Type', value: CH[c.type] || String(c.type), inline: true },
      exec && { name: 'Par', value: by(exec) },
    ]);
    await send(c.guild, e);
  });

  on('channelDelete', async (c) => {
    if (!c.guild) return;
    const exec = await audit(c.guild, A.ChannelDelete, c.id);
    if (byBot(exec)) return; // tickets fermés par le bot
    const e = embed('🗑️ Salon supprimé');
    fields(e, [
      { name: 'Nom', value: `\`${c.name}\``, inline: true },
      { name: 'Type', value: CH[c.type] || String(c.type), inline: true },
      exec && { name: 'Par', value: by(exec) },
    ]);
    await send(c.guild, e);
  });

  on('channelUpdate', async (o, n) => {
    if (!n.guild) return;
    const ch = [];
    if (o.name !== n.name) ch.push({ name: 'Nom', value: `\`${o.name}\` → \`${n.name}\`` });
    if (o.topic !== n.topic) ch.push({ name: 'Sujet', value: `${cut(o.topic || '*aucun*', 400)} → ${cut(n.topic || '*aucun*', 400)}` });
    if (o.rateLimitPerUser !== n.rateLimitPerUser) ch.push({ name: 'Mode lent', value: `${o.rateLimitPerUser || 0} s → ${n.rateLimitPerUser || 0} s` });
    if (o.nsfw !== n.nsfw) ch.push({ name: 'NSFW', value: `${!!o.nsfw} → ${!!n.nsfw}` });
    if (!ch.length) return;
    const exec = await audit(n.guild, A.ChannelUpdate, n.id);
    const e = embed('🔧 Salon modifié');
    fields(e, [{ name: 'Salon', value: `${n}` }, ...ch, exec && { name: 'Par', value: by(exec) }]);
    await send(n.guild, e);
  });

  // ───────── RÔLES ─────────
  on('roleCreate', async (r) => {
    const exec = await audit(r.guild, A.RoleCreate, r.id);
    const e = embed('🏷️ Rôle créé');
    fields(e, [{ name: 'Rôle', value: `${r} (\`${r.name}\`)` }, exec && { name: 'Par', value: by(exec) }]);
    await send(r.guild, e);
  });

  on('roleDelete', async (r) => {
    const exec = await audit(r.guild, A.RoleDelete, r.id);
    const e = embed('🗑️ Rôle supprimé');
    fields(e, [{ name: 'Rôle', value: `\`${r.name}\`` }, exec && { name: 'Par', value: by(exec) }]);
    await send(r.guild, e);
  });

  on('roleUpdate', async (o, n) => {
    const ch = [];
    if (o.name !== n.name) ch.push({ name: 'Nom', value: `\`${o.name}\` → \`${n.name}\`` });
    if (o.hexColor !== n.hexColor) ch.push({ name: 'Couleur', value: `${o.hexColor} → ${n.hexColor}` });
    if (o.hoist !== n.hoist) ch.push({ name: 'Affiché séparément', value: `${o.hoist} → ${n.hoist}` });
    if (o.mentionable !== n.mentionable) ch.push({ name: 'Mentionnable', value: `${o.mentionable} → ${n.mentionable}` });
    const plus = o.permissions.missing(n.permissions), minus = n.permissions.missing(o.permissions);
    if (plus.length) ch.push({ name: '➕ Permissions ajoutées', value: cut(plus.join(', ')) });
    if (minus.length) ch.push({ name: '➖ Permissions retirées', value: cut(minus.join(', ')) });
    if (!ch.length) return;
    const exec = await audit(n.guild, A.RoleUpdate, n.id);
    const e = embed('🔧 Rôle modifié');
    fields(e, [{ name: 'Rôle', value: `${n}` }, ...ch, exec && { name: 'Par', value: by(exec) }]);
    await send(n.guild, e);
  });

  // ───────── INVITATIONS ─────────
  on('inviteCreate', async (inv) => {
    const g = client.guilds.cache.get(inv.guild?.id);
    if (!g) return;
    const e = embed('🔗 Invitation créée');
    fields(e, [
      { name: 'Code', value: `\`${inv.code}\``, inline: true },
      { name: 'Salon', value: `${inv.channel}`, inline: true },
      inv.inviter && { name: 'Créée par', value: tag(inv.inviter) },
      { name: 'Utilisations max', value: inv.maxUses ? String(inv.maxUses) : 'Illimité', inline: true },
      { name: 'Expire', value: inv.expiresTimestamp ? ts(inv.expiresTimestamp, 'R') : 'Jamais', inline: true },
    ]);
    await send(g, e);
  });

  on('inviteDelete', async (inv) => {
    const g = client.guilds.cache.get(inv.guild?.id);
    if (!g) return;
    const e = embed('🔗 Invitation supprimée');
    fields(e, [{ name: 'Code', value: `\`${inv.code}\``, inline: true }, inv.channel && { name: 'Salon', value: `${inv.channel}`, inline: true }]);
    await send(g, e);
  });

  // ───────── COMMANDES ─────────
  on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand() || !i.guild) return;
    const e = who(i.user, '⌨️ Commande utilisée').setDescription(cut(`\`${i.toString()}\``, 3900));
    fields(e, [
      { name: 'Membre', value: tag(i.user), inline: true },
      { name: 'Salon', value: `${i.channel}`, inline: true },
    ]);
    await send(i.guild, e);
  });
};
