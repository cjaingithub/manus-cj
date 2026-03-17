import { describe, it, expect, beforeEach } from "vitest";
import { NotificationBroadcaster } from "./notificationBroadcaster";
import { WebSocket } from "ws";

describe("NotificationBroadcaster", () => {
  let broadcaster: NotificationBroadcaster;
  let mockWs1: Partial<WebSocket>;
  let mockWs2: Partial<WebSocket>;
  let sentMessages: any[] = [];

  beforeEach(() => {
    broadcaster = new NotificationBroadcaster();
    sentMessages = [];

    // Mock WebSocket objects
    mockWs1 = {
      readyState: WebSocket.OPEN,
      send: (data: string, callback?: (error?: Error) => void) => {
        sentMessages.push({ ws: "ws1", data: JSON.parse(data) });
        callback?.();
      },
    };

    mockWs2 = {
      readyState: WebSocket.OPEN,
      send: (data: string, callback?: (error?: Error) => void) => {
        sentMessages.push({ ws: "ws2", data: JSON.parse(data) });
        callback?.();
      },
    };
  });

  it("should register and unregister connections", () => {
    broadcaster.registerConnection(mockWs1 as WebSocket, 1);
    expect(broadcaster.getActiveConnections(1)).toBe(1);

    broadcaster.unregisterConnection(mockWs1 as WebSocket);
    expect(broadcaster.getActiveConnections(1)).toBe(0);
  });

  it("should handle multiple connections for same user", () => {
    broadcaster.registerConnection(mockWs1 as WebSocket, 1);
    broadcaster.registerConnection(mockWs2 as WebSocket, 1);

    expect(broadcaster.getActiveConnections(1)).toBe(2);
    expect(broadcaster.getTotalActiveConnections()).toBe(2);
  });

  it("should broadcast to specific user", () => {
    broadcaster.registerConnection(mockWs1 as WebSocket, 1);
    broadcaster.registerConnection(mockWs2 as WebSocket, 2);

    const notification = {
      id: 1,
      type: "task_completed",
      title: "Task Complete",
      message: "Your task has completed",
    };

    broadcaster.broadcastToUser(1, notification);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].ws).toBe("ws1");
    expect(sentMessages[0].data.type).toBe("notification");
    expect(sentMessages[0].data.data).toEqual(notification);
  });

  it("should broadcast to all connected users", () => {
    broadcaster.registerConnection(mockWs1 as WebSocket, 1);
    broadcaster.registerConnection(mockWs2 as WebSocket, 2);

    const notification = {
      id: 1,
      type: "system_alert",
      title: "System Alert",
      message: "System maintenance scheduled",
    };

    broadcaster.broadcastToAll(notification);

    expect(sentMessages).toHaveLength(2);
    expect(sentMessages.every((msg) => msg.data.type === "notification")).toBe(true);
  });

  it("should track active connections correctly", () => {
    broadcaster.registerConnection(mockWs1 as WebSocket, 1);
    broadcaster.registerConnection(mockWs2 as WebSocket, 1);

    expect(broadcaster.getActiveConnections(1)).toBe(2);
    expect(broadcaster.getTotalActiveConnections()).toBe(2);

    broadcaster.unregisterConnection(mockWs1 as WebSocket);

    expect(broadcaster.getActiveConnections(1)).toBe(1);
    expect(broadcaster.getTotalActiveConnections()).toBe(1);
  });

  it("should handle closed connections gracefully", () => {
    const closedWs: Partial<WebSocket> = {
      readyState: WebSocket.CLOSED,
      send: () => {
        throw new Error("Connection closed");
      },
    };

    broadcaster.registerConnection(closedWs as WebSocket, 1);
    broadcaster.registerConnection(mockWs1 as WebSocket, 1);

    const notification = { id: 1, type: "info", title: "Test" };

    // Should not throw, just skip closed connection
    broadcaster.broadcastToUser(1, notification);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].ws).toBe("ws1");
  });

  it("should handle unregistered user gracefully", () => {
    const notification = { id: 1, type: "info", title: "Test" };

    // Should not throw for unregistered user
    broadcaster.broadcastToUser(999, notification);

    expect(sentMessages).toHaveLength(0);
  });

  it("should include timestamp in broadcasts", () => {
    broadcaster.registerConnection(mockWs1 as WebSocket, 1);

    const notification = { id: 1, type: "task_started", title: "Task Started" };

    broadcaster.broadcastToUser(1, notification);

    expect(sentMessages[0].data.timestamp).toBeDefined();
    expect(typeof sentMessages[0].data.timestamp).toBe("string");
  });

  it("should handle multiple disconnections", () => {
    broadcaster.registerConnection(mockWs1 as WebSocket, 1);
    broadcaster.registerConnection(mockWs2 as WebSocket, 1);

    expect(broadcaster.getTotalActiveConnections()).toBe(2);

    broadcaster.unregisterConnection(mockWs1 as WebSocket);
    expect(broadcaster.getTotalActiveConnections()).toBe(1);

    broadcaster.unregisterConnection(mockWs2 as WebSocket);
    expect(broadcaster.getTotalActiveConnections()).toBe(0);
  });
});
