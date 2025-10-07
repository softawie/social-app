import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { AppException } from '@src/exceptions/app.exception';

const execAsync = promisify(exec);

export interface MongoBackupData {
  dbName: string;
  backupFolder?: string;
}

export interface MongoRestoreData {
  archivePath: string;
  dbName: string;
  gzip?: boolean;
}

export interface BackupResult {
  dbName: string;
  number: number;
  date: string;
  backupFile: string;
  success: boolean;
  error?: string;
}

export class BackupService {
  private static readonly DEFAULT_BACKUP_DIR = path.join(process.cwd(), 'src', 'backups');
  private static readonly UPLOADS_DIR = path.join(process.cwd(), 'src', 'uploads');
  private static readonly LOG_FILE = 'backup-history.log';

  /**
   * Ensure backup directory exists
   */
  private static ensureBackupDir(backupDir: string): void {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  }

  /**
   * Log backup operation to file
   */
  private static logBackupToFile(result: BackupResult, backupDir: string): void {
    const logFilePath = path.join(backupDir, this.LOG_FILE);
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    
    let logLine = `[${timestamp}] ${result.success ? '✅' : '❌'} Backup #${result.number} for DB: ${result.dbName}`;
    
    if (result.success) {
      logLine += ` | File: ${result.backupFile}`;
    } else {
      logLine += ` | Error: ${result.error}`;
    }
    
    logLine += '\n';
    
    try {
      fs.appendFileSync(logFilePath, logLine);
      console.log(`📝 Log written to ${logFilePath}`);
    } catch (err) {
      console.error(`❌ Failed to write to log file: ${(err as Error).message}`);
    }
  }

  /**
   * Create MongoDB backup
   */
  static async createMongoBackup(data: MongoBackupData): Promise<BackupResult> {
    const { dbName, backupFolder } = data;
    const backupDir = backupFolder || this.DEFAULT_BACKUP_DIR;

    this.ensureBackupDir(backupDir);

    // Generate backup file name with incremental number
    const files = fs.readdirSync(backupDir);
    const regex = new RegExp(`^${dbName}-(\\d+)-\\d{4}-\\d{2}-\\d{2}.*\\.gz$`);
    const numbers = files
      .map((file) => {
        const match = file.match(regex);
        return match ? parseInt(match[1]) : null;
      })
      .filter((n) => n !== null) as number[];

    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now
      .toISOString()
      .split('T')[1]
      .split('Z')[0]
      .replace(/[:.]/g, '-');

    const fileSafeTimestamp = `${date}-${time}`;
    const backupFile = path.join(backupDir, `${dbName}-${nextNumber}-${fileSafeTimestamp}.gz`);

    const cmd = `mongodump --db=${dbName} --archive="${backupFile}" --gzip`;

    console.log(`\nBackup command:\n${cmd}\n`);

    try {
      const { stdout, stderr } = await execAsync(cmd);
      
      if (stderr) {
        console.warn(`mongodump warning: ${stderr}`);
      }

      const result: BackupResult = {
        dbName,
        number: nextNumber,
        date,
        backupFile,
        success: true,
      };

      this.logBackupToFile(result, backupDir);
      
      console.log(`✅ Backup complete for DB "${dbName}" at: ${backupFile}`);
      return result;

    } catch (error) {
      const result: BackupResult = {
        dbName,
        number: nextNumber,
        date,
        backupFile,
        success: false,
        error: (error as Error).message,
      };

      this.logBackupToFile(result, backupDir);
      throw new AppException(`Backup failed for DB "${dbName}": ${(error as Error).message}`, 500);
    }
  }

  /**
   * Restore MongoDB backup
   */
  static async restoreMongoBackup(data: MongoRestoreData): Promise<{ message: string; output: string }> {
    const { archivePath, dbName, gzip = true } = data;

    let command = 'mongorestore';
    
    if (gzip) command += ' --gzip';
    if (archivePath) command += ` --archive="${archivePath}"`;
    if (dbName) command += ` --nsFrom="${dbName}.*" --nsTo="${dbName}.*"`;
    
    command += ' --drop';

    console.log(`\n🛠️ Running restore command:\n${command}\n`);

    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn(`Stderr:\n${stderr}`);
      }

      console.log(`✅ Restore completed!\n${stdout}`);
      return { message: 'Restore completed', output: stdout };

    } catch (error) {
      console.error(`❌ Error during restore:\n${(error as Error).message}`);
      throw new AppException(`Restore failed: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get all MongoDB backups
   */
  static async getAllMongoBackups(): Promise<Array<{ fileName: string; sizeMB: string; createdAt: string }>> {
    const backupDir = this.DEFAULT_BACKUP_DIR;

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith('.gz'))
      .sort();

    return files.map((fileName) => {
      const fullPath = path.join(backupDir, fileName);
      const stats = fs.statSync(fullPath);

      return {
        fileName,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        createdAt: stats.birthtime.toISOString().replace('T', ' ').split('.')[0],
      };
    });
  }

  /**
   * Delete MongoDB backup
   */
  static async deleteMongoBackup(fileName: string): Promise<void> {
    if (!fileName) {
      throw new AppException('fileName is required to delete a backup file', 400);
    }

    const backupDir = this.DEFAULT_BACKUP_DIR;
    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new AppException(`Backup file not found: ${fileName}`, 404);
    }

    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted backup: ${fileName}`);
    } catch (error) {
      console.error(`❌ Failed to delete backup: ${(error as Error).message}`);
      throw new AppException(`Failed to delete backup: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Create images backup
   */
  static async createImagesBackup(): Promise<{ message: string; size: number; path: string }> {
    const uploadsDir = this.UPLOADS_DIR;
    const backupDir = this.DEFAULT_BACKUP_DIR;
    
    this.ensureBackupDir(backupDir);

    if (!fs.existsSync(uploadsDir)) {
      throw new AppException('Uploads directory not found', 404);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const zipFilePath = path.join(backupDir, `images-backup-${timestamp}.zip`);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 1 } });

      const start = Date.now();

      output.on('close', () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`✅ Images backup done in ${elapsed}s - ${archive.pointer()} bytes`);
        resolve({
          message: 'Images backup created successfully',
          size: archive.pointer(),
          path: zipFilePath,
        });
      });

      archive.on('error', (err) => {
        console.error('❌ Archiver error:', err);
        reject(new AppException('Failed to create images backup', 500));
      });

      archive.pipe(output);
      archive.directory(uploadsDir, false);
      archive.finalize();
    });
  }

  /**
   * Restore images backup
   */
  static async restoreImagesBackup(uploadedZipPath: string): Promise<{ message: string }> {
    const uploadsDir = this.UPLOADS_DIR;

    if (!fs.existsSync(uploadedZipPath)) {
      throw new AppException('Backup file not found', 404);
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      fs.createReadStream(uploadedZipPath)
        .pipe(unzipper.Extract({ path: uploadsDir }))
        .on('close', () => {
          // Clean up temp file
          fs.unlink(uploadedZipPath, (err: any) => {
            if (err) console.warn('⚠️ Failed to delete temp file:', err);
          });

          console.log(`✅ Images backup restored from uploaded file.`);
          resolve({ message: 'Images backup restored successfully' });
        })
        .on('error', (err) => {
          console.error('❌ Restore failed:', err);
          reject(new AppException('Failed to restore images backup', 500));
        });
    });
  }

  /**
   * Get all images backups
   */
  static async getAllImagesBackups(): Promise<Array<{ fileName: string; sizeMB: string; createdAt: string }>> {
    const backupDir = this.DEFAULT_BACKUP_DIR;

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith('.zip') && file.includes('images-backup'))
      .sort((a, b) => {
        // Sort by creation time (newest first)
        const statsA = fs.statSync(path.join(backupDir, a));
        const statsB = fs.statSync(path.join(backupDir, b));
        return statsB.birthtime.getTime() - statsA.birthtime.getTime();
      });

    return files.map((fileName) => {
      const fullPath = path.join(backupDir, fileName);
      const stats = fs.statSync(fullPath);

      return {
        fileName,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        createdAt: stats.birthtime.toISOString().replace('T', ' ').split('.')[0],
      };
    });
  }

  /**
   * Get images backup file path
   */
  static async getImagesBackupPath(fileName: string): Promise<string> {
    if (!fileName || !fileName.endsWith('.zip')) {
      throw new AppException('Invalid filename provided', 400);
    }

    const backupDir = this.DEFAULT_BACKUP_DIR;
    const filePath = path.join(backupDir, fileName);

    // Security check
    if (!filePath.startsWith(backupDir)) {
      throw new AppException('Unauthorized file path', 403);
    }

    if (!fs.existsSync(filePath)) {
      throw new AppException('File not found', 404);
    }

    return filePath;
  }

  /**
   * Delete images backup
   */
  static async deleteImagesBackup(fileName: string): Promise<void> {
    if (!fileName || !fileName.endsWith('.zip')) {
      throw new AppException('Invalid filename provided', 400);
    }

    const backupDir = this.DEFAULT_BACKUP_DIR;
    const filePath = path.join(backupDir, fileName);

    // Security check
    if (!filePath.startsWith(backupDir)) {
      throw new AppException('Unauthorized file path', 403);
    }

    if (!fs.existsSync(filePath)) {
      throw new AppException('File not found', 404);
    }

    try {
      fs.unlinkSync(filePath);
      console.log('🧹 Deleted:', fileName);
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw new AppException('Failed to delete file', 500);
    }
  }

  /**
   * Get backup history from log file
   */
  static async getBackupHistory(): Promise<string[]> {
    const backupDir = this.DEFAULT_BACKUP_DIR;
    const logFilePath = path.join(backupDir, this.LOG_FILE);

    if (!fs.existsSync(logFilePath)) {
      return [];
    }

    try {
      const logContent = fs.readFileSync(logFilePath, 'utf-8');
      return logContent.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
      console.error('❌ Failed to read backup history:', error);
      return [];
    }
  }
}
