import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const keysDir = path.join(process.cwd(), 'keys');
const privateKeyPath = process.env.EPIC_PRIVATE_KEY_PATH ?? path.join(keysDir, 'private.pem');
const keyId = process.env.EPIC_KEY_ID ?? 'epic-fhir-app-key-1';

function loadPrivateKey(): string {
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(`Private key not found at ${privateKeyPath}. Run openssl key generation first.`);
  }
  return fs.readFileSync(privateKeyPath, 'utf8');
}

function buildJwks(privateKeyPem: string, kid: string): { keys: object[] } {
  const keyObject = crypto.createPrivateKey(privateKeyPem);
  const jwk = keyObject.export({ format: 'jwk' }) as crypto.JsonWebKey;

  if (!jwk.n || !jwk.e) {
    throw new Error('Failed to extract RSA public key components from private key');
  }

  return {
    keys: [
      {
        kty: 'RSA',
        kid,
        use: 'sig',
        alg: 'RS384',
        n: jwk.n,
        e: jwk.e,
      },
    ],
  };
}

const privateKey = loadPrivateKey();
const jwks = buildJwks(privateKey, keyId);

const outputDir = path.join(process.cwd(), 'public', '.well-known');
fs.mkdirSync(outputDir, { recursive: true });

const jwksPath = path.join(outputDir, 'jwks.json');
fs.writeFileSync(jwksPath, JSON.stringify(jwks, null, 2));

console.log('JWKS generated successfully:');
console.log(`  File: ${jwksPath}`);
console.log(`  Key ID (kid): ${keyId}`);
console.log('');
console.log('Add to your .env:');
console.log(`  EPIC_KEY_ID=${keyId}`);
console.log('');
console.log('Epic Non-Production JWK Set URL should point to:');
console.log('  https://<your-public-host>/.well-known/jwks.json');
