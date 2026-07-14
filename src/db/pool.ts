import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function runMigrations(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  logger.info('Database migrations applied');
}

export async function closePool(): Promise<void> {
  await pool.end();
}
