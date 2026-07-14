import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from '../config';

async function migrate(): Promise<void> {
  const migrationPool = new Pool({ connectionString: config.databaseUrl });
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await migrationPool.query(sql);
    console.log('Migrations applied successfully');
  } finally {
    await migrationPool.end();
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { migrate };
