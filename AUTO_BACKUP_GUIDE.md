# 🤖 Auto Backup System Guide

## 🚀 Overview

The Auto Backup System automatically creates both MongoDB and Images backups every day at 11:00 PM UTC. This ensures your data is consistently backed up without manual intervention.

## ⏰ Automatic Backup Schedule

- **📅 Frequency**: Every day at 11:00 PM UTC
- **🗄️ MongoDB Backup**: Creates compressed .gz backup of your database
- **🖼️ Images Backup**: Creates .zip archive of all uploaded images
- **📝 Logging**: All backup actions logged to backup history
- **🔄 Status**: Automatically starts when server boots

## 🎯 Features

### **🤖 Automatic Features**
- ✅ **Daily scheduled backups** - Runs every day at 11:00 PM UTC
- ✅ **Dual backup creation** - Both MongoDB and Images in one job
- ✅ **Comprehensive logging** - Detailed logs of all backup operations
- ✅ **Error handling** - Continues even if one backup type fails
- ✅ **Duration tracking** - Reports how long backup process took
- ✅ **Size reporting** - Shows backup file sizes

### **🖥️ Manual Features**
- ✅ **Schedule information** - View next backup time and settings
- ✅ **Manual trigger** - Run full auto-backup process immediately
- ✅ **Status dashboard** - Visual overview of auto-backup configuration
- ✅ **Real-time feedback** - Progress updates during manual runs

## 📊 Web Interface

### **Accessing Auto Backup Management**
1. Navigate to `http://localhost:3000/logs-viewer`
2. Click **"💾 Backup Manager"** tab
3. Find **"🤖 Auto Backup"** section

### **Auto Backup Dashboard**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   ✅ ENABLED    │Daily at 11:00 PM│  Next: Tonight  │   myDataBase    │
│  Auto Backup    │  Backup Schedule │   Next Backup   │ Database Name   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘

📋 What happens at Daily at 11:00 PM UTC:
• Creates MongoDB backup (.gz file)
• Creates Images backup (.zip file)  
• Logs all actions to backup history
• Reports success/failure status
```

### **Available Actions**
- **📊 View Schedule** - Shows auto-backup configuration and next run time
- **🚀 Run Now** - Manually trigger the full auto-backup process

## 🔧 API Endpoints

### **Get Auto Backup Statistics**
```http
GET /api/backup/auto/stats
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto-backup statistics retrieved successfully",
  "data": {
    "enabled": true,
    "schedule": "Daily at 11:00 PM UTC",
    "nextBackup": "2024-01-07 23:00:00 UTC",
    "databaseName": "myDataBase"
  }
}
```

### **Trigger Manual Auto Backup**
```http
POST /api/backup/auto/trigger
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual auto-backup completed successfully"
}
```

## 📝 Backup Process Details

### **Daily Backup Sequence**
1. **🚀 Start Process** - Log start time and begin backup sequence
2. **🗄️ MongoDB Backup** - Create compressed database backup
3. **🖼️ Images Backup** - Create ZIP archive of all images
4. **📊 Generate Summary** - Calculate duration, sizes, success status
5. **📝 Log Results** - Write detailed log entries to backup history
6. **✅ Complete** - Report final status and cleanup

### **Backup Configuration**
- **Database Name**: Uses `DB_NAME` environment variable (default: `myDataBase`)
- **MongoDB Format**: Compressed .gz files with incremental numbering
- **Images Format**: ZIP archives with timestamp in filename
- **Storage Location**: `src/backups/` directory
- **Naming Convention**: 
  - MongoDB: `dbname-{number}-{timestamp}.gz`
  - Images: `images-backup-{timestamp}.zip`

### **Example Auto Backup Log**
```
[2024-01-07 23:00:00] 🤖 AUTO-BACKUP: Daily backup started
[2024-01-07 23:00:15] 🤖 AUTO-BACKUP: MongoDB backup SUCCESS | File: ./src/backups/myDataBase-5-2024-01-07-23-00-15.gz
[2024-01-07 23:00:45] 🤖 AUTO-BACKUP: Images backup SUCCESS | Size: 12.4 MB | Path: ./src/backups/images-backup-2024-01-07-23-00-45.zip
[2024-01-07 23:00:46] 🤖 AUTO-BACKUP: Daily backup SUCCESS | Duration: 46.2s
```

## 🛡️ Error Handling & Resilience

### **Partial Success Handling**
- **MongoDB fails, Images succeeds**: Continues and logs both results
- **Images fails, MongoDB succeeds**: Continues and logs both results
- **Both fail**: Logs errors and reports failure status
- **Individual errors don't stop the process**

### **Error Recovery**
- **Database connection issues**: Retries and logs specific errors
- **File system errors**: Handles permissions and space issues
- **Network timeouts**: Graceful handling of long-running operations
- **Detailed error logging**: Full stack traces in backup history

### **Backup Validation**
- **File creation verification**: Confirms backup files were created
- **Size validation**: Reports backup file sizes for verification
- **Timestamp accuracy**: Ensures proper file naming and dating
- **Log integrity**: Comprehensive audit trail of all operations

## 🔧 Configuration & Customization

### **Environment Variables**
```bash
# Database name for MongoDB backups
DB_NAME=myDataBase

# Optional: Custom backup directory
BACKUP_DIR=./custom/backup/path
```

### **Customizing Schedule**
To change the 11:00 PM daily schedule, modify:
```typescript
// In src/jobs/auto.backup.job.ts
cron.schedule('0 23 * * *', () => { // Current: 11:00 PM daily
```

**Common Cron Patterns:**
- `0 23 * * *` - Every day at 11:00 PM (current)
- `0 2 * * *` - Every day at 2:00 AM
- `0 23 * * 0` - Every Sunday at 11:00 PM
- `0 23 */2 * *` - Every 2 days at 11:00 PM
- `0 23 1 * *` - First day of every month at 11:00 PM

### **Customizing Database Name**
The system automatically uses your `DB_NAME` environment variable. To use a different database:
```typescript
// In src/jobs/auto.backup.job.ts
private static readonly DEFAULT_DB_NAME = 'your-custom-db-name';
```

## 📈 Monitoring & Maintenance

### **Daily Monitoring**
1. **Check backup history** for auto-backup entries
2. **Verify backup files** are being created in `src/backups/`
3. **Monitor disk space** usage trends
4. **Review auto-backup logs** for any errors

### **Weekly Review**
1. **Test manual auto-backup** via web interface
2. **Verify both backup types** are working
3. **Check backup file sizes** for consistency
4. **Review error logs** if any failures occurred

### **Troubleshooting**

**Issue: Auto-backup not running**
- Check server logs for cron job initialization
- Verify server timezone settings
- Ensure backup directory exists and is writable
- Check environment variables (DB_NAME)

**Issue: MongoDB backup fails**
- Verify database connection
- Check MongoDB tools installation (mongodump)
- Ensure sufficient disk space
- Review database permissions

**Issue: Images backup fails**
- Check uploads directory exists
- Verify file permissions
- Ensure sufficient disk space
- Review archiver package installation

**Issue: Partial backups**
- Check backup history logs for specific errors
- Verify individual backup components
- Test manual backup creation
- Review system resources during backup time

## 🚀 Benefits

### **🔧 Operational Benefits**
- **Consistent data protection** - Daily backups ensure minimal data loss
- **Automated reliability** - No manual intervention required
- **Comprehensive coverage** - Both database and files backed up
- **Detailed audit trail** - Complete logging of all backup operations

### **💰 Business Benefits**
- **Data security** - Regular backups protect against data loss
- **Compliance** - Automated backup schedules meet regulatory requirements
- **Peace of mind** - Know your data is consistently protected
- **Disaster recovery** - Quick restoration capabilities

## 📋 Best Practices

1. **Monitor regularly** - Check auto-backup logs weekly
2. **Test restores** - Periodically verify backup integrity
3. **Monitor disk space** - Ensure adequate storage for backups
4. **Review backup sizes** - Watch for unusual size changes
5. **Coordinate with cleanup** - Ensure cleanup job runs after backups
6. **Document recovery procedures** - Know how to restore from backups

## 🎯 Integration with Other Systems

### **Backup Ecosystem**
```
🤖 Auto Backup (Daily 11 PM)    →  Creates backups
     ↓
📁 Backup Storage               →  Stores backup files  
     ↓
🧹 Cleanup Job (Weekly Sun 2 AM) →  Removes old backups
     ↓
📊 Monitoring Dashboard         →  Tracks all operations
```

### **Coordinated Schedule**
- **Sunday 2:00 AM**: Cleanup old backups (3+ days)
- **Daily 11:00 PM**: Create new backups
- **Optimal timing**: Cleanup runs before new backups accumulate

## 🎉 Ready to Use!

Your auto-backup system is now fully operational:

- ✅ **Daily automatic backups** scheduled and running
- ✅ **Dual backup creation** (MongoDB + Images)
- ✅ **Web interface** for monitoring and manual control
- ✅ **API endpoints** for programmatic access
- ✅ **Comprehensive logging** for audit and troubleshooting
- ✅ **Error resilience** handles partial failures gracefully

The system will ensure your data is consistently backed up every day at 11:00 PM UTC! 🤖✨
