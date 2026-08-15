import { Job, Worker } from 'bullmq';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FfmpegService } from '../media/ffmpeg.service';
import { SubtitleService } from '../media/subtitle.service';

interface Payload { clipId: string; projectId: string; userId: string }
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const storage = app.get(StorageService);
  const ffmpeg = app.get(FfmpegService);
  const subtitles = app.get(SubtitleService);
  const worker = new Worker<Payload>('clipgen', async (job: Job<Payload>) => {
    const clip = await prisma.clip.findFirst({ where: { id: job.data.clipId, projectId: job.data.projectId, userId: job.data.userId }, include: { project: { select: { metadata: true } } } });
    if (!clip) throw new Error('Clip not found');
    const metadata = clip.project.metadata;
    const rawKey = metadata && typeof metadata === 'object' && !Array.isArray(metadata) && typeof metadata.rawVideoKey === 'string' ? metadata.rawVideoKey : null;
    if (!rawKey) throw new Error('Raw video is missing');
    const directory = `/tmp/clip-project/${job.data.userId}/${job.data.clipId}`;
    const input = `${directory}/source.mp4`;
    const output = `${directory}/clip.mp4`;
    const burnedOutput = `${directory}/clip-subtitled.mp4`;
    const subtitlePath = `${directory}/clip.ass`;
    const transcript = await prisma.transcriptSegment.findMany({ where: { projectId: job.data.projectId }, orderBy: { segmentIndex: 'asc' }, select: { text: true, startTime: true, endTime: true } });
    await prisma.clip.update({ where: { id: clip.id }, data: { status: 'generating' } });
    try {
      await mkdir(directory, { recursive: true });
      const source = await storage.downloadBuffer('raw-videos', rawKey);
      await writeFile(input, source);
      await ffmpeg.extractClip(input, output, clip.startTime, clip.durationSeconds, false);
      const ass = subtitles.toAss(transcript, clip.startTime, clip.endTime, true);
      const srt = subtitles.toSrt(transcript, clip.startTime, clip.endTime);
      await writeFile(subtitlePath, ass, 'utf8');
      await ffmpeg.burnSubtitles(output, subtitlePath, burnedOutput);
      const object = await storage.uploadBuffer(job.data.userId, 'clips', await readFile(burnedOutput), `${clip.id}.mp4`, 'video/mp4');
      const subtitleObject = await storage.uploadBuffer(job.data.userId, 'subtitles', Buffer.from(srt), `${clip.id}.srt`, 'application/x-subrip');
      await prisma.clip.update({ where: { id: clip.id }, data: { status: 'completed', videoKey: object.key, subtitleKey: subtitleObject.key } });
      await job.updateProgress(100);
      return { clipId: clip.id, videoKey: object.key };
    } catch (error) {
      await prisma.clip.update({ where: { id: clip.id }, data: { status: 'failed', errorMessage: error instanceof Error ? error.message : 'Clip generation failed' } });
      throw error;
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, { connection: redisConnection(), concurrency: 2 });
  worker.on('failed', (job, error) => { if (job) console.error(`clipgen job ${job.id} failed`, error.message); });
  const shutdown = async () => { await worker.close(); await app.close(); process.exit(0); };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}
function redisConnection() { const url = new URL(process.env.REDIS_URL ?? 'redis://:redispass@localhost:6379'); return { host: url.hostname, port: Number(url.port || 6379), password: decodeURIComponent(url.password), maxRetriesPerRequest: null }; }
void bootstrap();
