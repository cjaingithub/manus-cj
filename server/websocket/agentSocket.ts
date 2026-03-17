/**
 * WebSocket Server for Real-Time Agent Communication
 * Handles streaming agent thoughts, tool execution, and task progress
 */

import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Server as HTTPServer } from "http";

export interface WebSocketMessage {
  type:
    | "agent_thought"
    | "tool_execution"
    | "phase_update"
    | "error"
    | "completion"
    | "heartbeat"
    | "subscribe"
    | "unsubscribe";
  taskId: number;
  data: unknown;
  timestamp: Date;
}

export interface AgentThought {
  phase: string;
  content: string;
  reasoning: string;
  confidence: number;
}

export interface ToolExecutionMessage {
  toolName: string;
  status: "starting" | "executing" | "completed" | "failed";
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface PhaseUpdateMessage {
  phase: string;
  status: "planning" | "executing" | "completed";
  progress: number; // 0-100
  message: string;
}

export class AgentWebSocketServer {
  private wss: WebSocketServer;
  private taskSubscriptions: Map<number, Set<WebSocket>> = new Map();
  private clientMetadata: Map<WebSocket, { taskId: number; userId: number }> = new Map();
  private messageQueue: Map<number, WebSocketMessage[]> = new Map();
  private maxQueueSize = 100;

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: "/api/ws/agent" });

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      console.log("[WebSocket] New connection from", req.socket.remoteAddress);

      ws.on("message", (data: string) => {
        this.handleMessage(ws, data);
      });

      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      ws.on("error", (error: Error) => {
        console.error("[WebSocket] Error:", error.message);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: "heartbeat",
        taskId: 0,
        data: { message: "Connected to agent WebSocket server" },
        timestamp: new Date(),
      });
    });

    // Heartbeat interval to keep connections alive
    setInterval(() => {
      this.wss.clients.forEach((ws: any) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: WebSocket, data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;

      if (message.type === "subscribe") {
        this.subscribeToTask(ws, message.taskId);
      } else if (message.type === "unsubscribe") {
        this.unsubscribeFromTask(ws, message.taskId);
      } else {
        console.warn("[WebSocket] Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
      this.sendToClient(ws, {
        type: "error",
        taskId: 0,
        data: { error: "Invalid message format" },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: WebSocket): void {
    const metadata = this.clientMetadata.get(ws);
    if (metadata) {
      this.unsubscribeFromTask(ws, metadata.taskId);
      this.clientMetadata.delete(ws);
    }
    console.log("[WebSocket] Client disconnected");
  }

  /**
   * Subscribe client to task updates
   */
  private subscribeToTask(ws: WebSocket, taskId: number): void {
    if (!this.taskSubscriptions.has(taskId)) {
      this.taskSubscriptions.set(taskId, new Set());
    }

    this.taskSubscriptions.get(taskId)!.add(ws);
    this.clientMetadata.set(ws, { taskId, userId: 0 }); // userId would come from auth

    // Send queued messages
    const queue = this.messageQueue.get(taskId) || [];
    queue.forEach((msg) => this.sendToClient(ws, msg));

    this.sendToClient(ws, {
      type: "heartbeat",
      taskId,
      data: { message: `Subscribed to task ${taskId}` },
      timestamp: new Date(),
    });

    console.log(`[WebSocket] Client subscribed to task ${taskId}`);
  }

  /**
   * Unsubscribe client from task updates
   */
  private unsubscribeFromTask(ws: WebSocket, taskId: number): void {
    const subscribers = this.taskSubscriptions.get(taskId);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.taskSubscriptions.delete(taskId);
        this.messageQueue.delete(taskId);
      }
    }
    console.log(`[WebSocket] Client unsubscribed from task ${taskId}`);
  }

  /**
   * Broadcast agent thought to task subscribers
   */
  broadcastAgentThought(taskId: number, thought: AgentThought): void {
    const message: WebSocketMessage = {
      type: "agent_thought",
      taskId,
      data: thought,
      timestamp: new Date(),
    };

    this.broadcastToTask(taskId, message);
  }

  /**
   * Broadcast tool execution update
   */
  broadcastToolExecution(taskId: number, execution: ToolExecutionMessage): void {
    const message: WebSocketMessage = {
      type: "tool_execution",
      taskId,
      data: execution,
      timestamp: new Date(),
    };

    this.broadcastToTask(taskId, message);
  }

  /**
   * Broadcast phase update
   */
  broadcastPhaseUpdate(taskId: number, update: PhaseUpdateMessage): void {
    const message: WebSocketMessage = {
      type: "phase_update",
      taskId,
      data: update,
      timestamp: new Date(),
    };

    this.broadcastToTask(taskId, message);
  }

  /**
   * Broadcast error
   */
  broadcastError(taskId: number, error: Error): void {
    const message: WebSocketMessage = {
      type: "error",
      taskId,
      data: { error: error.message, stack: error.stack },
      timestamp: new Date(),
    };

    this.broadcastToTask(taskId, message);
  }

  /**
   * Broadcast task completion
   */
  broadcastCompletion(taskId: number, result: unknown): void {
    const message: WebSocketMessage = {
      type: "completion",
      taskId,
      data: result,
      timestamp: new Date(),
    };

    this.broadcastToTask(taskId, message);
  }

  /**
   * Broadcast message to all subscribers of a task
   */
  private broadcastToTask(taskId: number, message: WebSocketMessage): void {
    const subscribers = this.taskSubscriptions.get(taskId);

    if (subscribers && subscribers.size > 0) {
      subscribers.forEach((ws) => {
        this.sendToClient(ws, message);
      });
    } else {
      // Queue message if no subscribers
      if (!this.messageQueue.has(taskId)) {
        this.messageQueue.set(taskId, []);
      }

      const queue = this.messageQueue.get(taskId)!;
      if (queue.length < this.maxQueueSize) {
        queue.push(message);
      } else {
        queue.shift(); // Remove oldest if queue is full
        queue.push(message);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("[WebSocket] Failed to send message:", error);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.wss.clients.size,
      totalSubscriptions: this.taskSubscriptions.size,
      queuedMessages: Array.from(this.messageQueue.entries()).reduce(
        (sum, [_, queue]) => sum + queue.length,
        0
      ),
    };
  }

  /**
   * Close server
   */
  close(): void {
    this.wss.close();
  }
}


