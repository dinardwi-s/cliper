import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto } from '../project/dto/create-project.dto';
import { YoutubeDownloaderService } from './youtube-downloader.service';

@Controller('youtube')
@UseGuards(JwtAuthGuard)
export class YoutubeController {
  constructor(private readonly youtube: YoutubeDownloaderService) {}

  @Post('metadata')
  metadata(@Body() dto: CreateProjectDto) {
    return this.youtube.validate(dto.youtubeUrl);
  }

  @Post('download')
  async download(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: CreateProjectDto) {
    const directory = `/tmp/clip-project/${request.user.id}`;
    const path = await this.youtube.download(dto.youtubeUrl, directory);
    return { path, message: 'Video downloaded successfully' };
  }
}
