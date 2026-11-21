# 🤖 Bot Discord — Coaching + Modération

Owners du bot (toutes permissions) : définis dans `config.js` → `ownerIds`.

## Installation locale
1. Node.js 18+ → `npm install` → copie `.env.example` en `.env` → `npm start`
2. Discord Developer Portal : active **Server Members Intent**. Invite le bot avec les scopes
   `bot` + `applications.commands` et la permission **Administrateur** (ou : Gérer salons/rôles/messages,
   Expulser, Bannir, Exclure temporairement des membres). Place le rôle du bot AU-DESSUS des rôles à modérer.

## Commandes → tape /help
Coaching : /services /reserver /rdv /avis /objectif /faq
Modération : /ban /unban /kick /timeout /untimeout /warn /warns /clearwarns /clear /lock /unlock /slowmode /role
Utilitaire : /help /ping /avatar /userinfo /serverinfo /botinfo /sondage /say /pileouface /de
Admin : /annonce

## Hébergement sur Render (gratuit)
1. Mets le dossier sur GitHub (le `.gitignore` exclut `.env`).
2. render.com → New → Blueprint (ou Web Service) → choisis le repo (`render.yaml` fourni).
3. Renseigne les variables d'environnement (TOKEN, GUILD_ID, etc.).
4. Anti-veille : le plan gratuit endort le service après 15 min sans requête HTTP.
   Crée un moniteur gratuit sur uptimerobot.com ou cron-job.org qui ouvre
   `https://TON-SERVICE.onrender.com` toutes les 5-10 min.
5. Limite : sur le plan gratuit le disque n'est pas persistant → `data.json`
   (rdv, objectifs, warns) est perdu à chaque redéploiement/redémarrage.
