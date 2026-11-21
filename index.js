require('dotenv').config();
process.env.TZ = process.env.TZ || 'Europe/Paris';
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, EmbedBuilder, Events, MessageFlags } = require('discord.js');
const config = require('./config');
const { data, save } = require('./db');
const { isCoach, ts } = require('./utils');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
client.commands = new Collection();

for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter((f) => f.endsWith('.js'))) {
  for (const cmd of [].concat(require(`./commands/${file}`))) client.commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
  client.commands.get('statutbot')?.apply(c); // réapplique le dernier statut
  setInterval(() => client.commands.get('giveaway')?.tick(client).catch((e) => console.error('giveaway:', e)), 15 * 1000);
  try {
    const body = client.commands.map((cmd) => cmd.data.toJSON());
    const route = process.env.GUILD_ID
      ? c.application.commands.set(body, process.env.GUILD_ID)
      : c.application.commands.set(body);
    await route;
    console.log(`📌 ${body.length} commandes enregistrées`);
  } catch (e) { console.error('Erreur enregistrement commandes:', e); }

  // Rappels : DM 1 h avant chaque rendez-vous
  setInterval(async () => {
    const now = Date.now();
    for (const b of data.bookings) {
      if (b.status === 'cancelled' || b.reminded) continue;
      if (b.date > now && b.date - now <= 3600000) {
        b.reminded = true; save();
        try {
          const user = await client.users.fetch(b.userId);
          await user.send(`⏰ Rappel : ta séance **${b.offerName}** commence ${ts(b.date, 'R')} (${ts(b.date)}).`);
        } catch { /* DMs fermés */ }
      }
    }
  }, 60 * 1000);
});

client.on(Events.GuildMemberAdd, async (member) => {
  member.roles.add(config.joinRoleId, 'Rôle automatique à l\'arrivée')
    .catch(() => console.warn('Impossible de donner le rôle d\'arrivée (rôle du bot trop bas ?)'));
  const ch = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle('BIENVENUE')
    .setDescription(config.welcomeMessage(member))
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }));
  ch.send({ embeds: [embed] }).catch(() => {});
});

client.on(Events.MessageCreate, (msg) => require('./levels').handleMessage(msg).catch((e) => console.error('levels:', e)));

client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isChatInputCommand()) {
      return await client.commands.get(i.commandName)?.execute(i);
    }
    if (i.isModalSubmit()) {
      const name = i.customId.split(':')[0];
      return await client.commands.get(name)?.modal?.(i);
    }
    if (i.isButton() && i.customId.startsWith('gw_enter:')) return await client.commands.get('giveaway').enter(i);
    if (i.isButton() && i.customId === 'close_ticket') {
      const owner = i.channel.topic === i.user.id;
      if (!isCoach(i.member) && !owner)
        return i.reply({ content: '❌ Tu ne peux pas fermer ce ticket.', flags: MessageFlags.Ephemeral });
      await i.reply('🔒 Ticket fermé, suppression dans 5 secondes…');
      setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    }
  } catch (e) {
    console.error(e);
    const msg = { content: '❌ Une erreur est survenue.', flags: MessageFlags.Ephemeral };
    if (i.replied || i.deferred) i.followUp(msg).catch(() => {}); else i.reply(msg).catch(() => {});
  }
});

// Mini serveur web (nécessaire pour Render : il faut écouter sur $PORT)
require('http').createServer((req, res) => { res.writeHead(200); res.end('Bot en ligne ✅'); })
  .listen(process.env.PORT || 3000, () => console.log('🌐 Serveur web actif'));

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
client.login(process.env.TOKEN);
