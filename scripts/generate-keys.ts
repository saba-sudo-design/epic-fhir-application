import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';

const keysDir = path.join(process.cwd(), 'keys');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);

console.log('RSA key pair generated:');
console.log(`  Private key: ${privateKeyPath}`);
console.log(`  Public key:  ${publicKeyPath}`);
console.log('');
console.log('Upload the public key to Epic when registering your Backend Services app.');
console.log('Set EPIC_PRIVATE_KEY_PATH=./keys/private.pem in your .env file.');
