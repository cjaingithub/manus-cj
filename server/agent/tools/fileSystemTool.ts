/**
 * File System Tool - Safe file operations
 */

import { Tool, ToolMetadata } from "../toolRegistry";
import * as fs from "fs/promises";
import * as path from "path";

export class FileSystemTool implements Tool {
  metadata: ToolMetadata = {
    name: "filesystem",
    description: "Read, write, and manage files safely",
    capabilities: ["file_read", "file_write", "file_delete", "directory_operations"],
    maxRetries: 1,
    defaultTimeout: 10000, // 10 seconds
  };

  private baseDir = "/tmp/agent-workspace";
  private maxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Initialize workspace directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error("Failed to initialize workspace:", error);
    }
  }

  /**
   * Validate file path is within allowed directory
   */
  private validatePath(filePath: string): string {
    const resolved = path.resolve(this.baseDir, filePath);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error("Path traversal not allowed");
    }
    return resolved;
  }

  /**
   * Execute file operations
   */
  async execute(params: Record<string, unknown>): Promise<unknown> {
    const operation = params.operation as string;

    switch (operation) {
      case "read":
        return this.readFile(params.path as string);

      case "write":
        return this.writeFile(params.path as string, params.content as string);

      case "append":
        return this.appendFile(params.path as string, params.content as string);

      case "delete":
        return this.deleteFile(params.path as string);

      case "list":
        return this.listDirectory(params.path as string);

      case "exists":
        return this.fileExists(params.path as string);

      case "stat":
        return this.getFileStats(params.path as string);

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Read file contents
   */
  private async readFile(filePath: string): Promise<unknown> {
    const fullPath = this.validatePath(filePath);

    try {
      const content = await fs.readFile(fullPath, "utf-8");
      return {
        success: true,
        path: filePath,
        content,
        size: content.length,
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  /**
   * Write file contents
   */
  private async writeFile(filePath: string, content: string): Promise<unknown> {
    const fullPath = this.validatePath(filePath);

    if (content.length > this.maxFileSize) {
      throw new Error(`File too large: ${content.length} > ${this.maxFileSize}`);
    }

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      return {
        success: true,
        path: filePath,
        size: content.length,
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  /**
   * Append to file
   */
  private async appendFile(filePath: string, content: string): Promise<unknown> {
    const fullPath = this.validatePath(filePath);

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.appendFile(fullPath, content, "utf-8");
      return {
        success: true,
        path: filePath,
        appended: content.length,
      };
    } catch (error) {
      throw new Error(`Failed to append to file: ${(error as Error).message}`);
    }
  }

  /**
   * Delete file
   */
  private async deleteFile(filePath: string): Promise<unknown> {
    const fullPath = this.validatePath(filePath);

    try {
      await fs.unlink(fullPath);
      return {
        success: true,
        path: filePath,
        deleted: true,
      };
    } catch (error) {
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * List directory contents
   */
  private async listDirectory(dirPath: string): Promise<unknown> {
    const fullPath = this.validatePath(dirPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files = entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? "directory" : "file",
      }));
      return {
        success: true,
        path: dirPath,
        files,
        count: files.length,
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${(error as Error).message}`);
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<unknown> {
    const fullPath = this.validatePath(filePath);

    try {
      await fs.access(fullPath);
      return {
        success: true,
        path: filePath,
        exists: true,
      };
    } catch {
      return {
        success: true,
        path: filePath,
        exists: false,
      };
    }
  }

  /**
   * Get file statistics
   */
  private async getFileStats(filePath: string): Promise<unknown> {
    const fullPath = this.validatePath(filePath);

    try {
      const stats = await fs.stat(fullPath);
      return {
        success: true,
        path: filePath,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${(error as Error).message}`);
    }
  }
}

export const fileSystemTool = new FileSystemTool();
