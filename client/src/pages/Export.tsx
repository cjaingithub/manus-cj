import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, FileJson, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Export() {
  const [selectedFormat, setSelectedFormat] = useState<"json" | "csv">("json");
  const [selectedType, setSelectedType] = useState<"tasks" | "analytics">("tasks");
  const [isExporting, setIsExporting] = useState(false);

  const exportTasksJSON = trpc.export.exportTasksJSON.useQuery(
    { includeExecutions: true },
    { enabled: false }
  );

  const exportTasksCSV = trpc.export.exportTasksCSV.useQuery(
    {},
    { enabled: false }
  );

  const exportAnalyticsJSON = trpc.export.exportAnalyticsJSON.useQuery(
    {},
    { enabled: false }
  );

  const exportAnalyticsCSV = trpc.export.exportAnalyticsCSV.useQuery(
    {},
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data: unknown;
      let filename: string;
      let mimeType: string;

      if (selectedType === "tasks") {
        if (selectedFormat === "json") {
          await exportTasksJSON.refetch();
          data = exportTasksJSON.data;
          filename = "tasks_export.json";
          mimeType = "application/json";
        } else {
          await exportTasksCSV.refetch();
          data = exportTasksCSV.data;
          filename = (data as any)?.filename || "tasks_export.csv";
          mimeType = (data as any)?.mimeType || "text/csv";
        }
      } else {
        if (selectedFormat === "json") {
          await exportAnalyticsJSON.refetch();
          data = exportAnalyticsJSON.data;
          filename = "analytics_export.json";
          mimeType = "application/json";
        } else {
          await exportAnalyticsCSV.refetch();
          data = exportAnalyticsCSV.data;
          filename = (data as any)?.filename || "analytics_export.csv";
          mimeType = (data as any)?.mimeType || "text/csv";
        }
      }

      if (!data) {
        toast.error("No data to export");
        return;
      }

      const content = selectedFormat === "json" 
        ? JSON.stringify(data, null, 2)
        : (data as any)?.content || JSON.stringify(data);

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedType} as ${selectedFormat.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Export Data</h1>
          <p className="text-muted-foreground">
            Export your tasks and analytics in multiple formats for analysis and reporting
          </p>
        </div>

        <div className="grid gap-6">
          {/* Export Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Export Type</CardTitle>
              <CardDescription>Choose what data you want to export</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedType === "tasks" ? "default" : "outline"}
                  onClick={() => setSelectedType("tasks")}
                  className="h-auto py-4"
                >
                  <div className="text-left">
                    <div className="font-semibold">Tasks</div>
                    <div className="text-sm text-muted-foreground">Export all your tasks</div>
                  </div>
                </Button>
                <Button
                  variant={selectedType === "analytics" ? "default" : "outline"}
                  onClick={() => setSelectedType("analytics")}
                  className="h-auto py-4"
                >
                  <div className="text-left">
                    <div className="font-semibold">Analytics</div>
                    <div className="text-sm text-muted-foreground">Export analytics summary</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Format</CardTitle>
              <CardDescription>Choose the export format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={selectedFormat === "json" ? "default" : "outline"}
                  onClick={() => setSelectedFormat("json")}
                  className="h-auto py-4"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">JSON</div>
                    <div className="text-sm text-muted-foreground">Structured format</div>
                  </div>
                </Button>
                <Button
                  variant={selectedFormat === "csv" ? "default" : "outline"}
                  onClick={() => setSelectedFormat("csv")}
                  className="h-auto py-4"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">CSV</div>
                    <div className="text-sm text-muted-foreground">Spreadsheet format</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card>
            <CardHeader>
              <CardTitle>Ready to Export?</CardTitle>
              <CardDescription>
                Download your {selectedType} data as {selectedFormat.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {selectedType === "tasks" ? "Tasks" : "Analytics"} • {selectedFormat.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Click the button to download your export file
                  </p>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Format Information */}
          <Card>
            <CardHeader>
              <CardTitle>Format Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="json" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="csv">CSV</TabsTrigger>
                </TabsList>
                <TabsContent value="json" className="space-y-2">
                  <p className="text-sm">
                    <strong>Best for:</strong> Data analysis, programmatic processing, and preserving nested structures
                  </p>
                  <p className="text-sm text-muted-foreground">
                    JSON format includes all task details, execution logs, and metadata in a structured format
                  </p>
                </TabsContent>
                <TabsContent value="csv" className="space-y-2">
                  <p className="text-sm">
                    <strong>Best for:</strong> Spreadsheet applications, Excel, and data visualization tools
                  </p>
                  <p className="text-sm text-muted-foreground">
                    CSV format is compatible with Excel, Google Sheets, and other spreadsheet applications
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
