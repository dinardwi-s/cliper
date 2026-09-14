import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface TranscriptResult {
  language: string;
  languageProbability: number;
  segments: Array<{ text: string; startTime: number; endTime: number; confidence: number | null }>;
}

@Injectable()
export class WhisperService {
  async transcribe(audioPath: string): Promise<TranscriptResult> {
    try {
      const runner = process.env.WHISPER_RUNNER ?? 'python/faster_whisper_runner.py';
      const { stdout } = await execFileAsync('python3', [runner, audioPath], { timeout: 6 * 60 * 60 * 1000, maxBuffer: 20 * 1024 * 1024 });
      const result = JSON.parse(stdout) as TranscriptResult;
      if (!result.language || !Array.isArray(result.segments)) throw new Error('Invalid transcription response');
      return result;
    } catch (error) {
      console.error('WhisperService execution error:', error);
      const message = error instanceof Error ? error.message : 'Speech transcription failed';
      throw new ServiceUnavailableException(message);
    }
  }
}
