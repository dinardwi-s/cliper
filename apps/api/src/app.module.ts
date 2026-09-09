import { Module } from '@nestjs/common';
import { CleanupModule } from './cleanup/cleanup.module';
import { CacheModule } from './cache/cache.module';
import { AiModule } from './ai/ai.module';
import { MediaModule } from './media/media.module';
import { HistoryModule } from './history/history.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { YoutubeModule } from './youtube/youtube.module';
import { TranscriptModule } from './transcript/transcript.module';

@Module({
  imports: [PrismaModule, CacheModule, CleanupModule, QueueModule, AiModule, MediaModule, AuthModule, ProjectModule, StorageModule, YoutubeModule, TranscriptModule, HistoryModule, HealthModule],
})
export class AppModule {}
