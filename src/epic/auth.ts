import fs from 'fs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { assertEpicConfigured, config } from '../config';
import { logger } from '../utils/logger';
import { TokenResponse } from './types';

function maskAccessToken(token: string): string {
  if (token.length <= 20) return '***';
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

function loadPrivateKey(): string {
  if (config.epic.privateKey) {
    return config.epic.privateKey.replace(/\\n/g, '\n');
  }
  if (config.epic.privateKeyPath) {
    return fs.readFileSync(config.epic.privateKeyPath, 'utf8');
  }
  throw new Error('No Epic private key configured');
}

export function createClientAssertion(): string {
  assertEpicConfigured();
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.epic.clientId,
    sub: config.epic.clientId,
    aud: config.epic.tokenUrl,
    jti: uuidv4(),
    exp: now + 300,
    nbf: now,
    iat: now,
  };

  const privateKey = loadPrivateKey();
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS384',
    keyid: config.epic.keyId,
  });
}

export async function getAccessToken(): Promise<string> {
  const clientAssertion = createClientAssertion();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
    scope: config.epic.scopes,
  });

  logger.info('Requesting Epic access token');

  const response = await fetch(config.epic.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(config.epic.requestTimeoutMs),
  });

  const text = await response.text();
  if (!response.ok) {
    logger.error('Epic token request failed', { status: response.status, body: text });
    throw new Error(`Epic token request failed (${response.status}): ${text}`);
  }

  const data = JSON.parse(text) as TokenResponse;
  logger.info('Epic access token obtained', {
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    accessTokenPreview: maskAccessToken(data.access_token),
    ...(config.epic.logFullAccessToken ? { accessToken: data.access_token } : {}),
  });
  return data.access_token;
}
