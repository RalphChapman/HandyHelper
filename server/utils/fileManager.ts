import fs from 'fs';
import path from 'path';

export class FileManager {
  private uploadDir: string;
  private initialized: boolean = false;

  constructor(uploadDir: string) {
    this.uploadDir = uploadDir;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[FileManager] Already initialized');
      return;
    }
    
    try {
      // Ensure upload directory exists with proper permissions
      if (!fs.existsSync(this.uploadDir)) {
        console.log('[FileManager] Creating upload directory:', this.uploadDir);
        await fs.promises.mkdir(this.uploadDir, { recursive: true });
        
        // Set permissions explicitly (755 = rwxr-xr-x)
        try {
          await fs.promises.chmod(this.uploadDir, 0o755);
          console.log('[FileManager] Set directory permissions to 755');
        } catch (permError) {
          console.warn('[FileManager] Unable to set directory permissions:', permError);
        }
      }

      // Verify write permissions
      await fs.promises.access(this.uploadDir, fs.constants.W_OK);
      console.log('[FileManager] Verified write permissions for:', this.uploadDir);

      // Write a test file to verify fully operational
      const testFile = path.join(this.uploadDir, `filemanager-test-${Date.now()}.txt`);
      try {
        await fs.promises.writeFile(testFile, 'FileManager initialization test');
        console.log('[FileManager] Successfully wrote test file:', testFile);
        
        // Verify the test file exists
        await fs.promises.access(testFile, fs.constants.F_OK | fs.constants.R_OK);
        
        // Clean up test file
        await fs.promises.unlink(testFile);
      } catch (writeError) {
        console.error('[FileManager] Failed to write test file:', writeError);
        throw new Error(`Directory exists but is not fully operational: ${writeError.message}`);
      }

      // List current files
      const files = await fs.promises.readdir(this.uploadDir);
      console.log('[FileManager] Current files in directory:', files);
      
      this.initialized = true;
    } catch (error) {
      console.error('[FileManager] Initialization error:', error);
      throw new Error(`Failed to initialize upload directory: ${error.message || String(error)}`);
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      if (!file) {
        throw new Error('No file provided to saveFile method');
      }
      
      if (!file.path) {
        throw new Error('File has no path property');
      }
      
      // Validate file exists
      await fs.promises.access(file.path, fs.constants.F_OK);
      
      // Get file stats to validate size
      const stats = await fs.promises.stat(file.path);
      
      if (stats.size === 0) {
        throw new Error(`File ${file.originalname} has zero bytes`);
      }
      
      // Validate file type
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validMimeTypes.includes(file.mimetype)) {
        throw new Error(`Invalid file type: ${file.mimetype}. Only ${validMimeTypes.join(', ')} are allowed.`);
      }
      
      // Log detailed file information
      console.log('[FileManager] File validated successfully:', {
        originalName: file.originalname,
        path: file.path,
        size: stats.size,
        mimetype: file.mimetype,
        permissions: stats.mode.toString(8),
        created: stats.birthtime.toISOString()
      });

      // Return relative URL path (consistent format for client)
      return `/uploads/${path.basename(file.path)}`;
    } catch (error) {
      console.error('[FileManager] File save error:', error);
      throw new Error(`Failed to save file ${file?.originalname || 'unknown'}: ${error.message || String(error)}`);
    }
  }

  async verifyUpload(filePath: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      if (!filePath) {
        console.error('[FileManager] verifyUpload: No file path provided');
        return false;
      }
      
      // Normalize the file path - handle both relative and absolute paths
      let normalizedPath = filePath;
      
      // If it's a relative URL path like "/uploads/filename.jpg"
      if (filePath.startsWith('/uploads/')) {
        normalizedPath = path.join(this.uploadDir, path.basename(filePath));
      } 
      // If it doesn't include the uploads directory
      else if (!filePath.includes(this.uploadDir)) {
        normalizedPath = path.join(this.uploadDir, path.basename(filePath));
      }
      
      console.log('[FileManager] Verifying file:', { 
        requested: filePath, 
        normalized: normalizedPath 
      });
      
      // Check if file exists and is readable
      await fs.promises.access(normalizedPath, fs.constants.F_OK | fs.constants.R_OK);
      
      // Check if file has content
      const stats = await fs.promises.stat(normalizedPath);
      
      if (stats.size === 0) {
        console.error('[FileManager] File exists but is empty (zero bytes):', normalizedPath);
        return false;
      }
      
      if (!stats.isFile()) {
        console.error('[FileManager] Path exists but is not a file:', normalizedPath);
        return false;
      }
      
      console.log('[FileManager] File verified successfully:', {
        path: normalizedPath,
        size: stats.size,
        created: stats.birthtime.toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('[FileManager] File verification error:', { path: filePath, error: error.message || String(error) });
      return false;
    }
  }
  
  // Helper method to get public URL for a file
  getPublicUrl(filename: string): string {
    // Ensure we're just using the filename, not full path
    const sanitizedName = path.basename(filename);
    return `/uploads/${sanitizedName}`;
  }
}

export const fileManager = new FileManager(path.resolve(process.cwd(), 'uploads'));
