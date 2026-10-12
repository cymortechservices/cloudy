import { describe, it, expect } from 'vitest';
import { sanitizeName, validateType, signatureMatches, newObjectKey } from '../utils/files.js';

describe('file validation (runs locally, no credentials)', () => {
  it('rejects executables and mismatched mime', () => {
    expect(validateType('a.exe', 'application/octet-stream')).toBeNull();
    expect(validateType('a.html', 'text/html')).toBeNull();
    expect(validateType('a.pdf', 'image/png')).toBeNull();
    expect(validateType('a.pdf', 'application/pdf')).toEqual({ ext: 'pdf' });
  });
  it('sanitizes path traversal in names', () => { expect(sanitizeName('../../etc/passwd')).not.toMatch(/[\\/]/); });
  it('checks magic bytes', () => {
    expect(signatureMatches('pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(signatureMatches('pdf', new Uint8Array([0x4d, 0x5a, 0, 0]))).toBe(false);
    expect(signatureMatches('txt', new Uint8Array([0x4d, 0x5a, 0x00]))).toBe(false);
  });
  it('object keys are owner-prefixed and server generated', () => {
    const k = newObjectKey('user-a'); expect(k.startsWith('user-a/')).toBe(true);
    expect(newObjectKey('user-a')).not.toBe(k);
  });
});
