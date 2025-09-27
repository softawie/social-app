import multer, {  memoryStorage } from "multer";
import path from "node:path";
import fs from "node:fs";
import { Request, Response, NextFunction } from "express";
import { BadReqException } from "@utils/globalError.handler";

export interface FileValidationOptions {
    allowedMimeTypes: string[];
    maxSize: number;
}

export interface ValidationOptions extends FileValidationOptions {
    enableMagicNumberCheck?: boolean;
}

interface MulterFile extends Express.Multer.File {}

export class FileValidationError extends Error {
    constructor(message: string, public statusCode: number = 400) {
        super(message);
        this.name = 'FileValidationError';
    }
}

// Magic number signatures for file validation
// Extended list of magic numbers for various file types
export const MAGIC_NUMBERS: Record<string, { signature: number[]; offset?: number }> = {
    // Images
    'image/jpeg': { signature: [0xFF, 0xD8, 0xFF] },
    'image/png': { signature: [0x89, 0x50, 0x4E, 0x47] },
    'image/gif': { signature: [0x47, 0x49, 0x46, 0x38] },
    'image/webp': { signature: [0x52, 0x49, 0x46, 0x46], offset: 4 }, // RIFF header
    'image/bmp': { signature: [0x42, 0x4D] },
    'image/tiff': { signature: [0x49, 0x49, 0x2A, 0x00] }, // Little-endian
    'image/tiff-big': { signature: [0x4D, 0x4D, 0x00, 0x2A] }, // Big-endian
    'image/svg+xml': { signature: [0x3C, 0x3F, 0x78, 0x6D, 0x6C] }, // <?xml
    
    // Videos
    'video/mp4': { signature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70] }, // ftyp box
    'video/webm': { signature: [0x1A, 0x45, 0xDF, 0xA3] },
    'video/avi': { signature: [0x52, 0x49, 0x46, 0x46], offset: 8 }, // RIFF header
    'video/quicktime': { signature: [0x6D, 0x6F, 0x6F, 0x76] }, // moov atom
    'video/x-msvideo': { signature: [0x52, 0x49, 0x46, 0x46], offset: 8 }, // AVI
    
    // Audio
    'audio/mpeg': { signature: [0xFF, 0xFB] }, // MP3 with ID3
    'audio/mp3': { signature: [0xFF, 0xFB] }, // MP3 without ID3
    'audio/wav': { signature: [0x52, 0x49, 0x46, 0x46], offset: 8 }, // WAV
    'audio/ogg': { signature: [0x4F, 0x67, 0x67, 0x53] }, // Ogg
    'audio/x-flac': { signature: [0x66, 0x4C, 0x61, 0x43] }, // fLaC
    'audio/aac': { signature: [0xFF, 0xF1] }, // ADTS AAC
    
    // Documents
    'application/pdf': { signature: [0x25, 0x50, 0x44, 0x46] },
    'application/zip': { signature: [0x50, 0x4B, 0x03, 0x04] },
    'application/x-rar-compressed': { signature: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00] },
    'application/x-7z-compressed': { signature: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C] },
    'application/gzip': { signature: [0x1F, 0x8B] },
    'application/x-tar': { signature: [0x75, 0x73, 0x74, 0x61, 0x72] },
    'application/msword': { signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }, // .doc, .xls, .ppt
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { signature: [0x50, 0x4B, 0x03, 0x04] },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { signature: [0x50, 0x4B, 0x03, 0x04] },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { signature: [0x50, 0x4B, 0x03, 0x04] },
    'text/plain': { signature: [0xEF, 0xBB, 0xBF] }, // UTF-8 BOM
    'text/plain-utf16le': { signature: [0xFF, 0xFE] }, // UTF-16 LE BOM
    'text/plain-utf16be': { signature: [0xFE, 0xFF] }, // UTF-16 BE BOM
    'text/plain-utf32le': { signature: [0xFF, 0xFE, 0x00, 0x00] }, // UTF-32 LE BOM
    'text/plain-utf32be': { signature: [0x00, 0x00, 0xFE, 0xFF] }, // UTF-32 BE BOM
    'text/csv': { signature: [0xEF, 0xBB, 0xBF] }, // UTF-8 BOM (CSV can have BOM)
    'text/html': { signature: [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74, 0x6D, 0x6C] }, // <!DOCTYPE html
    'application/json': { signature: [0x7B] }, // {
};

export const checkMagicNumber = (buffer: Buffer, mimeType: string): boolean => {
    if (!buffer || !buffer.length) {
        throw new FileValidationError('Empty file buffer provided');
    }

    const magicNumber = MAGIC_NUMBERS[mimeType];
    if (!magicNumber) {
        // If we don't have a magic number for this MIME type, we can't validate it
        console.warn(`No magic number validator for MIME type: ${mimeType}. Skipping validation.`);
        return true;
    }

    const { signature, offset = 0 } = magicNumber;
    
    // Check if buffer is large enough to contain the signature
    if (buffer.length < offset + signature.length) {
        console.warn(`File too small (${buffer.length} bytes) for MIME type ${mimeType} validation`);
        return false;
    }

    // Special handling for certain file types
    switch (mimeType) {
        case 'image/webp':
            // Check for 'WEBP' at position 8-11 after the RIFF header
            return signature.every((byte, i) => buffer[i] === byte) &&
                   [0x57, 0x45, 0x42, 0x50].every((byte, i) => buffer[i + 8] === byte);

        case 'audio/wav':
            // Check for 'WAVE' at position 8-11 after the RIFF header
            return signature.every((byte, i) => buffer[i] === byte) &&
                   [0x57, 0x41, 0x56, 0x45].every((byte, i) => buffer[i + 8] === byte);

        case 'video/avi':
            // Check for 'AVI ' at position 8-11 after the RIFF header
            return signature.every((byte, i) => buffer[i] === byte) &&
                   [0x41, 0x56, 0x49, 0x20].every((byte, i) => buffer[i + 8] === byte);

        case 'application/zip':
            // Check for ZIP file signature (PK..) or self-extracting archive (PK..)
            return signature.every((byte, i) => buffer[i] === byte) ||
                   (buffer[0] === 0x50 && buffer[1] === 0x4B && 
                    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) && 
                    (buffer[3] === 0x04 || buffer[3] === 0x05 || buffer[3] === 0x07 || buffer[3] === 0x08));

        case 'application/x-7z-compressed':
            // 7z files have a signature at the start of the file
            return signature.every((byte, i) => buffer[i] === byte);

        case 'application/x-rar-compressed':
            // RAR files can have different signatures for different versions
            return signature.every((byte, i) => buffer[i] === byte) ||
                   (buffer[0] === 0x52 && buffer[1] === 0x61 && buffer[2] === 0x72 && 
                    buffer[3] === 0x21 && buffer[4] === 0x1A && buffer[5] === 0x07 && 
                    (buffer[6] === 0x00 || buffer[6] === 0x01));

        default:
            // Standard check for most file types
            const isValid = signature.every((byte, i) => buffer[i + offset] === byte);
            
            if (!isValid) {
                // Log the actual file header for debugging
                const actualHeader = Array.from(buffer.slice(offset, offset + Math.min(16, buffer.length - offset)))
                    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                    .join(' ');
                    
                const expectedHeader = signature
                    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                    .join(' ');
                    
                console.warn(`MIME type validation failed for ${mimeType}\n` +
                           `Expected header (offset ${offset}): ${expectedHeader}\n` +
                           `Actual header (first ${Math.min(16, buffer.length - offset)} bytes): ${actualHeader}`);
            }
            
            return isValid;
    }
};

/**
 * Default file validation options
 */
export const fileValidation: FileValidationOptions = {
    allowedMimeTypes: [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
        
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/json',
        
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/gzip',
        'application/x-tar',
        
        // Media
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/x-flac',
        'audio/aac'
    ],
    // 20MB default max size
    maxSize: 20 * 1024 * 1024,
};

export const validateMagicNumber = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.file && !req.files) {
        return next();
    }
    
    const files = Array.isArray(req.files) 
        ? req.files 
        : req.files 
            ? Object.values(req.files).flat() 
            : [req.file].filter(Boolean);
    
    for (const file of files) {
        if (!file) continue;
        
        let buffer: Buffer;
        
        // Handle both disk storage and memory storage
        if (file.buffer) {
            buffer = file.buffer;
        } else if (file.path) {
            // Read first 64 bytes from disk for magic number check (some signatures are longer)
            try {
                const fd = fs.openSync(file.path, 'r');
                const headerBuffer = Buffer.alloc(64);
                fs.readSync(fd, headerBuffer, 0, 64, 0);
                fs.closeSync(fd);
                buffer = headerBuffer;
            } catch (error) {
                const errorMsg = `Failed to read file for validation: ${error instanceof Error ? error.message : String(error)}`;
                console.error(errorMsg);
                throw new FileValidationError(errorMsg, 500);
            }
        } else {
            throw new FileValidationError('File has no buffer or path for validation', 400);
        }
        
        // Skip if we can't determine the MIME type
        if (!file.mimetype) {
            console.warn('No MIME type provided for file, skipping magic number check');
            continue;
        }
        
        try {
            // Check magic number if we have a validator for this MIME type
            if (MAGIC_NUMBERS[file.mimetype]) {
                try {
                    if (!checkMagicNumber(buffer, file.mimetype)) {
                        throw new FileValidationError(
                            `File content does not match its declared MIME type (${file.mimetype}). ` +
                            'The file may be corrupted or the wrong file type was uploaded.',
                            400
                        );
                    }
                } catch (error) {
                    console.error('Error during magic number validation:', error);
                    throw new FileValidationError(
                        'Failed to validate file content. Please check the file and try again.',
                        400
                    );
                }
            }
        } catch (error) {
            if (error instanceof FileValidationError) {
                throw error;
            }
            throw new FileValidationError(
                `Error validating file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }
    
    next();
};

export const localFileUpload = ({
    customPath = 'general',
    validation = { allowedMimeTypes: [], maxSize: 5 * 1024 * 1024, enableMagicNumberCheck: true }
}: {
    customPath?: string;
    validation?: Partial<ValidationOptions>;
}) => {
    let basePath = `uploads/${customPath}`;
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            if ((req as any).user?._id) {
                basePath += `/${(req as any).user._id}`;
            }
            const fullPath = path.resolve(`./src/${basePath}`);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
            cb(null, fullPath);
        },
        filename: (req, file: Express.Multer.File, cb) => {
            const uniqueFileName = `${Date.now()}-${Math.random()}-${file.originalname}`;
             file.finalPath = `${basePath}/${uniqueFileName}`;
            cb(null, uniqueFileName);
        }
    });

    const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
        try {
            // Set default values if not provided
            const allowedMimeTypes = validation?.allowedMimeTypes || [];
            const maxSize = validation?.maxSize || 5 * 1024 * 1024;
            
            if (!file) {
                return cb(new BadReqException('No file provided'));
            }
            
            // Check MIME type if allowedMimeTypes is specified
            if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
                return cb(new BadReqException(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
            }
            
            // Check file size from content-length header
            if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
                return cb(new BadReqException(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`));
            }
            
            // File passes initial validation
            cb(null, true);
            
        } catch (error) {
            cb(error as Error);
        }
    };

    const upload = multer({
        fileFilter,
        limits: {
            fileSize: validation.maxSize,
            files: 1 // Allow only single file upload
        },
        storage,
    });

    return upload;
};

// Enhanced version with automatic magic number validation
const validateFile = (file: Express.Multer.File): void => {
    if (!file) return;
    
    // Skip if we can't determine the MIME type
    if (!file.mimetype) {
        console.warn('No MIME type provided for file, skipping validation');
        return;
    }

    // If we have a buffer (in-memory storage), validate it directly
    if (file.buffer) {
        if (!checkMagicNumber(file.buffer, file.mimetype)) {
            throw new FileValidationError(
                `File content does not match its declared MIME type: ${file.mimetype}`,
                400
            );
        }
    } 
    // If file is on disk, read and validate it
    else if (file.path) {
        const buffer = Buffer.alloc(64);
        const fd = fs.openSync(file.path, 'r');
        try {
            fs.readSync(fd, buffer, 0, 64, 0);
            if (!checkMagicNumber(buffer, file.mimetype)) {
                // Clean up the file if validation fails
                fs.unlinkSync(file.path);
                throw new FileValidationError(
                    `File content does not match its declared MIME type: ${file.mimetype}`,
                    400
                );
            }
        } finally {
            fs.closeSync(fd);
        }
    }
};

export const secureFileUpload = ({
    customPath = 'general',
    validation = { allowedMimeTypes: [], maxSize: 5 * 1024 * 1024, enableMagicNumberCheck: true }
}: {
    customPath?: string;
    validation?: Partial<ValidationOptions>;
}) => {
    // 1) Upload to memory first (no folders/files created yet)
    const memoryUpload = multer({
        storage: memoryStorage(),
        limits: {
            fileSize: validation.maxSize,
        },
        fileFilter: (req, file, cb) => {
            try {
                const allowed = validation?.allowedMimeTypes || [];
                if (allowed.length && !allowed.includes(file.mimetype)) {
                    return cb(new FileValidationError(`Invalid file type. Allowed: ${allowed.join(', ')}`, 400));
                }
                cb(null, true);
            } catch (e) {
                cb(e as Error);
            }
        }
    });

    // 2) Validate magic number (still in memory)
    const validateFiles = (req: Request, res: Response) => {
        try {
            if (validation.enableMagicNumberCheck !== false) {
                if (req.file) validateFile(req.file);
                if (req.files) {
                    const files = Array.isArray(req.files)
                        ? req.files
                        : Object.values(req.files).flat();
                    files.forEach(validateFile);
                }
            }
            next();
        } catch (error) {
            throw error as Error;
        }
    };

    // 3) Persist to disk only if validation passed
    const persistToDisk = (req: Request, _res: Response, next: NextFunction) => {
        try {
            const saveOne = (file: Express.Multer.File) => {
                if (!file || !file.buffer) return;
                let basePath = `uploads/${customPath}`;
                if ((req as any).user?._id) basePath += `/${(req as any).user._id}`;
                const fullDir = path.resolve(`./src/${basePath}`);
                if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
                const ext = path.extname(file.originalname) || '';
                const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
             
                const filename = `${file.fieldname}-${unique}${ext}`;
                const fullPath = path.join(fullDir, filename);
                console.log("fullPath",fullPath );
                (file as any).finalPath = `${basePath}/${filename}`;
                fs.writeFileSync(fullPath, file.buffer);

                // reflect disk fields like multer diskStorage
                (file as any).destination = fullDir;
                (file as any).filename = filename;
                (file as any).path = fullPath;
                (file as any).size = file.buffer.length;
                // prevent returning a large Buffer in responses/logs
                delete (file as any).buffer;
            };

            if (req.file) saveOne(req.file);
            if (req.files) {
                const files = Array.isArray(req.files)
                    ? req.files
                    : Object.values(req.files).flat();
                files.forEach(saveOne);
            }
            next();
        } catch (e) {
            throw e as Error;
        }
    };

    return {
        single: (fieldName: string) => [
            memoryUpload.single(fieldName),
            validateFiles,
            persistToDisk,
        ],
        array: (fieldName: string, maxCount?: number) => [
            memoryUpload.array(fieldName, maxCount),
            validateFiles,
            persistToDisk,
        ],
        fields: (fields: multer.Field[]) => [
            memoryUpload.fields(fields),
            validateFiles,
            persistToDisk,
        ],
        any: () => [
            memoryUpload.any(),
            validateFiles,
            persistToDisk,
        ]
    };
};

export default {
    localFileUpload,
    secureFileUpload,
    fileValidation,
};