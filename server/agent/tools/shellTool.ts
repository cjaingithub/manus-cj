/**
 * Shell Tool - Executes shell commands safely
 */

import { Tool, ToolMetadata } from "../toolRegistry";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ShellTool implements Tool {
  metadata: ToolMetadata = {
    name: "shell",
    description: "Execute shell commands and scripts",
    capabilities: ["command_execution", "file_operations", "system_info"],
    maxRetries: 2,
    defaultTimeout: 30000, // 30 seconds
  };

  private allowedCommands = [
    "ls",
    "pwd",
    "cat",
    "grep",
    "find",
    "echo",
    "mkdir",
    "rm",
    "cp",
    "mv",
    "chmod",
    "curl",
    "wget",
    "git",
    "npm",
    "pnpm",
    "node",
    "python",
    "python3",
  ];

  /**
   * Execute a shell command with safety checks
   */
  async execute(params: Record<string, unknown>): Promise<unknown> {
    const command = params.command as string;
    const cwd = (params.cwd as string) || "/tmp";
    const timeout = (params.timeout as number) || this.metadata.defaultTimeout;

    if (!command || typeof command !== "string") {
      throw new Error("Invalid command: must be a non-empty string");
    }

    // Security: Check if command starts with allowed commands
    const isAllowed = this.allowedCommands.some((cmd) =>
      command.trim().startsWith(cmd)
    );

    if (!isAllowed) {
      throw new Error(
        `Command not allowed: ${command.split(" ")[0]}. Allowed commands: ${this.allowedCommands.join(", ")}`
      );
    }

    // Additional security: Block dangerous patterns
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // rm -rf /
      /dd\s+if=\/dev\/zero/, // dd disk wipe
      /mkfs/, // filesystem format
      /:\(\)\s*{/, // fork bomb
    ];

    if (dangerousPatterns.some((pattern) => pattern.test(command))) {
      throw new Error("Command contains dangerous pattern and is blocked");
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command,
      };
    } catch (error) {
      const err = error as any;
      if (err.killed) {
        throw new Error(`Command timeout after ${timeout}ms`);
      }
      throw new Error(`Command failed: ${err.message}`);
    }
  }
}

export const shellTool = new ShellTool();
