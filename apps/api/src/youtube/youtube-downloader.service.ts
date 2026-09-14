import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
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
    const cookiesPath = process.env.YTDLP_COOKIES_PATH ?? '/app/storage/cookies.txt';
    const hasCookies = existsSync(cookiesPath);

    try {
      const args = ['--dump-single-json', '--skip-download', '--no-playlist', '--js-runtimes', 'node'];
      if (hasCookies) {
        args.push('--cookies', cookiesPath);
      }
      args.push(url);
      const { stdout } = await execFileAsync('yt-dlp', args, { timeout: 60_000, maxBuffer: 2 * 1024 * 1024 });
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
      // Fallback to official YouTube oEmbed API when yt-dlp encounters bot protection
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const resp = await fetch(oembedUrl);
        if (resp.ok) {
          const oembed = await resp.json() as { title?: string; author_name?: string; thumbnail_url?: string };
          const videoId = this.extractVideoId(url);
          return {
            id: videoId,
            title: oembed.title ?? videoId,
            durationSeconds: 0,
            thumbnailUrl: oembed.thumbnail_url ?? null,
            uploader: oembed.author_name ?? null,
            webpageUrl: url,
          };
        }
      } catch {
        // pass through to final exception
      }
      throw new ServiceUnavailableException('Unable to read YouTube metadata');
    }
  }

  async download(url: string, outputDirectory: string, onProgress?: (percent: number) => void): Promise<string> {
    this.assertYouTubeUrl(url);
    await mkdir(outputDirectory, { recursive: true });
    const output = `${outputDirectory}/%(id)s.%(ext)s`;
    const cookiesPath = process.env.YTDLP_COOKIES_PATH ?? '/app/storage/cookies.txt';
    const hasCookies = existsSync(cookiesPath);

    try {
      await new Promise<void>((resolve, reject) => {
        const args = ['--no-playlist', '--newline', '--restrict-filenames', '-f', 'bv*[height<=1080]+ba/b[height<=1080]', '--js-runtimes', 'node', '-o', output];
        if (hasCookies) {
          args.push('--cookies', cookiesPath);
        }
        args.push(url);

        const child = execFile('yt-dlp', args, { timeout: 6 * 60 * 60 * 1000 });
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
      const downloaded = files.find((file) => file.startsWith(`${metadata.id}.`)) || files.find((file) => !file.endsWith('.part') && !file.endsWith('.ytdl'));
      if (!downloaded) throw new Error('Downloaded file not found');
      return `${outputDirectory}/${downloaded}`;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to download YouTube video';
      throw new ServiceUnavailableException(msg);
    }
  }

  async cleanup(directory: string): Promise<void> {
    await rm(directory, { recursive: true, force: true });
  }

  private extractVideoId(rawUrl: string): string {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'youtu.be') return url.pathname.slice(1);
    const queryId = url.searchParams.get('v');
    if (queryId) return queryId;
    const parts = url.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'shorts' || parts[0] === 'embed') && parts[1]) return parts[1];
    return parts[parts.length - 1] ?? 'unknown';
  }

  private assertYouTubeUrl(rawUrl: string): void {
    let url: URL;
    try { url = new URL(rawUrl); } catch { throw new BadRequestException('Invalid YouTube URL'); }
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['youtube.com', 'm.youtube.com', 'youtu.be'].includes(hostname)) throw new BadRequestException('URL must belong to YouTube');
  }
}
