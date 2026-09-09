import { Inject, Injectable } from '@nestjs/common';
import { AI_CLIP_PROVIDER, AiClipProvider, ClipSuggestion, TranscriptInput } from './ai-clip-provider';

@Injectable()
export class OpenAiService {
  constructor(@Inject(AI_CLIP_PROVIDER) private readonly provider: AiClipProvider) {}
  detectClips(segments: TranscriptInput[]): Promise<ClipSuggestion[]> { return this.provider.detectClips(segments); }
}
