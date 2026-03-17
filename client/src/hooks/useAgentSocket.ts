/**
 * useAgentSocket Hook
 * Manages WebSocket connection to agent server for real-time updates
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface AgentMessage {
  type: string;
  taskId: number;
  data: unknown;
  timestamp: string;
}

export interface UseAgentSocketOptions {
  taskId?: number;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useAgentSocket(options: UseAgentSocketOptions = {}) {
  const {
    taskId,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reconnectCountRef = useRef(0);
  const messageHandlersRef = useRef<Map<string, (msg: AgentMessage) => void>>(new Map());

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws/agent`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;

        // Subscribe to task if provided
        if (taskId) {
          ws.send(JSON.stringify({ type: "subscribe", taskId }));
        }
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data) as AgentMessage;
          setMessages((prev) => [...prev, message]);

          // Call registered handlers
          const handler = messageHandlersRef.current.get(message.type);
          if (handler) {
            handler(message);
          }
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
        }
      };

      ws.onerror = (event: Event) => {
        console.error("[WebSocket] Error:", event);
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);

        // Attempt reconnection
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          setTimeout(() => {
            console.log(
              `[WebSocket] Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`
            );
            connect();
          }, reconnectDelay * reconnectCountRef.current);
        } else {
          setError("Failed to reconnect to WebSocket server");
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[WebSocket] Connection failed:", err);
      setError((err as Error).message);
    }
  }, [taskId, reconnectAttempts, reconnectDelay]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Subscribe to task updates
   */
  const subscribe = useCallback((newTaskId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", taskId: newTaskId }));
    }
  }, []);

  /**
   * Unsubscribe from task updates
   */
  const unsubscribe = useCallback((unsubscribeTaskId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", taskId: unsubscribeTaskId }));
    }
  }, []);

  /**
   * Register message handler for specific message type
   */
  const onMessage = useCallback((messageType: string, handler: (msg: AgentMessage) => void) => {
    messageHandlersRef.current.set(messageType, handler);

    return () => {
      messageHandlersRef.current.delete(messageType);
    };
  }, []);

  /**
   * Clear message history
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Get latest message of specific type
   */
  const getLatestMessage = useCallback(
    (messageType: string): AgentMessage | undefined => {
      return [...messages].reverse().find((msg) => msg.type === messageType);
    },
    [messages]
  );

  /**
   * Get all messages of specific type
   */
  const getMessagesByType = useCallback(
    (messageType: string): AgentMessage[] => {
      return messages.filter((msg) => msg.type === messageType);
    },
    [messages]
  );

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  /**
   * Update subscription when taskId changes
   */
  useEffect(() => {
    if (taskId && isConnected) {
      subscribe(taskId);
    }
  }, [taskId, isConnected, subscribe]);

  return {
    isConnected,
    error,
    messages,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    onMessage,
    clearMessages,
    getLatestMessage,
    getMessagesByType,
  };
}
