import { Module } from '@nestjs/common';
import { FfmpegService } from './ffmpeg.service';
import { SubtitleService } from './subtitle.service';

@Module({ providers: [FfmpegService, SubtitleService], exports: [FfmpegService, SubtitleService] })
export class MediaModule {}
