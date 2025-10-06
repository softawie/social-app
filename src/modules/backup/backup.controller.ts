import { Request, Response } from 'express';
import { BackupService } from './backup.service';
import { AppException } from '@src/exceptions/app.exception';
import { handleControllerError } from '../../utils/error-handler.utils';
import { BackupCleanupJob } from '@src/jobs/backup.cleanup.job';
import { AutoBackupJob } from '@src/jobs/auto.backup.job';
import { 
  createMongoBackupValidation,
  restoreMongoBackupValidation,
  deleteBackupValidation
} from './backup.validation';

export class BackupController {
  /**
   * Create MongoDB backup
   */
  static async createMongoBackup(req: Request, res: Response) {
    try {
      // Validate request body
      const validatedData = createMongoBackupValidation.parse(req.body);
      
      // Create backup
      const result = await BackupService.createMongoBackup(validatedData);
      
      res.status(200).json({
        success: true,
        message: 'MongoDB backup created successfully',
        data: result,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Restore MongoDB backup
   */
  static async restoreMongoBackup(req: Request, res: Response) {
    try {
      // Validate request body
      const validatedData = restoreMongoBackupValidation.parse(req.body);
      
      // Restore backup
      const result = await BackupService.restoreMongoBackup(validatedData);
      
      res.status(200).json({
        success: true,
        message: 'MongoDB backup restored successfully',
        data: result,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get all MongoDB backups
   */
  static async getAllMongoBackups(req: Request, res: Response) {
    try {
      const backups = await BackupService.getAllMongoBackups();
      
      res.status(200).json({
        success: true,
        message: 'MongoDB backups retrieved successfully',
        data: backups,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Delete MongoDB backup
   */
  static async deleteMongoBackup(req: Request, res: Response) {
    try {
      // Validate request body
      const validatedData = deleteBackupValidation.parse(req.body);
      
      // Delete backup
      await BackupService.deleteMongoBackup(validatedData.fileName);
      
      res.status(200).json({
        success: true,
        message: 'MongoDB backup deleted successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Create images backup
   */
  static async createImagesBackup(req: Request, res: Response) {
    try {
      const result = await BackupService.createImagesBackup();
      
      res.status(200).json({
        success: true,
        message: 'Images backup created successfully',
        data: result,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Restore images backup
   */
  static async restoreImagesBackup(req: Request, res: Response) {
    try {
      if (!req.file || !req.file.path) {
        throw new AppException('No backup file uploaded', 400);
      }

      const result = await BackupService.restoreImagesBackup(req.file.path);
      
      res.status(200).json({
        success: true,
        message: 'Images backup restored successfully',
        data: result,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Delete images backup
   */
  static async deleteImagesBackup(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      
      if (!fileName) {
        throw new AppException('File name is required', 400);
      }

      await BackupService.deleteImagesBackup(fileName);
      
      res.status(200).json({
        success: true,
        message: 'Images backup deleted successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get backup history/logs
   */
  static async getBackupHistory(req: Request, res: Response) {
    try {
      const history = await BackupService.getBackupHistory();
      
      res.status(200).json({
        success: true,
        message: 'Backup history retrieved successfully',
        data: history,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get backup cleanup statistics
   */
  static async getCleanupStats(req: Request, res: Response) {
    try {
      const stats = BackupCleanupJob.getCleanupStats();
      
      res.status(200).json({
        success: true,
        message: 'Cleanup statistics retrieved successfully',
        data: stats,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Trigger manual backup cleanup
   */
  static async triggerManualCleanup(req: Request, res: Response) {
    try {
      BackupCleanupJob.triggerManualCleanup();
      
      res.status(200).json({
        success: true,
        message: 'Manual backup cleanup triggered successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get auto-backup statistics
   */
  static async getAutoBackupStats(req: Request, res: Response) {
    try {
      const stats = AutoBackupJob.getAutoBackupStats();
      
      res.status(200).json({
        success: true,
        message: 'Auto-backup statistics retrieved successfully',
        data: stats,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Trigger manual auto-backup
   */
  static async triggerManualAutoBackup(req: Request, res: Response) {
    try {
      const result = await AutoBackupJob.triggerManualAutoBackup();
      
      res.status(result.success ? 200 : 500).json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }
}
