import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CleanupService } from '../cleanup/cleanup.service';

const intervalMs = Number(process.env.CLEANUP_INTERVAL_HOURS ?? 1) * 60 * 60 * 1000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cleanup = app.get(CleanupService);

  const runCleanup = async () => {
    try {
      const removed = await cleanup.removeExpiredRawFiles();
      if (removed > 0) {
        console.log(`[cleanup-worker] Removed ${removed} expired raw video file(s)`);
      }
    } catch (error) {
      console.error('[cleanup-worker] Error during cleanup:', error instanceof Error ? error.message : error);
    }
  };

  await runCleanup();
  const timer = setInterval(() => { void runCleanup(); }, intervalMs);

  const shutdown = async () => {
    clearInterval(timer);
    await app.close();
    process.exit(0);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

void bootstrap();
