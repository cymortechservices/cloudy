export interface StorageAdapter {
  presignUpload(key: string, contentType: string, size: number, ttl: number): Promise<{ url: string; headers: Record<string, string> }>;
  presignDownload(key: string, filename: string, ttl: number, inline: boolean): Promise<string>;
  head(key: string): Promise<{ size: number } | null>;
  readHead(key: string, bytes: number): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}
