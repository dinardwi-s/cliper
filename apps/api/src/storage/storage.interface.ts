import { ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type StorageBucket = 'raw-videos' | 'clips' | 'subtitles' | 'thumbnails';

export interface StoredObject {
  bucket: string;
  key: string;
  contentType: string;
  size: number;
}

export interface StorageAdapter {
  uploadBuffer(userId: string, bucket: StorageBucket, body: Buffer, name: string, contentType: string): Promise<StoredObject>;
  downloadBuffer(bucket: StorageBucket, key: string): Promise<Buffer>;
  delete(userId: string, bucket: StorageBucket, key: string): Promise<void>;
  previewUrl(userId: string, bucket: StorageBucket, key: string): Promise<string>;
  openReadStream(userId: string, bucket: StorageBucket, key: string): Promise<NodeJS.ReadableStream>;
  assertOwner(userId: string, key: string): void;
  buildKey(userId: string, name: string): string;
}

export function newStorageKey(userId: string, name: string): string {
  return `users/${userId}/${randomUUID()}-${safeName(name)}`;
}

export function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) || 'upload';
}

export function assertObjectOwner(userId: string, key: string): void {
  if (!key.startsWith(`users/${userId}/`)) throw new ForbiddenException('Storage object does not belong to user');
}
