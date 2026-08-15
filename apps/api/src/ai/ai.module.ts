import { Module } from '@nestjs/common';
import { OpenAiService } from './openai.service';
import { WhisperService } from './whisper.service';

@Module({ providers: [WhisperService, OpenAiService], exports: [WhisperService, OpenAiService] })
export class AiModule {}
