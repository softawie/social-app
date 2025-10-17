import { Router } from 'express';
import { BackupController } from './backup.controller';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';
import { backupUpload } from '@utils/multer.config';
import { quickCache, invalidateCache } from '@src/MiddleWares/universal-cache.middleware';

const backupRouter = Router();

// MongoDB backup routes (protected) - with caching for lists
backupRouter.post('/mongo/create', 
  authenticationMiddleware, 
  invalidateCache(['api:*backup*']),
  BackupController.createMongoBackup
);
backupRouter.post('/mongo/restore', authenticationMiddleware, BackupController.restoreMongoBackup);
backupRouter.get('/mongo/list', authenticationMiddleware, quickCache.dynamic(), BackupController.getAllMongoBackups);
backupRouter.delete('/mongo/delete', 
  authenticationMiddleware, 
  invalidateCache(['api:*backup*']),
  BackupController.deleteMongoBackup
);

// Images backup routes (protected) - with caching for lists
backupRouter.post('/images/create', 
  authenticationMiddleware, 
  invalidateCache(['api:*backup*']),
  BackupController.createImagesBackup
);
backupRouter.get('/images/list', authenticationMiddleware, quickCache.dynamic(), BackupController.getAllImagesBackups);
backupRouter.get('/images/download/:fileName', authenticationMiddleware, BackupController.downloadImagesBackup);
backupRouter.post('/images/restore', authenticationMiddleware, backupUpload.single('backupZip'), BackupController.restoreImagesBackup);
backupRouter.delete('/images/delete/:fileName', 
  authenticationMiddleware, 
  invalidateCache(['api:*backup*']),
  BackupController.deleteImagesBackup
);

// Backup history (protected) - with caching
backupRouter.get('/history', authenticationMiddleware, quickCache.dynamic(), BackupController.getBackupHistory);

// Backup cleanup (protected) - with caching for stats
backupRouter.get('/cleanup/stats', authenticationMiddleware, quickCache.dynamic(), BackupController.getCleanupStats);
backupRouter.post('/cleanup/trigger', 
  authenticationMiddleware, 
  invalidateCache(['api:*backup*']),
  BackupController.triggerManualCleanup
);

// Auto-backup (protected) - with caching for stats
backupRouter.get('/auto/stats', authenticationMiddleware, quickCache.dynamic(), BackupController.getAutoBackupStats);
backupRouter.post('/auto/trigger', 
  authenticationMiddleware, 
  invalidateCache(['api:*backup*']),
  BackupController.triggerManualAutoBackup
);

export default backupRouter;
