const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'data.json');
const data = { bookings: [], goals: [], warns: [], nextId: 1, warnId: 1 };
if (fs.existsSync(file)) Object.assign(data, JSON.parse(fs.readFileSync(file, 'utf8')));
const save = () => fs.writeFileSync(file, JSON.stringify(data, null, 2));
module.exports = { data, save };
