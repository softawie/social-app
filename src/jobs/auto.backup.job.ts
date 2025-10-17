import cron from 'node-cron';
import { BackupService } from '@modules/backup/backup.service';

export class AutoBackupJob {
  private static readonly DEFAULT_DB_NAME = process.env.DB_NAME || 'myDataBase';

  /**
   * Start the daily automatic backup job
   * Runs every day at 11:00 PM
   */
  static startDailyAutoBackup(): void {
    // Schedule: Every day at 11:00 PM (0 23 * * *)
    cron.schedule('0 23 * * *', () => {
      console.log('🔄 [auto-backup] Starting daily automatic backup...');
      this.performDailyBackup();
    }, {
      timezone: 'UTC'
    });

    console.log('📅 [auto-backup] Scheduled daily automatic backup every day at 11:00 PM UTC');
  }

  /**
   * Perform daily backup of both MongoDB and images
   */
  private static async performDailyBackup(): Promise<void> {
    const startTime = new Date();
    console.log(`🚀 [auto-backup] Starting backup process at ${startTime.toISOString()}`);

    let mongoSuccess = false;
    let imagesSuccess = false;
    let mongoResult: any = null;
    let imagesResult: any = null;

    // 1. Create MongoDB Backup
    try {
      console.log('📊 [auto-backup] Creating MongoDB backup...');
      mongoResult = await BackupService.createMongoBackup({
        dbName: this.DEFAULT_DB_NAME
      });
      mongoSuccess = true;
      console.log(`✅ [auto-backup] MongoDB backup created: ${mongoResult.backupFile}`);
    } catch (error) {
      console.error('❌ [auto-backup] MongoDB backup failed:', error);
      mongoResult = { error: (error as Error).message };
    }

    // 2. Create Images Backup
    try {
      console.log('🖼️ [auto-backup] Creating images backup...');
      imagesResult = await BackupService.createImagesBackup();
      imagesSuccess = true;
      const sizeMB = (imagesResult.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ [auto-backup] Images backup created: ${sizeMB} MB`);
    } catch (error) {
      console.error('❌ [auto-backup] Images backup failed:', error);
      imagesResult = { error: (error as Error).message };
    }

    // 3. Log summary
    const endTime = new Date();
    const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);
    
    const summary = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration}s`,
      mongoBackup: {
        success: mongoSuccess,
        result: mongoResult
      },
      imagesBackup: {
        success: imagesSuccess,
        result: imagesResult
      }
    };

    this.logBackupSummary(summary);

    if (mongoSuccess && imagesSuccess) {
      console.log(`🎉 [auto-backup] Daily backup completed successfully in ${duration}s`);
    } else if (mongoSuccess || imagesSuccess) {
      console.log(`⚠️ [auto-backup] Daily backup partially completed in ${duration}s`);
    } else {
      console.log(`💥 [auto-backup] Daily backup failed in ${duration}s`);
    }
  }

  /**
   * Log backup summary to backup history
   */
  private static logBackupSummary(summary: any): void {
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    
    let logLines: string[] = [];
    
    // Header
    logLines.push(`[${timestamp}] 🤖 AUTO-BACKUP: Daily backup started`);
    
    // MongoDB backup result
    if (summary.mongoBackup.success) {
      logLines.push(`[${timestamp}] 🤖 AUTO-BACKUP: MongoDB backup SUCCESS | File: ${summary.mongoBackup.result.backupFile}`);
    } else {
      logLines.push(`[${timestamp}] 🤖 AUTO-BACKUP: MongoDB backup FAILED | Error: ${summary.mongoBackup.result.error}`);
    }
    
    // Images backup result
    if (summary.imagesBackup.success) {
      const sizeMB = (summary.imagesBackup.result.size / (1024 * 1024)).toFixed(2);
      logLines.push(`[${timestamp}] 🤖 AUTO-BACKUP: Images backup SUCCESS | Size: ${sizeMB} MB | Path: ${summary.imagesBackup.result.path}`);
    } else {
      logLines.push(`[${timestamp}] 🤖 AUTO-BACKUP: Images backup FAILED | Error: ${summary.imagesBackup.result.error}`);
    }
    
    // Summary
    const status = (summary.mongoBackup.success && summary.imagesBackup.success) ? 'SUCCESS' : 
                   (summary.mongoBackup.success || summary.imagesBackup.success) ? 'PARTIAL' : 'FAILED';
    logLines.push(`[${timestamp}] 🤖 AUTO-BACKUP: Daily backup ${status} | Duration: ${summary.duration}`);

    // Write to backup history log
    this.writeToBackupHistory(logLines);
  }

  /**
   * Write log lines to backup history file
   */
  private static writeToBackupHistory(logLines: string[]): void {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const backupDir = path.join(process.cwd(), 'src', 'backups');
      const logFilePath = path.join(backupDir, 'backup-history.log');
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Append all log lines
      const logContent = logLines.join('\n') + '\n';
      fs.appendFileSync(logFilePath, logContent);
      
      console.log(`📝 [auto-backup] Logged ${logLines.length} entries to backup history`);
    } catch (error) {
      console.error('❌ [auto-backup] Failed to write backup history:', error);
    }
  }

  /**
   * Manual trigger for testing (runs the same backup process)
   */
  static async triggerManualAutoBackup(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔧 [auto-backup] Manual auto-backup triggered');
      await this.performDailyBackup();
      return {
        success: true,
        message: 'Manual auto-backup completed successfully'
      };
    } catch (error) {
      console.error('❌ [auto-backup] Manual auto-backup failed:', error);
      return {
        success: false,
        message: `Manual auto-backup failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get next scheduled backup time
   */
  static getNextBackupTime(): string {
    const now = new Date();
    const nextBackup = new Date();
    
    // Set to 11 PM today
    nextBackup.setHours(23, 0, 0, 0);
    
    // If 11 PM has already passed today, set to 11 PM tomorrow
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }
    
    return nextBackup.toISOString().replace('T', ' ').split('.')[0] + ' UTC';
  }

  /**
   * Get auto-backup statistics
   */
  static getAutoBackupStats(): {
    enabled: boolean;
    schedule: string;
    nextBackup: string;
    databaseName: string;
  } {
    return {
      enabled: true,
      schedule: 'Daily at 11:00 PM UTC',
      nextBackup: this.getNextBackupTime(),
      databaseName: this.DEFAULT_DB_NAME
    };
  }
}
