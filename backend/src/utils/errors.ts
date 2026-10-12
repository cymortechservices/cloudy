export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const DB_ERRORS: Record<string, [number, string, string]> = {
  USER_QUOTA_EXCEEDED: [413, 'USER_QUOTA_EXCEEDED', 'Your storage quota is full.'],
  GLOBAL_CAP_EXCEEDED: [507, 'GLOBAL_CAP_EXCEEDED', 'Cloudy has reached its total capacity. Please try later.'],
  FOLDER_NOT_FOUND: [404, 'FOLDER_NOT_FOUND', 'Folder not found.'],
  FILE_NOT_FOUND: [404, 'FILE_NOT_FOUND', 'File not found.'],
  SIZE_MISMATCH: [422, 'SIZE_MISMATCH', 'Uploaded size does not match the reservation.'],
  FOLDER_CYCLE: [422, 'FOLDER_CYCLE', 'A folder cannot be moved into itself.'],
};
export function fromDbError(message: string): ApiError | null {
  for (const k of Object.keys(DB_ERRORS)) if (message.includes(k)) { const [s, c, m] = DB_ERRORS[k]; return new ApiError(s, c, m); }
  if (message.includes('folders_unique_name')) return new ApiError(409, 'DUPLICATE_NAME', 'A folder with that name already exists here.');
  return null;
}
