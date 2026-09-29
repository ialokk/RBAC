import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectToDatabase } from './db/mongoose';
import { registerScheduledJobs } from './scheduled-jobs';
import { createSocketServer } from './sockets';

async function bootstrap(): Promise<void> {
  await connectToDatabase();

  const app = createApp();
  const httpServer = createServer(app);
  createSocketServer(httpServer);
  registerScheduledJobs();

  httpServer.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start API', err);
  process.exit(1);
});
