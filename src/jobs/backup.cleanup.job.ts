import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

export class BackupCleanupJob {
  private static readonly BACKUP_DIR = path.join(process.cwd(), 'src', 'backups');
  private static readonly RETENTION_DAYS = 3;
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  /**
   * Start the weekly backup cleanup job
   * Runs every Sunday at 2:00 AM
   */
  static startWeeklyBackupCleanup(): void {
    // Schedule: Every Sunday at 2:00 AM (0 2 * * 0)
    cron.schedule('0 2 * * 0', () => {
      console.log('🧹 [backup-cleanup] Starting weekly backup cleanup...');
      this.cleanupOldBackups();
    }, {
      timezone: 'UTC'
    });

    console.log('📅 [backup-cleanup] Scheduled weekly backup cleanup every Sunday at 2:00 AM UTC');
  }

  /**
   * Clean up old backup files
   */
  private static cleanupOldBackups(): void {
    try {
      if (!fs.existsSync(this.BACKUP_DIR)) {
        console.log('📁 [backup-cleanup] Backup directory does not exist, skipping cleanup');
        return;
      }

      const files = fs.readdirSync(this.BACKUP_DIR);
      const cutoffDate = new Date(Date.now() - (this.RETENTION_DAYS * this.MS_PER_DAY));
      
      let deletedCount = 0;
      let totalSize = 0;

      console.log(`🔍 [backup-cleanup] Checking ${files.length} files for cleanup (older than ${this.RETENTION_DAYS} days)`);

      files.forEach(fileName => {
        const filePath = path.join(this.BACKUP_DIR, fileName);
        
        try {
          const stats = fs.statSync(filePath);
          
          // Skip directories and non-backup files
          if (stats.isDirectory() || (!fileName.endsWith('.gz') && !fileName.endsWith('.zip'))) {
            return;
          }

          // Check if file is older than retention period
          if (stats.birthtime < cutoffDate) {
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            fs.unlinkSync(filePath);
            deletedCount++;
            totalSize += stats.size;
            
            console.log(`🗑️  [backup-cleanup] Deleted: ${fileName} (${fileSizeMB} MB, created: ${stats.birthtime.toISOString().split('T')[0]})`);
            
            // Log to backup history
            this.logCleanupAction(fileName, 'deleted', `File older than ${this.RETENTION_DAYS} days`);
          }
        } catch (error) {
          console.error(`❌ [backup-cleanup] Error processing file ${fileName}:`, error);
        }
      });

      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      
      if (deletedCount > 0) {
        console.log(`✅ [backup-cleanup] Cleanup completed: ${deletedCount} files deleted, ${totalSizeMB} MB freed`);
        this.logCleanupAction('SUMMARY', 'cleanup_completed', `${deletedCount} files deleted, ${totalSizeMB} MB freed`);
      } else {
        console.log('✅ [backup-cleanup] Cleanup completed: No old files found to delete');
        this.logCleanupAction('SUMMARY', 'cleanup_completed', 'No old files found to delete');
      }

    } catch (error) {
      console.error('❌ [backup-cleanup] Error during backup cleanup:', error);
      this.logCleanupAction('ERROR', 'cleanup_failed', (error as Error).message);
    }
  }

  /**
   * Log cleanup actions to backup history
   */
  private static logCleanupAction(fileName: string, action: string, details: string): void {
    const logFilePath = path.join(this.BACKUP_DIR, 'backup-history.log');
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    
    let logLine = `[${timestamp}] 🧹 CLEANUP: ${action.toUpperCase()} - ${fileName}`;
    if (details) {
      logLine += ` | ${details}`;
    }
    logLine += '\n';

    try {
      // Ensure backup directory exists
      if (!fs.existsSync(this.BACKUP_DIR)) {
        fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
      }

      fs.appendFileSync(logFilePath, logLine);
    } catch (error) {
      console.error('❌ [backup-cleanup] Failed to write cleanup log:', error);
    }
  }

  /**
   * Manual cleanup trigger (for testing or immediate cleanup)
   */
  static triggerManualCleanup(): void {
    console.log('🔧 [backup-cleanup] Manual cleanup triggered');
    this.cleanupOldBackups();
  }

  /**
   * Get cleanup statistics
   */
  static getCleanupStats(): { 
    totalFiles: number; 
    oldFiles: number; 
    totalSize: string; 
    oldFilesSize: string; 
    nextCleanup: string;
  } {
    try {
      if (!fs.existsSync(this.BACKUP_DIR)) {
        return {
          totalFiles: 0,
          oldFiles: 0,
          totalSize: '0 MB',
          oldFilesSize: '0 MB',
          nextCleanup: 'Next Sunday at 2:00 AM UTC'
        };
      }

      const files = fs.readdirSync(this.BACKUP_DIR);
      const cutoffDate = new Date(Date.now() - (this.RETENTION_DAYS * this.MS_PER_DAY));
      
      let totalFiles = 0;
      let oldFiles = 0;
      let totalSize = 0;
      let oldFilesSize = 0;

      files.forEach(fileName => {
        const filePath = path.join(this.BACKUP_DIR, fileName);
        
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory() || (!fileName.endsWith('.gz') && !fileName.endsWith('.zip'))) {
            return;
          }

          totalFiles++;
          totalSize += stats.size;

          if (stats.birthtime < cutoffDate) {
            oldFiles++;
            oldFilesSize += stats.size;
          }
        } catch (error) {
          // Skip files with errors
        }
      });

      return {
        totalFiles,
        oldFiles,
        totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
        oldFilesSize: (oldFilesSize / (1024 * 1024)).toFixed(2) + ' MB',
        nextCleanup: 'Next Sunday at 2:00 AM UTC'
      };

    } catch (error) {
      console.error('❌ [backup-cleanup] Error getting cleanup stats:', error);
      return {
        totalFiles: 0,
        oldFiles: 0,
        totalSize: '0 MB',
        oldFilesSize: '0 MB',
        nextCleanup: 'Error getting next cleanup time'
      };
    }
  }
}
