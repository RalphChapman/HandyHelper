import fs from 'fs';
import path from 'path';

export class FileManager {
  private uploadDir: string;

  constructor(uploadDir: string) {
    this.uploadDir = uploadDir;
  }

  async initialize(): Promise<void> {
    try {
      // Ensure upload directory exists
      if (!fs.existsSync(this.uploadDir)) {
        console.log('[FileManager] Creating upload directory:', this.uploadDir);
        await fs.promises.mkdir(this.uploadDir, { recursive: true });
      }

      // Verify write permissions
      await fs.promises.access(this.uploadDir, fs.constants.W_OK);
      console.log('[FileManager] Verified write permissions for:', this.uploadDir);

      // List current files
      const files = await fs.promises.readdir(this.uploadDir);
      console.log('[FileManager] Current files in directory:', files);
    } catch (error) {
      console.error('[FileManager] Initialization error:', error);
      throw new Error(`Failed to initialize upload directory: ${error.message}`);
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    try {
      // Verify file was saved
      await fs.promises.access(file.path, fs.constants.F_OK);
      
      // Get file stats
      const stats = await fs.promises.stat(file.path);
      console.log('[FileManager] File saved successfully:', {
        path: file.path,
        size: stats.size,
        permissions: stats.mode,
        created: stats.birthtime
      });

      // Return relative URL
      return `/uploads/${path.basename(file.path)}`;
    } catch (error) {
      console.error('[FileManager] File save error:', error);
      throw new Error(`Failed to save file ${file.originalname}: ${error.message}`);
    }
  }

  async verifyUpload(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
      const stats = await fs.promises.stat(filePath);
      return stats.size > 0;
    } catch {
      return false;
    }
  }
}

export const fileManager = new FileManager('/home/runner/workspace/uploads');
