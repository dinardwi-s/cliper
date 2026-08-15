import { Job, Worker } from 'bullmq';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiService } from '../ai/openai.service';
import { QueueService } from '../queue/queue.service';

interface Payload { projectId: string; userId: string }
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const openai = app.get(OpenAiService);
  const queues = app.get(QueueService);
  const worker = new Worker<Payload>('analyze', async (job: Job<Payload>) => {
    await prisma.project.update({ where: { id: job.data.projectId }, data: { status: 'analyzing' } });
    try {
      const segments = await prisma.transcriptSegment.findMany({ where: { projectId: job.data.projectId }, orderBy: { segmentIndex: 'asc' }, select: { text: true, startTime: true, endTime: true } });
      const suggestions = await openai.detectClips(segments);
      await prisma.$transaction(async (tx) => {
        await tx.clip.deleteMany({ where: { projectId: job.data.projectId } });
        for (const clip of suggestions) await tx.clip.create({ data: { projectId: job.data.projectId, userId: job.data.userId, title: clip.title, startTime: clip.startTime, endTime: clip.endTime, durationSeconds: clip.endTime - clip.startTime, engagementScore: clip.score, transcriptSnippet: clip.hook, aiRationale: clip.rationale, status: 'queued' } });
        await tx.project.update({ where: { id: job.data.projectId }, data: { status: 'analyzed' } });
      });
      const clips = await prisma.clip.findMany({ where: { projectId: job.data.projectId }, select: { id: true, projectId: true, userId: true } });
      await Promise.all(clips.map((clip) => queues.enqueueClipGeneration(clip.id, clip.projectId, clip.userId)));
      await job.updateProgress(100);
      return { projectId: job.data.projectId, suggestions: suggestions.length };
    } catch (error) {
      await prisma.project.update({ where: { id: job.data.projectId }, data: { status: 'failed', errorCode: 'ANALYSIS_FAILED', errorMessage: error instanceof Error ? error.message : 'AI analysis failed' } });
      throw error;
    }
  }, { connection: redisConnection(), concurrency: 2 });
  worker.on('failed', (job, error) => { if (job) console.error(`analyze job ${job.id} failed`, error.message); });
  const shutdown = async () => { await worker.close(); await app.close(); process.exit(0); };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}
function redisConnection() { const url = new URL(process.env.REDIS_URL ?? 'redis://:redispass@localhost:6379'); return { host: url.hostname, port: Number(url.port || 6379), password: decodeURIComponent(url.password), maxRetriesPerRequest: null }; }
void bootstrap();
