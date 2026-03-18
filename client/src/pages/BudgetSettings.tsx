import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface BudgetConfig {
  id: number;
  monthlyBudgetUSD: number;
  alertThresholdPercent: number;
  hardLimitPercent: number;
  emailAlertEnabled: boolean;
  slackAlertEnabled: boolean;
  slackWebhookUrl?: string | null;
}

interface BudgetStatus {
  monthlyBudget: number;
  currentSpent: number;
  percentageUsed: number;
  remaining: number;
  alertThreshold: number;
  isExceeded: boolean;
  daysUntilReset: number;
}

interface BudgetAlert {
  id: number;
  alertType: "warning" | "critical" | "limit_exceeded";
  spentAmount: number;
  budgetLimit: number;
  percentageUsed: number;
  emailSent: boolean;
  slackSent: boolean;
  message: string;
  createdAt: Date;
}

export function BudgetSettings() {
  const [config, setConfig] = useState<BudgetConfig | null>(null);
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    monthlyBudgetUSD: 100,
    alertThresholdPercent: 80,
    hardLimitPercent: 100,
    emailAlertEnabled: true,
    slackAlertEnabled: false,
    slackWebhookUrl: "",
  });

  // Fetch data
  const configQuery = trpc.budgetAlerts.getConfig.useQuery();
  const statusQuery = trpc.budgetAlerts.getStatus.useQuery();
  const alertsQuery = trpc.budgetAlerts.getAlerts.useQuery({ limit: 20 });

  // Mutations
  const updateConfigMutation = trpc.budgetAlerts.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Budget configuration updated");
      setIsEditing(false);
      configQuery.refetch();
      statusQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update budget configuration");
    },
  });

  const resetMonthlyMutation = trpc.budgetAlerts.resetMonthly.useMutation({
    onSuccess: () => {
      toast.success("Monthly budget reset");
      statusQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reset monthly budget");
    },
  });

  useEffect(() => {
    if (configQuery.data) {
      setConfig(configQuery.data);
      setFormData({
        monthlyBudgetUSD: configQuery.data.monthlyBudgetUSD,
        alertThresholdPercent: configQuery.data.alertThresholdPercent,
        hardLimitPercent: configQuery.data.hardLimitPercent,
        emailAlertEnabled: configQuery.data.emailAlertEnabled,
        slackAlertEnabled: configQuery.data.slackAlertEnabled,
        slackWebhookUrl: configQuery.data.slackWebhookUrl || "",
      });
    }
    if (statusQuery.data) setStatus(statusQuery.data);
    if (alertsQuery.data) setAlerts(alertsQuery.data as BudgetAlert[]);
  }, [configQuery.data, statusQuery.data, alertsQuery.data]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateConfigMutation.mutateAsync({
        monthlyBudgetUSD: formData.monthlyBudgetUSD,
        alertThresholdPercent: formData.alertThresholdPercent,
        hardLimitPercent: formData.hardLimitPercent,
        emailAlertEnabled: formData.emailAlertEnabled,
        slackAlertEnabled: formData.slackAlertEnabled,
        slackWebhookUrl: formData.slackWebhookUrl,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "critical":
        return "text-orange-600 bg-orange-50";
      case "limit_exceeded":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Budget Settings</h1>
        <p className="text-muted-foreground mt-1">Configure spending limits and cost alerts</p>
      </div>

      {/* Budget Status */}
      {status && (
        <Card className={status.isExceeded ? "border-red-200 bg-red-50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Current Budget Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Budget</p>
                <p className="text-2xl font-bold">${status.monthlyBudget.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Spending</p>
                <p className="text-2xl font-bold text-orange-600">${status.currentSpent.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-2xl font-bold ${status.remaining > 0 ? "text-green-600" : "text-red-600"}`}>
                  ${status.remaining.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Budget Usage</span>
                <span className="text-sm font-bold">{status.percentageUsed}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    status.percentageUsed >= 100
                      ? "bg-red-600"
                      : status.percentageUsed >= 90
                        ? "bg-orange-500"
                        : status.percentageUsed >= status.alertThreshold
                          ? "bg-yellow-500"
                          : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(status.percentageUsed, 100)}%` }}
                />
              </div>
            </div>

            {status.isExceeded && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  You have exceeded your monthly budget limit. Consider increasing your budget or reviewing your spending.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground">
              Budget resets in {status.daysUntilReset} days
            </p>
          </CardContent>
        </Card>
      )}

      {/* Budget Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Budget Configuration</CardTitle>
            <CardDescription>Set spending limits and alert thresholds</CardDescription>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              {/* Monthly Budget */}
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  min="1"
                  step="10"
                  value={formData.monthlyBudgetUSD}
                  onChange={(e) =>
                    setFormData({ ...formData, monthlyBudgetUSD: parseFloat(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">Maximum monthly spending limit</p>
              </div>

              {/* Alert Threshold */}
              <div className="space-y-2">
                <Label htmlFor="threshold">Alert Threshold (%)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.alertThresholdPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, alertThresholdPercent: parseInt(e.target.value) || 80 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Alert when spending reaches this percentage of budget
                </p>
              </div>

              {/* Hard Limit */}
              <div className="space-y-2">
                <Label htmlFor="hardLimit">Hard Limit (%)</Label>
                <Input
                  id="hardLimit"
                  type="number"
                  min="1"
                  max="200"
                  value={formData.hardLimitPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, hardLimitPercent: parseInt(e.target.value) || 100 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Critical alert at this percentage (100% = budget limit)
                </p>
              </div>

              {/* Email Alerts */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailAlerts"
                  checked={formData.emailAlertEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, emailAlertEnabled: checked as boolean })
                  }
                />
                <Label htmlFor="emailAlerts" className="font-normal cursor-pointer">
                  Enable email alerts
                </Label>
              </div>

              {/* Slack Alerts */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="slackAlerts"
                    checked={formData.slackAlertEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, slackAlertEnabled: checked as boolean })
                    }
                  />
                  <Label htmlFor="slackAlerts" className="font-normal cursor-pointer">
                    Enable Slack alerts
                  </Label>
                </div>
                {formData.slackAlertEnabled && (
                  <Input
                    type="url"
                    placeholder="Slack webhook URL"
                    value={formData.slackWebhookUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, slackWebhookUrl: e.target.value })
                    }
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? "Saving..." : "Save Configuration"}
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Monthly Budget</span>
                <span className="font-semibold">${config?.monthlyBudgetUSD.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Alert Threshold</span>
                <span className="font-semibold">{config?.alertThresholdPercent || 80}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Hard Limit</span>
                <span className="font-semibold">{config?.hardLimitPercent || 100}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Email Alerts</span>
                <span className="font-semibold">{config?.emailAlertEnabled ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Slack Alerts</span>
                <span className="font-semibold">{config?.slackAlertEnabled ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Alert History
          </CardTitle>
          <CardDescription>Recent budget alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-3 ${getAlertColor(alert.alertType)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold capitalize">{alert.alertType.replace(/_/g, " ")}</p>
                      <p className="text-sm">{alert.message}</p>
                    </div>
                    <span className="text-xs font-semibold">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>Spent: ${alert.spentAmount.toFixed(2)}</span>
                    <span>Budget: ${alert.budgetLimit.toFixed(2)}</span>
                    <span>Usage: {alert.percentageUsed}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No budget alerts yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
