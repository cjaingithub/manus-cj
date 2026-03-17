import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  X,
  Check,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const { data: notificationsData, refetch } = trpc.notifications.getNotifications.useQuery(
    {
      limit: 10,
      unreadOnly: false,
    },
    { enabled: isOpen }
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const dismissMutation = trpc.notifications.dismissNotification.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const dismissAllMutation = trpc.notifications.dismissAllNotifications.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "task_failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "task_started":
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case "system_alert":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "task_completed":
        return "bg-green-50 border-green-200";
      case "task_failed":
        return "bg-red-50 border-red-200";
      case "task_started":
        return "bg-blue-50 border-blue-200";
      case "system_alert":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "normal":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadData && unreadData.unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadData && unreadData.unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Eye className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
            {notificationsData && notificationsData.notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissAllMutation.mutate()}
                disabled={dismissAllMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notificationsData && notificationsData.notifications.length > 0 ? (
            <div className="divide-y">
              {notificationsData.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 border-l-4 transition hover:bg-gray-50",
                    getNotificationColor(notification.type),
                    notification.isRead ? "opacity-60" : ""
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleTimeString()}
                        </span>
                        <div className="flex gap-2">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate({ notificationId: notification.id })}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissMutation.mutate({ notificationId: notification.id })}
                            disabled={dismissMutation.isPending}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          )}
        </div>

        {notificationsData && notificationsData.hasMore && (
          <div className="p-3 border-t text-center">
            <Button variant="outline" size="sm" className="w-full">
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
