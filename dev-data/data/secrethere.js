const crypto = require('crypto');

const randomString = crypto.randomBytes(16).toString('hex');

console.log(randomString); // ee48d32e6c724c4d
