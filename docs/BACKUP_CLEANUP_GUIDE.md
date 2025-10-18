# 🧹 Backup Cleanup System Guide

## 🚀 Overview

The Backup Cleanup System automatically manages your backup storage by deleting old backup files to prevent disk space issues. It runs weekly and provides both automatic and manual cleanup options.

## ⏰ Automatic Cleanup Schedule

- **📅 Frequency**: Every Sunday at 2:00 AM UTC
- **🗂️ Retention Policy**: Deletes backups older than 3 days
- **📁 File Types**: MongoDB backups (.gz) and Images backups (.zip)
- **🔄 Status**: Automatically starts when server boots

## 🎯 Features

### **🤖 Automatic Features**
- ✅ **Weekly scheduled cleanup** - Runs every Sunday at 2:00 AM UTC
- ✅ **Smart file detection** - Only processes .gz and .zip backup files
- ✅ **Detailed logging** - All cleanup actions logged to backup history
- ✅ **Size reporting** - Shows how much disk space was freed
- ✅ **Error handling** - Graceful handling of file access issues

### **🖥️ Manual Features**
- ✅ **Real-time statistics** - View current backup storage status
- ✅ **Manual cleanup trigger** - Force cleanup outside scheduled time
- ✅ **Visual dashboard** - Easy-to-read stats with color coding
- ✅ **Confirmation dialogs** - Prevents accidental deletions

## 📊 Web Interface

### **Accessing Cleanup Management**
1. Navigate to `http://localhost:3000/logs-viewer`
2. Click **"💾 Backup Manager"** tab
3. Scroll down to **"🧹 Backup Cleanup"** section

### **Cleanup Statistics Dashboard**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Total Files   │  Files > 3 Days │   Total Size    │  Old Files Size │
│       12        │        3        │    45.2 MB      │     8.7 MB      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### **Available Actions**
- **📊 View Stats** - Shows current backup storage statistics
- **🗑️ Clean Old Backups** - Manually trigger cleanup process

## 🔧 API Endpoints

### **Get Cleanup Statistics**
```http
GET /api/backup/cleanup/stats
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup statistics retrieved successfully",
  "data": {
    "totalFiles": 12,
    "oldFiles": 3,
    "totalSize": "45.2 MB",
    "oldFilesSize": "8.7 MB",
    "nextCleanup": "Next Sunday at 2:00 AM UTC"
  }
}
```

### **Trigger Manual Cleanup**
```http
POST /api/backup/cleanup/trigger
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual backup cleanup triggered successfully"
}
```

## 📝 Cleanup Process Details

### **File Selection Criteria**
1. **Location**: Only files in `src/backups/` directory
2. **File Types**: 
   - MongoDB backups: `*.gz` files
   - Images backups: `*.zip` files
3. **Age**: Files older than 3 days (based on creation time)
4. **Exclusions**: Directories and non-backup files are ignored

### **Cleanup Actions**
1. **Scan** backup directory for eligible files
2. **Check** creation date against retention policy
3. **Delete** files older than 3 days
4. **Log** all actions to backup history
5. **Report** summary of deleted files and space freed

### **Example Cleanup Log**
```
[2024-01-07 02:00:15] 🧹 CLEANUP: DELETED - myapp-1-2024-01-01-14-30-00.gz | File older than 3 days
[2024-01-07 02:00:15] 🧹 CLEANUP: DELETED - images-backup-2024-01-02-10-15-30.zip | File older than 3 days
[2024-01-07 02:00:16] 🧹 CLEANUP: CLEANUP_COMPLETED - SUMMARY | 2 files deleted, 15.4 MB freed
```

## 🛡️ Safety Features

### **Confirmation Requirements**
- **Manual cleanup** requires user confirmation
- **Clear warning** about irreversible action
- **No accidental deletions** from automatic process

### **Error Handling**
- **File access errors** logged but don't stop cleanup
- **Permission issues** handled gracefully
- **Directory creation** if backup folder missing
- **Detailed error logging** for troubleshooting

### **Backup Protection**
- **Only targets old files** (>3 days)
- **Preserves recent backups** automatically
- **File type validation** prevents accidental deletion
- **Comprehensive logging** for audit trail

## 🔧 Configuration

### **Customizing Retention Period**
To change the 3-day retention policy, modify:
```typescript
// In src/jobs/backup.cleanup.job.ts
private static readonly RETENTION_DAYS = 3; // Change this value
```

### **Customizing Schedule**
To change the weekly Sunday 2:00 AM schedule, modify:
```typescript
// In src/jobs/backup.cleanup.job.ts
cron.schedule('0 2 * * 0', () => { // Cron format: minute hour day month weekday
```

**Common Cron Patterns:**
- `0 2 * * 0` - Every Sunday at 2:00 AM
- `0 2 * * 1` - Every Monday at 2:00 AM  
- `0 2 */3 * *` - Every 3 days at 2:00 AM
- `0 2 1 * *` - First day of every month at 2:00 AM

## 📈 Monitoring & Maintenance

### **Regular Monitoring**
1. **Check cleanup stats** weekly via web interface
2. **Review backup history** for cleanup entries
3. **Monitor disk space** usage trends
4. **Verify automatic cleanup** is running

### **Troubleshooting**

**Issue: Cleanup not running automatically**
- Check server logs for cron job initialization
- Verify server timezone settings
- Ensure backup directory exists and is writable

**Issue: Manual cleanup fails**
- Verify admin token is valid
- Check file permissions on backup directory
- Review error messages in backup history

**Issue: Files not being deleted**
- Confirm files are older than 3 days
- Check file extensions (.gz, .zip)
- Verify files are in correct directory

## 🚀 Benefits

### **🔧 Operational Benefits**
- **Prevents disk space issues** - Automatic cleanup prevents storage overflow
- **Reduces maintenance** - No manual intervention required
- **Audit compliance** - Detailed logging of all cleanup actions
- **Flexible control** - Both automatic and manual cleanup options

### **💰 Cost Benefits**
- **Storage optimization** - Reduces storage costs over time
- **Automated management** - Saves administrator time
- **Predictable cleanup** - Regular schedule prevents surprise space issues

## 📋 Best Practices

1. **Monitor regularly** - Check cleanup stats monthly
2. **Test manual cleanup** - Verify functionality periodically
3. **Review logs** - Check backup history for cleanup entries
4. **Adjust retention** - Modify retention period based on needs
5. **Backup critical data** - Ensure important backups are preserved elsewhere

## 🎯 Ready to Use!

Your backup cleanup system is now fully operational:

- ✅ **Automatic weekly cleanup** scheduled and running
- ✅ **Web interface** available for monitoring and manual control
- ✅ **API endpoints** ready for programmatic access
- ✅ **Comprehensive logging** for audit and troubleshooting
- ✅ **Safety features** prevent accidental data loss

The system will help maintain optimal storage usage while preserving recent backups automatically! 🧹✨
