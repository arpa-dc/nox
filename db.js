const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'data.json');
const data = { bookings: [], goals: [], warns: [], presence: null, levels: {}, giveaways: [], giveawayId: 1, nextId: 1, warnId: 1 };
if (fs.existsSync(file)) Object.assign(data, JSON.parse(fs.readFileSync(file, 'utf8')));
const save = () => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Sauvegarde différée (évite d'écrire le disque à chaque message)
let timer = null;
const saveSoon = () => {
  if (timer) return;
  timer = setTimeout(() => { timer = null; save(); }, 10000);
};
module.exports = { data, save, saveSoon };
