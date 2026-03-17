/**
 * Tool Registry Initialization
 * Exports all available tools for the agent
 */

export { ShellTool, shellTool } from "./shellTool";
export { FileSystemTool, fileSystemTool } from "./fileSystemTool";
export { BrowserTool, browserTool } from "./browserTool";

import { ToolRegistry } from "../toolRegistry";
import { shellTool } from "./shellTool";
import { fileSystemTool } from "./fileSystemTool";
import { browserTool } from "./browserTool";

/**
 * Initialize the default tool registry with all available tools
 */
export function initializeToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Register all tools
  registry.registerTool(shellTool);
  registry.registerTool(fileSystemTool);
  registry.registerTool(browserTool);

  return registry;
}
