import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageAdapter } from './adapter.js';
import { env } from '../config/env.js';

export function createR2(): StorageAdapter {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  const Bucket = env.R2_BUCKET_NAME!;
  return {
    async presignUpload(key, contentType, size, ttl) {
      const cmd = new PutObjectCommand({ Bucket, Key: key, ContentType: contentType, ContentLength: size });
      const url = await getSignedUrl(s3, cmd, { expiresIn: ttl, signableHeaders: new Set(['content-type', 'content-length']) });
      return { url, headers: { 'Content-Type': contentType } };
    },
    async presignDownload(key, filename, ttl, inline) {
      const safe = filename.replace(/["\r\n]/g, '_');
      const cmd = new GetObjectCommand({
        Bucket, Key: key,
        ResponseContentDisposition: `${inline ? 'inline' : 'attachment'}; filename="${safe}"`,
      });
      return getSignedUrl(s3, cmd, { expiresIn: ttl });
    },
    async head(key) {
      try { const r = await s3.send(new HeadObjectCommand({ Bucket, Key: key })); return { size: Number(r.ContentLength ?? 0) }; }
      catch (e: any) { if (e?.$metadata?.httpStatusCode === 404) return null; throw e; }
    },
    async readHead(key, bytes) {
      const r = await s3.send(new GetObjectCommand({ Bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
      return new Uint8Array(await r.Body!.transformToByteArray());
    },
    async remove(key) { await s3.send(new DeleteObjectCommand({ Bucket, Key: key })); },
  };
}
