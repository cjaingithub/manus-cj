import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2, Copy, TestTube, ToggleLeft, ToggleRight } from "lucide-react";

const EVENT_TYPES = [
  "task.created",
  "task.started",
  "task.completed",
  "task.failed",
  "agent.error",
  "agent.recovered",
  "scheduler.triggered",
];

export default function Webhooks() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    url: "",
    events: [] as string[],
    secret: "",
  });

  const { data: webhooks = [], isLoading, refetch } = trpc.webhooks.list.useQuery({});
  const createMutation = trpc.webhooks.create.useMutation();
  const deleteMutation = trpc.webhooks.delete.useMutation();
  const toggleMutation = trpc.webhooks.toggle.useMutation();
  const testMutation = trpc.webhooks.test.useMutation();

  const handleCreateWebhook = async () => {
    if (!formData.url || formData.events.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createMutation.mutateAsync({
        url: formData.url,
        events: formData.events,
        secret: formData.secret || undefined,
      });
      toast.success("Webhook created successfully");
      setFormData({ url: "", events: [], secret: "" });
      setShowForm(false);
      refetch();
    } catch (error) {
      toast.error(`Failed to create webhook: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Webhook deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete webhook");
    }
  };

  const handleToggleWebhook = async (id: number) => {
    try {
      await toggleMutation.mutateAsync({ id });
      refetch();
    } catch (error) {
      toast.error("Failed to toggle webhook");
    }
  };

  const handleTestWebhook = async (id: number) => {
    try {
      const result = await testMutation.mutateAsync({ id });
      if (result.success) {
        toast.success(`Test sent! Status: ${result.status}`);
      } else {
        toast.error(`Test failed: ${result.message}`);
      }
    } catch (error) {
      toast.error("Failed to test webhook");
    }
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Webhook Management</h1>
          <p className="text-muted-foreground">
            Configure webhooks to receive real-time notifications when tasks complete or fail
          </p>
        </div>

        <Tabs defaultValue="webhooks" className="w-full">
          <TabsList>
            <TabsTrigger value="webhooks">Webhooks ({webhooks.length})</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-6">
            {!showForm ? (
              <Button onClick={() => setShowForm(true)} className="w-full">
                + Create New Webhook
              </Button>
            ) : (
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Create New Webhook</h2>

                <div>
                  <label className="block text-sm font-medium mb-2">Webhook URL *</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/webhook"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Events to Subscribe *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {EVENT_TYPES.map(event => (
                      <div key={event} className="flex items-center space-x-2">
                        <Checkbox
                          id={event}
                          checked={formData.events.includes(event)}
                          onCheckedChange={() => toggleEvent(event)}
                        />
                        <label htmlFor={event} className="text-sm cursor-pointer">
                          {event}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Secret (optional)</label>
                  <Input
                    type="password"
                    placeholder="Leave empty to generate automatically"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used to sign webhook payloads with HMAC-SHA256
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateWebhook} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Webhook"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No webhooks configured yet</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <Card key={webhook.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold break-all">{webhook.url}</h3>
                          <Badge variant={webhook.isActive ? "default" : "secondary"}>
                            {webhook.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(webhook.events as string[]).map(event => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Success: {webhook.successCount} | Failed: {webhook.failureCount}
                          {webhook.lastDeliveryAt && (
                            <span> | Last: {new Date(webhook.lastDeliveryAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleWebhook(webhook.id)}
                          title={webhook.isActive ? "Disable" : "Enable"}
                        >
                          {webhook.isActive ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTestWebhook(webhook.id)}
                          disabled={testMutation.isPending}
                          title="Send test payload"
                        >
                          <TestTube className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(webhook.url)}
                          title="Copy URL"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          disabled={deleteMutation.isPending}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Webhook Documentation</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Payload Format</h3>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto">
{`{
  "id": "evt_123456",
  "type": "task.completed",
  "timestamp": "2026-03-17T10:30:00Z",
  "data": {
    "taskId": 123,
    "agentId": "agent_456",
    "duration": 45000,
    "result": { /* task output */ }
  },
  "metadata": {
    "platform": "hunter-agent",
    "version": "1.0.0"
  }
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Security</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    All webhook payloads are signed with HMAC-SHA256 using your secret key.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Verify the signature using the <code className="bg-muted px-2 py-1 rounded">X-Webhook-Signature</code> header:
                  </p>
                  <pre className="bg-muted p-4 rounded text-sm mt-2 overflow-auto">
{`const crypto = require('crypto');
const signature = req.headers['x-webhook-signature'];
const payload = req.body;
const secret = 'your-webhook-secret';

const hash = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

const expectedSignature = 'sha256=' + hash;
const isValid = signature === expectedSignature;`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Retry Policy</h3>
                  <p className="text-sm text-muted-foreground">
                    Failed webhook deliveries are retried with exponential backoff:
                    1s, 5s, 30s. After 3 failed attempts, the delivery is marked as failed.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
