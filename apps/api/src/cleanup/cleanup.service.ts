import { Injectable } from '@nestjs/common';
import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class CleanupService {
  private readonly root = process.env.STORAGE_LOCAL_PATH ?? 'storage';
  private readonly maxAgeMs = Number(process.env.STORAGE_TEMP_RETENTION_HOURS ?? 72) * 60 * 60 * 1000;

  async removeExpiredRawFiles(): Promise<number> {
    const bucket = join(this.root, 'raw-videos');
    let removed = 0;
    for (const user of await this.entries(bucket)) {
      const userPath = join(bucket, user);
      for (const file of await this.entries(userPath)) {
        const path = join(userPath, file);
        const metadata = await stat(path);
        if (Date.now() - metadata.mtimeMs > this.maxAgeMs) { await rm(path, { force: true }); removed++; }
      }
    }
    return removed;
  }

  private async entries(path: string): Promise<string[]> {
    try { return await readdir(path); } catch { return []; }
  }
}
