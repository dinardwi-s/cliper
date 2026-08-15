import { Job, Worker } from 'bullmq';
import { mkdir, rm } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeDownloaderService } from '../youtube/youtube-downloader.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import { readFile } from 'node:fs/promises';

interface DownloadPayload { projectId: string; userId: string; youtubeUrl: string }

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const downloader = app.get(YoutubeDownloaderService);
  const storage = app.get(StorageService);
  const queues = app.get(QueueService);
  const connection = redisConnection();
  const worker = new Worker<DownloadPayload>('download', async (job: Job<DownloadPayload>) => {
    const { projectId, youtubeUrl, userId } = job.data;
    const directory = `/tmp/clip-project/${userId}/${projectId}`;
    await prisma.project.update({ where: { id: projectId }, data: { status: 'downloading', startedAt: new Date() } });
    try {
      await mkdir(directory, { recursive: true });
      const downloadedPath = await downloader.download(youtubeUrl, directory, (percent) => { void job.updateProgress(percent); });
      const object = await storage.uploadBuffer(userId, 'raw-videos', await readFile(downloadedPath), `${projectId}.mp4`, 'video/mp4');
      await prisma.project.update({ where: { id: projectId }, data: { status: 'downloaded', metadata: { rawVideoKey: object.key, rawVideoBucket: object.bucket } } });
      await queues.enqueueTranscription(projectId, userId, object.key);
      return { projectId, status: 'downloaded' };
    } catch (error) {
      await prisma.project.update({ where: { id: projectId }, data: { status: 'failed', errorMessage: error instanceof Error ? error.message : 'Download failed', errorCode: 'DOWNLOAD_FAILED' } });
      throw error;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, { connection, concurrency: 2 });
  worker.on('failed', (job, error) => { if (job) console.error(`download job ${job.id} failed`, error.message); });
  const shutdown = async () => { await worker.close(); await app.close(); process.exit(0); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

function redisConnection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://:redispass@localhost:6379');
  return { host: url.hostname, port: Number(url.port || 6379), password: decodeURIComponent(url.password), maxRetriesPerRequest: null };
}

void bootstrap();
