const { io } = require('./node_modules/socket.io-client');
const client = io('https://api.ashnance.com', { transports: ['websocket'], timeout: 120000 });
const events = [];
const USER_ID = process.env.USER_ID || '';
client.on('connect', () => {
  process.stderr.write(`Connected: ${client.id}\n`);
  client.emit('join:ticker');
  client.emit('join:round');
  client.emit('join:leaderboard');
  if (USER_ID) {
    client.emit('join:user', { userId: USER_ID });
    process.stderr.write(`Joined user room: user:${USER_ID}\n`);
  }
  process.stderr.write('Joined rooms\n');
});
['burn:new','round:progress','leaderboard:update','round:ended','deposit:confirmed'].forEach(evt => {
  client.on(evt, (d) => {
    process.stdout.write(JSON.stringify({ event: evt, data: d }) + '\n');
    process.stderr.write(`EVENT: ${evt}\n`);
    events.push(evt);
  });
});
client.on('disconnect', () => process.stderr.write('Disconnected\n'));
client.on('connect_error', (e) => process.stderr.write(`Error: ${e.message}\n`));
setTimeout(() => { process.stderr.write(`Events: ${events.join(',') || 'none'}\n`); client.disconnect(); process.exit(0); }, 300000);
