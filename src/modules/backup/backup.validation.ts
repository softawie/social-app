import { z } from 'zod';

// Create MongoDB backup validation
export const createMongoBackupValidation = z.object({
  dbName: z.string().min(1, 'Database name is required'),
  backupFolder: z.string().optional(),
});

// Restore MongoDB backup validation
export const restoreMongoBackupValidation = z.object({
  archivePath: z.string().min(1, 'Archive path is required'),
  dbName: z.string().min(1, 'Database name is required'),
  gzip: z.boolean().optional().default(true),
});

// Delete backup validation
export const deleteBackupValidation = z.object({
  fileName: z.string().min(1, 'File name is required'),
});

export type CreateMongoBackupDto = z.infer<typeof createMongoBackupValidation>;
export type RestoreMongoBackupDto = z.infer<typeof restoreMongoBackupValidation>;
export type DeleteBackupDto = z.infer<typeof deleteBackupValidation>;
