import { ForbiddenException, Injectable } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export type StorageBucket = 'raw-videos' | 'clips' | 'subtitles' | 'thumbnails';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly buckets: Record<StorageBucket, string>;

  constructor() {
    const endpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
    this.client = new S3Client({
      endpoint,
      region: process.env.STORAGE_REGION ?? 'us-east-1',
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.STORAGE_SECRET_KEY ?? 'minioadmin',
      },
    });
    this.buckets = {
      'raw-videos': process.env.STORAGE_BUCKET_RAW ?? 'raw-videos',
      clips: process.env.STORAGE_BUCKET_CLIPS ?? 'clips',
      subtitles: process.env.STORAGE_BUCKET_SUBTITLES ?? 'subtitles',
      thumbnails: process.env.STORAGE_BUCKET_THUMBNAILS ?? 'thumbnails',
    };
  }

  async checkBucket(bucket: StorageBucket): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.buckets[bucket] }));
  }

  async uploadBuffer(userId: string, bucket: StorageBucket, body: Buffer, name: string, contentType: string): Promise<{ bucket: string; key: string; contentType: string; size: number }> {
    const key = `users/${userId}/${randomUUID()}-${this.safeName(name)}`;
    const targetBucket = this.buckets[bucket];
    await this.client.send(new PutObjectCommand({ Bucket: targetBucket, Key: key, Body: body, ContentType: contentType, ContentLength: body.length, Metadata: { userId } }));
    return { bucket: targetBucket, key, contentType, size: body.length };
  }

  async upload(userId: string, bucket: StorageBucket, file: Express.Multer.File): Promise<{ bucket: string; key: string; contentType: string; size: number }> {
    const key = `users/${userId}/${randomUUID()}-${this.safeName(file.originalname)}`;
    const targetBucket = this.buckets[bucket];
    await this.client.send(new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      Metadata: { userId },
    }));
    return { bucket: targetBucket, key, contentType: file.mimetype, size: file.size };
  }

  async downloadBuffer(bucket: StorageBucket, key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key }));
    if (!response.Body) throw new Error('Storage object has no body');
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(userId: string, bucket: StorageBucket, key: string): Promise<void> {
    this.assertOwner(userId, key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.buckets[bucket], Key: key }));
  }

  async preview(userId: string, bucket: StorageBucket, key: string): Promise<string> {
    this.assertOwner(userId, key);
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key }), { expiresIn: 3600 });
  }

  private assertOwner(userId: string, key: string): void {
    if (!key.startsWith(`users/${userId}/`)) throw new ForbiddenException('Storage object does not belong to user');
  }

  private safeName(name: string): string {
    return name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) || 'upload';
  }
}
