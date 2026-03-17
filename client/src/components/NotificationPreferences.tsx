import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Clock, Mail, Smartphone, Moon } from "lucide-react";

export default function NotificationPreferences() {
  const { data: preferences, isLoading } = trpc.notificationPreferences.getPreferences.useQuery();

  const [taskStarted, setTaskStarted] = useState(true);
  const [taskCompleted, setTaskCompleted] = useState(true);
  const [taskFailed, setTaskFailed] = useState(true);
  const [taskPaused, setTaskPaused] = useState(true);
  const [systemAlert, setSystemAlert] = useState(true);

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");

  const [emailDigestEnabled, setEmailDigestEnabled] = useState(false);
  const [emailFrequency, setEmailFrequency] = useState<"daily" | "weekly" | "never">("never");

  const [pushEnabled, setPushEnabled] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  const updateTypesMutation = trpc.notificationPreferences.updateNotificationTypes.useMutation();
  const updateQuietHoursMutation = trpc.notificationPreferences.updateQuietHours.useMutation();
  const updateEmailDigestMutation = trpc.notificationPreferences.updateEmailDigest.useMutation();
  const updatePushMutation = trpc.notificationPreferences.updatePushNotifications.useMutation();
  const updateDoNotDisturbMutation = trpc.notificationPreferences.updateDoNotDisturb.useMutation();

  useEffect(() => {
    if (preferences) {
      setTaskStarted(preferences.taskStartedEnabled);
      setTaskCompleted(preferences.taskCompletedEnabled);
      setTaskFailed(preferences.taskFailedEnabled);
      setTaskPaused(preferences.taskPausedEnabled);
      setSystemAlert(preferences.systemAlertEnabled);
      setQuietHoursEnabled(preferences.quietHoursEnabled);
      setQuietStart(preferences.quietHoursStart || "22:00");
      setQuietEnd(preferences.quietHoursEnd || "08:00");
      setEmailDigestEnabled(preferences.emailDigestEnabled);
      setEmailFrequency(preferences.emailDigestFrequency);
      setPushEnabled(preferences.pushNotificationsEnabled);
      setDoNotDisturb(preferences.doNotDisturbEnabled);
    }
  }, [preferences]);

  const handleNotificationTypesChange = async () => {
    await updateTypesMutation.mutateAsync({
      taskStartedEnabled: taskStarted,
      taskCompletedEnabled: taskCompleted,
      taskFailedEnabled: taskFailed,
      taskPausedEnabled: taskPaused,
      systemAlertEnabled: systemAlert,
    });
  };

  const handleQuietHoursChange = async () => {
    await updateQuietHoursMutation.mutateAsync({
      enabled: quietHoursEnabled,
      start: quietStart,
      end: quietEnd,
    });
  };

  const handleEmailDigestChange = async () => {
    await updateEmailDigestMutation.mutateAsync({
      enabled: emailDigestEnabled,
      frequency: emailFrequency,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Notification Types</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Task Started</label>
            <Switch
              checked={taskStarted}
              onCheckedChange={setTaskStarted}
              disabled={updateTypesMutation.isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Task Completed</label>
            <Switch
              checked={taskCompleted}
              onCheckedChange={setTaskCompleted}
              disabled={updateTypesMutation.isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Task Failed</label>
            <Switch
              checked={taskFailed}
              onCheckedChange={setTaskFailed}
              disabled={updateTypesMutation.isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Task Paused</label>
            <Switch
              checked={taskPaused}
              onCheckedChange={setTaskPaused}
              disabled={updateTypesMutation.isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">System Alerts</label>
            <Switch
              checked={systemAlert}
              onCheckedChange={setSystemAlert}
              disabled={updateTypesMutation.isPending}
            />
          </div>
          <Button
            onClick={handleNotificationTypesChange}
            disabled={updateTypesMutation.isPending}
            className="w-full mt-4"
          >
            {updateTypesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Moon className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Quiet Hours</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Quiet Hours</label>
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
              disabled={updateQuietHoursMutation.isPending}
            />
          </div>
          {quietHoursEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Start Time</label>
                  <Input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    disabled={updateQuietHoursMutation.isPending}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">End Time</label>
                  <Input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    disabled={updateQuietHoursMutation.isPending}
                  />
                </div>
              </div>
              <Button
                onClick={handleQuietHoursChange}
                disabled={updateQuietHoursMutation.isPending}
                className="w-full"
              >
                {updateQuietHoursMutation.isPending ? "Saving..." : "Save Quiet Hours"}
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Email Digest */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold">Email Digest</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Email Digest</label>
            <Switch
              checked={emailDigestEnabled}
              onCheckedChange={setEmailDigestEnabled}
              disabled={updateEmailDigestMutation.isPending}
            />
          </div>
          {emailDigestEnabled && (
            <>
              <div>
                <label className="text-sm font-medium block mb-2">Frequency</label>
                <Select value={emailFrequency} onValueChange={(value: any) => setEmailFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleEmailDigestChange}
                disabled={updateEmailDigestMutation.isPending}
                className="w-full"
              >
                {updateEmailDigestMutation.isPending ? "Saving..." : "Save Email Preferences"}
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Push Notifications */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Push Notifications</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Push Notifications</label>
            <Switch
              checked={pushEnabled}
              onCheckedChange={setPushEnabled}
              disabled={updatePushMutation.isPending}
            />
          </div>
          <Button
            onClick={() => updatePushMutation.mutate({ enabled: pushEnabled })}
            disabled={updatePushMutation.isPending}
            className="w-full"
          >
            {updatePushMutation.isPending ? "Saving..." : "Save Push Preferences"}
          </Button>
        </div>
      </Card>

      {/* Do Not Disturb */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold">Do Not Disturb</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            When enabled, all notifications will be silenced until you disable this mode.
          </p>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Do Not Disturb</label>
            <Switch
              checked={doNotDisturb}
              onCheckedChange={setDoNotDisturb}
              disabled={updateDoNotDisturbMutation.isPending}
            />
          </div>
          <Button
            onClick={() => updateDoNotDisturbMutation.mutate({ enabled: doNotDisturb })}
            disabled={updateDoNotDisturbMutation.isPending}
            className="w-full"
          >
            {updateDoNotDisturbMutation.isPending ? "Saving..." : "Save Do Not Disturb"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
