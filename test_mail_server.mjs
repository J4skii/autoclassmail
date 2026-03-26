import net from 'net';

const host = 'mail.praeto.co.za';
const port = 993;

console.log(`🔍 Testing connection to ${host}:${port}...\n`);

const socket = net.createConnection(port, host);

socket.on('connect', () => {
  console.log('✅ Connected! Mail server is reachable');
  console.log('Port 993 (IMAP/SSL) is open\n');
  socket.end();
});

socket.on('error', (err) => {
  console.log('❌ Connection failed:', err.message);
  console.log('\nPossible issues:');
  console.log('1. Host is wrong (ask admin for correct mail server)');
  console.log('2. Port 993 is blocked');
  console.log('3. Mail server is down\n');
});

socket.setTimeout(5000, () => {
  console.log('❌ Connection timeout');
  socket.destroy();
});