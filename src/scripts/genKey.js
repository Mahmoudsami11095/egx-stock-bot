const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  }
});

const sshDir = path.join(process.env.USERPROFILE, '.ssh');
fs.writeFileSync(path.join(sshDir, 'id_rsa_node'), privateKey);

console.log('✅ Generated node id_rsa_node PEM key successfully!');
