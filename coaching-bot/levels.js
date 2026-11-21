const config = require('./config');
const { data, saveSoon } = require('./db');

const COOLDOWN = 60 * 1000;                 // 1 gain d'XP max par minute et par membre
const need = (l) => 5 * l * l + 50 * l + 100; // XP nécessaire pour passer du niveau l à l+1

// Calcule niveau / XP restante à partir de l'XP totale
function progress(total) {
  let level = 0, xp = total;
  while (xp >= need(level)) { xp -= need(level); level++; }
  return { level, xp, needed: need(level) };
}

// Donne les rôles récompenses atteints (niveau >= palier)
async function applyRewards(member, level) {
  const given = [];
  for (const [lvl, roleId] of Object.entries(config.levelRewards)) {
    if (level >= Number(lvl) && !member.roles.cache.has(roleId)) {
      try { await member.roles.add(roleId, `Niveau ${lvl} atteint`); given.push(roleId); }
      catch (e) { console.warn(`Impossible de donner le rôle ${roleId} (rôle du bot trop bas ?)`); }
    }
  }
  return given;
}

async function handleMessage(msg) {
  if (msg.author.bot || !msg.guild || !msg.member) return;
  const u = (data.levels[msg.author.id] ||= { xp: 0, level: 0, last: 0 });
  const now = Date.now();
  if (now - u.last < COOLDOWN) return;
  u.last = now;
  u.xp += 15 + Math.floor(Math.random() * 11); // 15 à 25 XP
  const { level } = progress(u.xp);
  saveSoon();
  if (level <= u.level) return;

  u.level = level;
  const given = await applyRewards(msg.member, level);
  let text = `🎉 ${msg.author} passe **niveau ${level}** !`;
  if (given.length) text += `\n🏆 Récompense : tu obtiens ${given.map((r) => `<@&${r}>`).join(' ')} !`;
  msg.channel.send({ content: text, allowedMentions: { users: [msg.author.id] } }).catch(() => {});
}

module.exports = { handleMessage, progress, applyRewards, need };
