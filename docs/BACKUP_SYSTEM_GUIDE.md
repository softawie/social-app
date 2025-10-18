# 💾 Backup System Guide

## 🚀 Overview

The backup system provides comprehensive backup and restore functionality for both MongoDB databases and uploaded images, accessible through both API endpoints and a web interface.

## 📁 System Architecture

```
src/
├── modules/backup/
│   ├── backup.controller.ts    # API endpoints
│   ├── backup.service.ts       # Business logic
│   └── backup.validation.ts    # Input validation
├── utils/
│   ├── multer.config.ts       # File upload configuration
│   └── error-handler.utils.ts # Error handling
├── backups/                   # Backup storage directory
├── uploads/                   # Images directory
└── temp/                      # Temporary files
```

## 🔧 Features

### **MongoDB Backup**
- ✅ Create compressed database backups (.gz format)
- ✅ Incremental backup numbering
- ✅ Restore from backup files
- ✅ List all available backups with metadata
- ✅ Delete backup files
- ✅ Backup history logging

### **Images Backup**
- ✅ Create ZIP archives of all uploaded images
- ✅ Restore images from ZIP files
- ✅ Automatic cleanup of temporary files
- ✅ File size reporting

### **Web Interface**
- ✅ Tabbed interface (Logs Viewer + Backup Manager)
- ✅ Real-time status updates
- ✅ Interactive backup management
- ✅ History viewing

## 📡 API Endpoints

### **MongoDB Backup Endpoints**

#### Create MongoDB Backup
```http
POST /api/backup/mongo/create
Content-Type: application/json

{
  "dbName": "your-database-name",
  "backupFolder": "/optional/custom/path"
}
```

#### List MongoDB Backups
```http
GET /api/backup/mongo/list
```

#### Restore MongoDB Backup
```http
POST /api/backup/mongo/restore
Content-Type: application/json

{
  "archivePath": "./src/backups/dbname-1-2024-01-01.gz",
  "dbName": "your-database-name",
  "gzip": true
}
```

#### Delete MongoDB Backup
```http
DELETE /api/backup/mongo/delete
Content-Type: application/json

{
  "fileName": "dbname-1-2024-01-01.gz"
}
```

### **Images Backup Endpoints**

#### Create Images Backup
```http
POST /api/backup/images/create
```

#### Restore Images Backup
```http
POST /api/backup/images/restore
Content-Type: multipart/form-data

backupZip: [ZIP file]
```

#### Delete Images Backup
```http
DELETE /api/backup/images/delete/:fileName
```

### **Backup History**
```http
GET /api/backup/history
```

## 🖥️ Web Interface Usage

### **Accessing the Interface**
1. Start your server: `npm run dev`
2. Open browser: `http://localhost:3000/logs-viewer`
3. Click the **"💾 Backup Manager"** tab

### **MongoDB Backup Operations**
1. **Create Backup:**
   - Enter database name
   - Click "Create Backup"
   - Wait for success confirmation

2. **Restore Backup:**
   - Enter database name
   - Click "Restore" next to desired backup
   - Confirm the operation

3. **Delete Backup:**
   - Click "Delete" next to backup file
   - Confirm deletion

### **Images Backup Operations**
1. **Create Images Backup:**
   - Click "Create Images Backup"
   - Wait for completion

2. **Restore Images:**
   - Select ZIP file using file input
   - Click "Restore"
   - Confirm the operation

## 🔧 Configuration

### **Environment Setup**
Ensure you have MongoDB tools installed:
```bash
# macOS
brew install mongodb/brew/mongodb-database-tools

# Ubuntu/Debian
sudo apt-get install mongodb-database-tools

# Windows
# Download from MongoDB official website
```

### **Directory Structure**
The system automatically creates these directories:
- `src/backups/` - Backup storage
- `src/uploads/` - Images directory
- `temp/` - Temporary files

### **File Naming Convention**
MongoDB backups follow this pattern:
```
{dbName}-{number}-{timestamp}.gz
Example: myapp-1-2024-01-01-14-30-00.gz
```

## 📊 Response Formats

### **Success Response**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Error description"
}
```

### **MongoDB Backup List Response**
```json
{
  "success": true,
  "message": "MongoDB backups retrieved successfully",
  "data": [
    {
      "fileName": "myapp-1-2024-01-01-14-30-00.gz",
      "sizeMB": "15.42",
      "createdAt": "2024-01-01 14:30:00"
    }
  ]
}
```

## 🛡️ Security Features

- **File validation** - Only ZIP files accepted for image restore
- **Path validation** - Prevents directory traversal attacks
- **Size limits** - 100MB maximum file upload
- **Error handling** - Comprehensive error messages
- **Cleanup** - Automatic temporary file removal

## 🧪 Testing the System

### **1. Test MongoDB Backup**
```bash
curl -X POST http://localhost:3000/api/backup/mongo/create \
  -H "Content-Type: application/json" \
  -d '{"dbName": "test-db"}'
```

### **2. Test Images Backup**
```bash
curl -X POST http://localhost:3000/api/backup/images/create
```

### **3. Test Backup List**
```bash
curl -X GET http://localhost:3000/api/backup/mongo/list
```

### **4. Test Web Interface**
1. Navigate to `http://localhost:3000/logs-viewer`
2. Click "💾 Backup Manager" tab
3. Test all backup operations

## 📝 Backup History

The system maintains a detailed log file (`backup-history.log`) with:
- Timestamp of each operation
- Success/failure status
- Database name and backup number
- File paths and error messages

Example log entry:
```
[2024-01-01 14:30:00] ✅ Backup #1 for DB: myapp | File: ./src/backups/myapp-1-2024-01-01-14-30-00.gz
[2024-01-01 14:35:00] ❌ Backup #2 for DB: invalid | Error: Database not found
```

## 🚨 Troubleshooting

### **Common Issues**

1. **"mongodump command not found"**
   - Install MongoDB database tools
   - Ensure tools are in system PATH

2. **"Permission denied"**
   - Check directory permissions
   - Ensure backup directory is writable

3. **"File not found"**
   - Verify backup file exists
   - Check file path in request

4. **"Upload failed"**
   - Check file size (max 100MB)
   - Ensure file is valid ZIP format

### **Debug Mode**
Enable detailed logging by checking server console output during backup operations.

## 🎯 Best Practices

1. **Regular Backups**: Schedule automated backups using cron jobs
2. **Storage Management**: Regularly clean old backup files
3. **Testing**: Periodically test restore procedures
4. **Monitoring**: Check backup history for failed operations
5. **Security**: Restrict backup endpoints to admin users only

## 🔄 Integration with Existing System

The backup system integrates seamlessly with your existing:
- **Authentication system** (can be protected with middleware)
- **Logging system** (uses same error handling patterns)
- **File upload system** (uses multer configuration)
- **Database connections** (uses existing MongoDB setup)

## 🚀 Ready to Use!

Your backup system is now fully operational and ready for production use. Access it through:
- **API**: `http://localhost:3000/api/backup/*`
- **Web Interface**: `http://localhost:3000/logs-viewer` → Backup Manager tab

Happy backing up! 💾✨
