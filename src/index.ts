import cors from 'cors';
import express from 'express';
import { config } from './config';
import { runMigrations } from './db/pool';
import { logger } from './utils/logger';
import apiRoutes from './routes/api';
import { IngestService } from './services/ingest';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/ingest', async (_req, res) => {
    try {
      const ingestService = new IngestService();
      const counts = await ingestService.ingest();
      res.json({ status: 'completed', counts });
    } catch (error) {
      logger.error('Ingest failed', { error });
      res.status(500).json({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.use('/', apiRoutes);

  return app;
}

async function start(): Promise<void> {
  await runMigrations();
  const app = createApp();

  app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });
}
