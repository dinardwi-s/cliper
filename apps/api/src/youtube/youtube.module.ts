import { Module } from '@nestjs/common';
import { YoutubeDownloaderService } from './youtube-downloader.service';
import { YoutubeController } from './youtube.controller';

@Module({
  controllers: [YoutubeController],
  providers: [YoutubeDownloaderService],
  exports: [YoutubeDownloaderService],
})
export class YoutubeModule {}
