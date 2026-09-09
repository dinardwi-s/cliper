import { Module } from '@nestjs/common';
import { AI_CLIP_PROVIDER } from './ai-clip-provider';
import { GeminiClipProvider } from './gemini.provider';
import { OpenAiClipProvider } from './openai.provider';
import { OpenAiService } from './openai.service';
import { WhisperService } from './whisper.service';

@Module({
  providers: [
    WhisperService,
    OpenAiClipProvider,
    GeminiClipProvider,
    OpenAiService,
    {
      provide: AI_CLIP_PROVIDER,
      useFactory: (openai: OpenAiClipProvider, gemini: GeminiClipProvider) => process.env.AI_PROVIDER === 'gemini' ? gemini : openai,
      inject: [OpenAiClipProvider, GeminiClipProvider],
    },
  ],
  exports: [WhisperService, OpenAiService],
})
export class AiModule {}
