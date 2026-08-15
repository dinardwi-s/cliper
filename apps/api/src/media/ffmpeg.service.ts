import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

@Injectable()
export class FfmpegService {
  async burnSubtitles(input: string, subtitlePath: string, output: string): Promise<void> {
    try { await execFileAsync('ffmpeg', ['-y', '-i', input, '-vf', `ass=${subtitlePath}`, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'copy', '-movflags', '+faststart', output], { timeout: 30 * 60 * 1000 }); } catch { throw new ServiceUnavailableException('FFmpeg subtitle rendering failed'); }
  }

  async extractClip(input: string, output: string, start: number, duration: number, vertical = false): Promise<void> {
    const filters = vertical ? ['-vf', 'scale=ih*9/16:ih,crop=iw:ih'] : [];
    try {
      await execFileAsync('ffmpeg', ['-y', '-ss', String(start), '-i', input, '-t', String(duration), ...filters, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', output], { timeout: 30 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 });
    } catch {
      throw new ServiceUnavailableException('FFmpeg clip rendering failed');
    }
  }
}
