import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  assertObjectOwner,
  newStorageKey,
  StorageAdapter,
  StorageBucket,
  StoredObject,
} from './storage.interface';

@Injectable()
export class LocalFilesystemStorageService implements StorageAdapter {
  private readonly root = resolve(process.env.STORAGE_LOCAL_PATH ?? 'storage');

  async uploadBuffer(userId: string, bucket: StorageBucket, body: Buffer, name: string, contentType: string): Promise<StoredObject> {
    const key = this.buildKey(userId, name);
    const path = this.path(bucket, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFileSafe(path, body);
    return { bucket, key, contentType, size: body.length };
  }

  async downloadBuffer(bucket: StorageBucket, key: string): Promise<Buffer> {
    return readFile(await this.existingPath(bucket, key));
  }

  async delete(userId: string, bucket: StorageBucket, key: string): Promise<void> {
    this.assertOwner(userId, key);
    await rm(this.path(bucket, key), { force: true });
  }

  async previewUrl(userId: string, bucket: StorageBucket, key: string): Promise<string> {
    this.assertOwner(userId, key);
    await this.existingPath(bucket, key);
    return `/api/storage/objects/${bucket}/${encodeURIComponent(key)}`;
  }

  async openReadStream(userId: string, bucket: StorageBucket, key: string): Promise<NodeJS.ReadableStream> {
    this.assertOwner(userId, key);
    const path = await this.existingPath(bucket, key);
    return createReadStream(path);
  }

  assertOwner(userId: string, key: string): void {
    assertObjectOwner(userId, key);
  }

  buildKey(userId: string, name: string): string {
    return newStorageKey(userId, name);
  }

  async existingPath(bucket: StorageBucket, key: string): Promise<string> {
    const path = this.path(bucket, key);
    try {
      await stat(path);
      return path;
    } catch {
      throw new NotFoundException('Storage object not found');
    }
  }

  private path(bucket: StorageBucket, key: string): string {
    if (key.includes('..') || key.startsWith('/')) throw new NotFoundException('Invalid storage key');
    return join(this.root, bucket, key);
  }
}

async function writeFileSafe(path: string, body: Buffer): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path, body);
}
