import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(optional('PORT', '4000')),
  databaseUrl: optional(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/epic_fhir'
  ),
  epic: {
    clientId: process.env.EPIC_CLIENT_ID ?? '',
    privateKey: process.env.EPIC_PRIVATE_KEY ?? '',
    privateKeyPath: process.env.EPIC_PRIVATE_KEY_PATH ?? '',
    keyId: optional('EPIC_KEY_ID', 'epic-fhir-app-key-1'),
    tokenUrl: optional(
      'EPIC_TOKEN_URL',
      'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token'
    ),
    fhirBaseUrl: optional(
      'EPIC_FHIR_BASE_URL',
      'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4'
    ),
    scopes: optional(
      'EPIC_SCOPES',
      'system/Patient.read system/Appointment.read system/Practitioner.read system/Location.read'
    ),
    requestTimeoutMs: Number(optional('EPIC_REQUEST_TIMEOUT_MS', '30000')),
    maxRetries: Number(optional('EPIC_MAX_RETRIES', '3')),
    retryDelayMs: Number(optional('EPIC_RETRY_DELAY_MS', '1000')),
    testPatientIds: optional(
      'EPIC_TEST_PATIENT_IDS',
      'eq081-VQEgP8drUUqCWzHfw3,eIXesllypH3M9tAA5WdJftQ3'
    )
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },
  logLevel: optional('LOG_LEVEL', 'info'),
};

export function assertEpicConfigured(): void {
  if (!config.epic.clientId) {
    throw new Error('EPIC_CLIENT_ID is required for Epic authentication');
  }
  if (!config.epic.privateKey && !config.epic.privateKeyPath) {
    throw new Error('EPIC_PRIVATE_KEY or EPIC_PRIVATE_KEY_PATH is required');
  }
}
