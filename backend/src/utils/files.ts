import { randomUUID } from 'node:crypto';

export const ALLOWED: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain'], csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], webp: ['image/webp'],
};

export function sanitizeName(name: string): string {
  const base = name.replace(/[\\/]/g, '_').replace(/[\u0000-\u001f\u007f]/g, '').replace(/^\.+/, '').trim();
  return base.slice(0, 255) || 'file';
}
export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}
export function validateType(name: string, mime: string): { ext: string } | null {
  const ext = extensionOf(name);
  const mimes = ALLOWED[ext];
  if (!mimes || !mimes.includes(mime.toLowerCase())) return null;
  return { ext };
}
/** Server-generated key: <owner>/<random>. The client never supplies any part of it. */
export function newObjectKey(ownerId: string): string { return `${ownerId}/${randomUUID()}`; }

/** Magic-byte check on the first bytes of the stored object. Text formats are validated as non-binary. */
export function signatureMatches(ext: string, head: Uint8Array): boolean {
  const starts = (...b: number[]) => b.every((v, i) => head[i] === v);
  switch (ext) {
    case 'pdf': return starts(0x25, 0x50, 0x44, 0x46);
    case 'png': return starts(0x89, 0x50, 0x4e, 0x47);
    case 'jpg': case 'jpeg': return starts(0xff, 0xd8, 0xff);
    case 'webp': return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45;
    case 'docx': case 'xlsx': case 'pptx': return starts(0x50, 0x4b);
    case 'doc': case 'xls': case 'ppt': return starts(0xd0, 0xcf, 0x11, 0xe0);
    case 'txt': case 'csv': return !head.includes(0x00);
    default: return false;
  }
}
