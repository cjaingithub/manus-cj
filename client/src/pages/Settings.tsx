import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Mail, Bell, Key, Palette } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [email, setEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState({
    taskCompleted: true,
    taskFailed: true,
    taskStarted: false,
  });

  const [webhookNotifications, setWebhookNotifications] = useState({
    enabled: true,
    retryOnFailure: true,
  });

  const [preferences, setPreferences] = useState({
    theme: "light",
    autoRefresh: true,
    refreshInterval: 5,
  });

  const [apiKey, setApiKey] = useState("sk-****...****");
  const [showApiKey, setShowApiKey] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSaveEmail = () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    toast.success("Email settings saved successfully");
  };

  const handleEmailNotificationChange = (
    key: keyof typeof emailNotifications
  ) => {
    setEmailNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleWebhookNotificationChange = (
    key: keyof typeof webhookNotifications
  ) => {
    setWebhookNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePreferenceChange = (
    key: keyof typeof preferences,
    value: string | number | boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRegenerateApiKey = () => {
    toast.success("API key regenerated successfully");
    setApiKey("sk-****...****");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and notification settings
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure email alerts for task events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={handleEmailChange}
                    />
                    <Button onClick={handleSaveEmail}>Save</Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">
                        Task Completed Notifications
                      </Label>
                      <Switch
                        checked={emailNotifications.taskCompleted}
                        onCheckedChange={() =>
                          handleEmailNotificationChange("taskCompleted")
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="font-normal">
                        Task Failed Notifications
                      </Label>
                      <Switch
                        checked={emailNotifications.taskFailed}
                        onCheckedChange={() =>
                          handleEmailNotificationChange("taskFailed")
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="font-normal">
                        Task Started Notifications
                      </Label>
                      <Switch
                        checked={emailNotifications.taskStarted}
                        onCheckedChange={() =>
                          handleEmailNotificationChange("taskStarted")
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Notifications</CardTitle>
              <CardDescription>
                Configure webhook delivery settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Enable Webhooks</Label>
                  <Switch
                    checked={webhookNotifications.enabled}
                    onCheckedChange={() =>
                      handleWebhookNotificationChange("enabled")
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Retry on Failure</Label>
                  <Switch
                    checked={webhookNotifications.retryOnFailure}
                    onCheckedChange={() =>
                      handleWebhookNotificationChange("retryOnFailure")
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
                    value={preferences.theme}
                    onChange={(e) =>
                      handlePreferenceChange("theme", e.target.value)
                    }
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Auto-refresh Dashboard</Label>
                  <Switch
                    checked={preferences.autoRefresh}
                    onCheckedChange={(checked) =>
                      handlePreferenceChange("autoRefresh", checked)
                    }
                  />
                </div>

                {preferences.autoRefresh && (
                  <div>
                    <Label htmlFor="refreshInterval">
                      Refresh Interval (seconds)
                    </Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="5"
                      max="60"
                      value={preferences.refreshInterval}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "refreshInterval",
                          parseInt(e.target.value)
                        )
                      }
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for programmatic access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Keep your API key secure</p>
                  <p>Never share your API key in public repositories or client-side code.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Primary API Key</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={handleRegenerateApiKey}
                  className="w-full"
                >
                  Regenerate API Key
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Usage Instructions</h4>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.hunteragent.com/v1/tasks`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                View and manage your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Account Status</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <Badge>Active</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Account Tier</Label>
                  <div className="mt-2">
                    <Badge variant="secondary">Professional</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Member Since</Label>
                  <p className="mt-2 text-sm">March 17, 2026</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Last Login</Label>
                  <p className="mt-2 text-sm">Today at 2:54 PM</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Danger Zone</h4>
                <Button variant="destructive" className="w-full">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
