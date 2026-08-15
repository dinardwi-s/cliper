import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

export const DOWNLOAD_QUEUE = 'download';
export const TRANSCRIBE_QUEUE = 'transcribe';
export const ANALYZE_QUEUE = 'analyze';
export const CLIPGEN_QUEUE = 'clipgen';

@Injectable()
export class QueueService implements OnModuleDestroy {
  readonly download: Queue;
  readonly transcribe: Queue;
  readonly analyze: Queue;
  readonly clipgen: Queue;

  constructor() {
    const connection = this.connection();
    this.download = new Queue(DOWNLOAD_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86_400, count: 10_000 },
        removeOnFail: { age: 604_800, count: 10_000 },
      },
    });
    this.transcribe = new Queue(TRANSCRIBE_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions() });
    this.analyze = new Queue(ANALYZE_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions() });
    this.clipgen = new Queue(CLIPGEN_QUEUE, { connection, defaultJobOptions: this.defaultJobOptions() });
  }

  async enqueueTranscription(projectId: string, userId: string, videoPath: string) {
    return this.transcribe.add('transcribe-audio', { projectId, userId, videoPath }, { jobId: `transcribe:${projectId}` });
  }

  async enqueueClipGeneration(clipId: string, projectId: string, userId: string) {
    return this.clipgen.add('generate-clip', { clipId, projectId, userId }, { jobId: `clipgen:${clipId}` });
  }

  async enqueueAnalysis(projectId: string, userId: string) {
    return this.analyze.add('analyze-transcript', { projectId, userId }, { jobId: `analyze:${projectId}` });
  }

  async enqueueDownload(projectId: string, userId: string, youtubeUrl: string) {
    return this.download.add('download-video', { projectId, userId, youtubeUrl }, { jobId: `download:${projectId}` });
  }

  async getDownloadStatus(projectId: string) {
    const job = await this.download.getJob(`download:${projectId}`);
    if (!job) return { projectId, state: 'not_found', progress: 0 };
    return { projectId, state: await job.getState(), progress: job.progress, attemptsMade: job.attemptsMade, failedReason: job.failedReason ?? null };
  }

  async close(): Promise<void> {
    await Promise.all([this.download.close(), this.transcribe.close(), this.analyze.close(), this.clipgen.close()]);
  }

  private defaultJobOptions() {
    return { attempts: 3, backoff: { type: 'exponential' as const, delay: 5000 }, removeOnComplete: { age: 86_400, count: 10_000 }, removeOnFail: { age: 604_800, count: 10_000 } };
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private connection() {
    const url = new URL(process.env.REDIS_URL ?? 'redis://:redispass@localhost:6379');
    return { host: url.hostname, port: Number(url.port || 6379), password: decodeURIComponent(url.password), maxRetriesPerRequest: null };
  }
}
