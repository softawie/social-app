import { Router } from 'express';
import { BackupController } from './backup.controller';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';
import { backupUpload } from '@utils/multer.config';

const backupRouter = Router();

// MongoDB backup routes (protected)
backupRouter.post('/mongo/create', authenticationMiddleware, BackupController.createMongoBackup);
backupRouter.post('/mongo/restore', authenticationMiddleware, BackupController.restoreMongoBackup);
backupRouter.get('/mongo/list', authenticationMiddleware, BackupController.getAllMongoBackups);
backupRouter.delete('/mongo/delete', authenticationMiddleware, BackupController.deleteMongoBackup);

// Images backup routes (protected)
backupRouter.post('/images/create', authenticationMiddleware, BackupController.createImagesBackup);
backupRouter.post('/images/restore', authenticationMiddleware, backupUpload.single('backupZip'), BackupController.restoreImagesBackup);
backupRouter.delete('/images/delete/:fileName', authenticationMiddleware, BackupController.deleteImagesBackup);

// Backup history (protected)
backupRouter.get('/history', authenticationMiddleware, BackupController.getBackupHistory);

// Backup cleanup (protected)
backupRouter.get('/cleanup/stats', authenticationMiddleware, BackupController.getCleanupStats);
backupRouter.post('/cleanup/trigger', authenticationMiddleware, BackupController.triggerManualCleanup);

// Auto-backup (protected)
backupRouter.get('/auto/stats', authenticationMiddleware, BackupController.getAutoBackupStats);
backupRouter.post('/auto/trigger', authenticationMiddleware, BackupController.triggerManualAutoBackup);

export default backupRouter;
