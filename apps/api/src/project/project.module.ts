import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectController } from './project.controller';
import { ClipSuggestionController } from './clip-suggestion.controller';
import { ProjectService } from './project.service';
import { YoutubeModule } from '../youtube/youtube.module';
import { StorageModule } from '../storage/storage.module';
import { ClipController } from './clip.controller';
import { SubtitleController } from './subtitle.controller';

@Module({
  imports: [YoutubeModule, StorageModule],
  controllers: [ProjectController, ClipSuggestionController, ClipController, SubtitleController],
  providers: [ProjectService, JwtAuthGuard],
})
export class ProjectModule {}
