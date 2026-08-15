import { Job, Worker } from 'bullmq';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { WhisperService } from '../ai/whisper.service';
import { QueueService } from '../queue/queue.service';

const execFileAsync = promisify(execFile);
interface Payload { projectId: string; userId: string; videoPath: string }

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const storage = app.get(StorageService);
  const whisper = app.get(WhisperService);
  const queues = app.get(QueueService);
  const worker = new Worker<Payload>('transcribe', async (job: Job<Payload>) => {
    const directory = `/tmp/clip-project/${job.data.userId}/${job.data.projectId}`;
    const videoPath = `${directory}/source.mp4`;
    const audioPath = `${directory}/audio.wav`;
    await prisma.project.update({ where: { id: job.data.projectId }, data: { status: 'transcribing' } });
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(videoPath, await storage.downloadBuffer('raw-videos', job.data.videoPath));
      await execFileAsync('ffmpeg', ['-y', '-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', audioPath], { timeout: 60 * 60 * 1000 });
      const transcript = await whisper.transcribe(audioPath);
      const existingProject = await prisma.project.findUnique({ where: { id: job.data.projectId }, select: { metadata: true } });
      const existingMetadata = existingProject?.metadata && typeof existingProject.metadata === 'object' && !Array.isArray(existingProject.metadata) ? existingProject.metadata : {};
      await prisma.$transaction(async (tx) => {
        await tx.transcriptSegment.deleteMany({ where: { projectId: job.data.projectId } });
        await tx.transcriptSegment.createMany({ data: transcript.segments.map((segment, index) => ({ projectId: job.data.projectId, segmentIndex: index, text: segment.text, startTime: segment.startTime, endTime: segment.endTime, confidence: segment.confidence })) });
        await tx.project.update({ where: { id: job.data.projectId }, data: { status: 'transcribed', language: transcript.language, metadata: { ...existingMetadata, languageProbability: transcript.languageProbability } } });
      });
      await queues.enqueueAnalysis(job.data.projectId, job.data.userId);
      await job.updateProgress(100);
      return { projectId: job.data.projectId, language: transcript.language, segments: transcript.segments.length };
    } catch (error) {
      await prisma.project.update({ where: { id: job.data.projectId }, data: { status: 'failed', errorCode: 'TRANSCRIPTION_FAILED', errorMessage: error instanceof Error ? error.message : 'Transcription failed' } });
      throw error;
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, { connection: redisConnection(), concurrency: 1 });
  worker.on('failed', (job, error) => { if (job) console.error(`transcribe job ${job.id} failed`, error.message); });
  const shutdown = async () => { await worker.close(); await app.close(); process.exit(0); };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}
function redisConnection() { const url = new URL(process.env.REDIS_URL ?? 'redis://:redispass@localhost:6379'); return { host: url.hostname, port: Number(url.port || 6379), password: decodeURIComponent(url.password), maxRetriesPerRequest: null }; }
void bootstrap();
