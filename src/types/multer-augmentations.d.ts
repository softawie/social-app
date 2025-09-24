// Global type augmentation for Express and Multer file uploads
// Ensures custom fields like `finalPath` added during upload are recognized by TypeScript

// Do not convert this file to a module; keep it as a global augmentation file

declare namespace Express {
  namespace Multer {
    interface File {
      // Custom property we attach after persisting to disk
      finalPath?: string;

      // Reflect disk storage properties we set manually in persistToDisk
      destination?: string;
      filename?: string;
      path?: string;
      size?: number;
    }
  }

  interface Request {
    // Common patterns for multer typings
    // single(field): file is present
    file?: Express.Multer.File;
    // array/fields: files can be an array or a field map
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    // your auth middleware augments user at runtime
    user?: any;
  }
}
