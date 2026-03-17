import { WebSocket } from "ws";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";

/**
 * Notification Broadcaster Service
 * Manages broadcasting notifications to connected WebSocket clients
 */
export class NotificationBroadcaster {
  private userConnections: Map<number, Set<WebSocket>> = new Map();
  private connectionMetadata: Map<WebSocket, { userId: number }> = new Map();

  /**
   * Register a WebSocket connection for a user
   */
  registerConnection(ws: WebSocket, userId: number): void {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }

    this.userConnections.get(userId)!.add(ws);
    this.connectionMetadata.set(ws, { userId });

    console.log(`[NotificationBroadcaster] User ${userId} connected`);
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterConnection(ws: WebSocket): void {
    const metadata = this.connectionMetadata.get(ws);
    if (metadata) {
      const connections = this.userConnections.get(metadata.userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          this.userConnections.delete(metadata.userId);
        }
      }
      this.connectionMetadata.delete(ws);
      console.log(`[NotificationBroadcaster] User ${metadata.userId} disconnected`);
    }
  }

  /**
   * Broadcast a notification to a specific user
   */
  broadcastToUser(userId: number, notification: any): void {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) {
      console.log(`[NotificationBroadcaster] No active connections for user ${userId}`);
      return;
    }

    const message = {
      type: "notification",
      data: notification,
      timestamp: new Date().toISOString(),
    };

    connections.forEach((ws: WebSocket) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message), (error) => {
          if (error) {
            console.error(`[NotificationBroadcaster] Failed to send to user ${userId}:`, error);
          }
        });
      }
    });
  }

  /**
   * Broadcast to all connected users (system-wide notifications)
   */
  broadcastToAll(notification: any): void {
    const message = {
      type: "notification",
      data: notification,
      timestamp: new Date().toISOString(),
    };

    this.userConnections.forEach((connections) => {
      connections.forEach((ws: WebSocket) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message), (error) => {
            if (error) {
              console.error("[NotificationBroadcaster] Failed to broadcast:", error);
            }
          });
        }
      });
    });
  }

  /**
   * Get active connection count for a user
   */
  getActiveConnections(userId: number): number {
    const connections = this.userConnections.get(userId);
    return connections ? connections.size : 0;
  }

  /**
   * Get total active connections across all users
   */
  getTotalActiveConnections(): number {
    let total = 0;
    this.userConnections.forEach((connections) => {
      total += connections.size;
    });
    return total;
  }

  /**
   * Create and broadcast a task notification
   */
  async broadcastTaskNotification(
    userId: number,
    taskId: number,
    type: "task_started" | "task_completed" | "task_failed" | "task_paused",
    title: string,
    message: string,
    priority: "low" | "normal" | "high" = "normal"
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create notification in database
      const notification = {
        userId,
        taskId,
        type,
        title,
        message,
        priority,
        actionUrl: `/tasks/${taskId}`,
        metadata: JSON.stringify({ broadcastedAt: new Date().toISOString() }),
      };

      await db.insert(notifications).values(notification);

      // Broadcast to connected clients
      this.broadcastToUser(userId, {
        id: Date.now(), // Temporary ID until DB returns it
        ...notification,
        createdAt: new Date().toISOString(),
        isRead: false,
        isDismissed: false,
      });

      console.log(`[NotificationBroadcaster] Broadcasted ${type} for task ${taskId} to user ${userId}`);
    } catch (error) {
      console.error("[NotificationBroadcaster] Failed to broadcast task notification:", error);
    }
  }

  /**
   * Create and broadcast a system notification
   */
  async broadcastSystemNotification(
    userId: number,
    title: string,
    message: string,
    priority: "low" | "normal" | "high" = "normal"
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create notification in database
      const notification = {
        userId,
        type: "system_alert" as const,
        title,
        message,
        priority,
        metadata: JSON.stringify({ broadcastedAt: new Date().toISOString() }),
      };

      await db.insert(notifications).values(notification);

      // Broadcast to connected clients
      this.broadcastToUser(userId, {
        id: Date.now(),
        ...notification,
        createdAt: new Date().toISOString(),
        isRead: false,
        isDismissed: false,
        taskId: null,
        actionUrl: null,
      });

      console.log(`[NotificationBroadcaster] Broadcasted system alert to user ${userId}`);
    } catch (error) {
      console.error("[NotificationBroadcaster] Failed to broadcast system notification:", error);
    }
  }
}

// Singleton instance
export const notificationBroadcaster = new NotificationBroadcaster();
