import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface YouTubeMetadata {
  id: string;
  title: string;
  durationSeconds: number;
  thumbnailUrl: string | null;
  uploader: string | null;
  webpageUrl: string;
}

@Injectable()
export class YoutubeDownloaderService {
  async validate(url: string): Promise<YouTubeMetadata> {
    this.assertYouTubeUrl(url);
    try {
      const { stdout } = await execFileAsync('yt-dlp', ['--dump-single-json', '--skip-download', '--no-playlist', url], { timeout: 60_000, maxBuffer: 2 * 1024 * 1024 });
      const data = JSON.parse(stdout) as Record<string, unknown>;
      return {
        id: String(data.id),
        title: String(data.title ?? data.id),
        durationSeconds: Number(data.duration ?? 0),
        thumbnailUrl: typeof data.thumbnail === 'string' ? data.thumbnail : null,
        uploader: typeof data.uploader === 'string' ? data.uploader : null,
        webpageUrl: String(data.webpage_url ?? url),
      };
    } catch {
      throw new ServiceUnavailableException('Unable to read YouTube metadata');
    }
  }

  async download(url: string, outputDirectory: string, onProgress?: (percent: number) => void): Promise<string> {
    this.assertYouTubeUrl(url);
    await mkdir(outputDirectory, { recursive: true });
    const output = `${outputDirectory}/%(id)s.%(ext)s`;
    try {
      await new Promise<void>((resolve, reject) => {
        const child = execFile('yt-dlp', ['--no-playlist', '--newline', '--restrict-filenames', '-f', 'bv*[height<=1080]+ba/b[height<=1080]', '-o', output, url], { timeout: 6 * 60 * 60 * 1000 });
        let stderr = '';
        child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
        child.stdout?.on('data', (chunk: Buffer) => {
          const match = /\[download\]\s+(\d+(?:\.\d+)?)%/.exec(chunk.toString());
          if (match) onProgress?.(Number(match[1]));
        });
        child.once('error', reject);
        child.once('close', (code) => code === 0 ? resolve() : reject(new Error(stderr || `yt-dlp exited with ${code}`)));
      });
      const metadata = await this.validate(url);
      const files = await readdir(outputDirectory);
      const downloaded = files.find((file) => file.startsWith(`${metadata.id}.`));
      if (!downloaded) throw new Error('Downloaded file not found');
      return `${outputDirectory}/${downloaded}`;
    } catch {
      throw new ServiceUnavailableException('Unable to download YouTube video');
    }
  }

  async cleanup(directory: string): Promise<void> {
    await rm(directory, { recursive: true, force: true });
  }

  private assertYouTubeUrl(rawUrl: string): void {
    let url: URL;
    try { url = new URL(rawUrl); } catch { throw new BadRequestException('Invalid YouTube URL'); }
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['youtube.com', 'm.youtube.com', 'youtu.be'].includes(hostname)) throw new BadRequestException('URL must belong to YouTube');
  }
}
