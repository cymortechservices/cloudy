import { z } from 'zod';
const uuid = z.string().uuid();
export const uploadIntent = z.object({
  name: z.string().min(1).max(255), mimeType: z.string().min(1).max(127),
  size: z.number().int().positive(), folderId: uuid.nullable().optional(),
}).strict();
export const idParam = z.object({ id: uuid });
export const patchFile = z.object({ name: z.string().min(1).max(255).optional(), folderId: uuid.nullable().optional() }).strict();
export const listFiles = z.object({
  q: z.string().max(100).optional(), folderId: z.union([uuid, z.literal('root')]).optional(),
  type: z.string().max(10).optional(), sort: z.enum(['name', 'size', 'created_at', 'file_extension']).default('created_at'),
  dir: z.enum(['asc', 'desc']).default('desc'), limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const createFolder = z.object({ name: z.string().min(1).max(120).regex(/^[^/\\]+$/), parentId: uuid.nullable().optional() }).strict();
export const patchFolder = z.object({ name: z.string().min(1).max(120).regex(/^[^/\\]+$/).optional(), parentId: uuid.nullable().optional() }).strict();
export const patchProfile = z.object({ displayName: z.string().trim().max(80) }).strict();
