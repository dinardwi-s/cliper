import { Injectable } from '@nestjs/common';
import { StorageAdapter } from './storage.interface';
import { LocalFilesystemStorageService } from './local-filesystem.storage.service';

@Injectable()
export class StorageService implements StorageAdapter {
  private readonly adapter: StorageAdapter = new LocalFilesystemStorageService();

  uploadBuffer(userId: string, bucket: Parameters<StorageAdapter['uploadBuffer']>[1], body: Buffer, name: string, contentType: string) {
    return this.adapter.uploadBuffer(userId, bucket, body, name, contentType);
  }

  downloadBuffer(bucket: Parameters<StorageAdapter['downloadBuffer']>[0], key: string) {
    return this.adapter.downloadBuffer(bucket, key);
  }

  delete(userId: string, bucket: Parameters<StorageAdapter['delete']>[1], key: string) {
    return this.adapter.delete(userId, bucket, key);
  }

  previewUrl(userId: string, bucket: Parameters<StorageAdapter['previewUrl']>[1], key: string) {
    return this.adapter.previewUrl(userId, bucket, key);
  }

  openReadStream(userId: string, bucket: Parameters<StorageAdapter['openReadStream']>[1], key: string) {
    return this.adapter.openReadStream(userId, bucket, key);
  }

  assertOwner(userId: string, key: string): void {
    this.adapter.assertOwner(userId, key);
  }

  buildKey(userId: string, name: string): string {
    return this.adapter.buildKey(userId, name);
  }
}
