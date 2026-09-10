// Usage: node hash-password.js "yourPasswordHere"
// Prints a bcrypt hash you paste into ADMIN_PASS_HASH in your .env
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node hash-password.js "yourPasswordHere"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nADMIN_PASS_HASH=' + hash + '\n');
