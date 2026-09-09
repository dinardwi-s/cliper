export interface ClipSuggestion {
  title: string;
  startTime: number;
  endTime: number;
  score: number;
  hook: string;
  rationale: string;
}

export interface TranscriptInput {
  text: string;
  startTime: number;
  endTime: number;
}

export interface AiClipProvider {
  detectClips(segments: TranscriptInput[]): Promise<ClipSuggestion[]>;
}

export const AI_CLIP_PROVIDER = Symbol('AI_CLIP_PROVIDER');
