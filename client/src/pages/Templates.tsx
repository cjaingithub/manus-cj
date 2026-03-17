import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Star } from "lucide-react";

export default function Templates() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Fetch categories
  const { data: categories = [] } = trpc.templates.categories.useQuery();

  // Fetch public templates
  const { data: publicTemplates = [], isLoading: publicLoading } = trpc.templates.listPublic.useQuery({
    category: selectedCategory || undefined,
    limit: 20,
  });

  // Fetch user's templates
  const { data: myTemplates = [], isLoading: myLoading } = trpc.templates.listMine.useQuery({
    category: selectedCategory || undefined,
    limit: 20,
  });

  // Create template mutation
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      setTemplateName("");
      setTemplateCategory("");
      setTemplateDescription("");
      setShowCreateForm(false);
    },
  });

  const handleCreateTemplate = async () => {
    if (!templateName || !templateCategory) return;

    await createMutation.mutateAsync({
      name: templateName,
      category: templateCategory,
      description: templateDescription,
      taskTemplate: {
        title: templateName,
        description: templateDescription,
        plan: [],
      },
      isPublic: false,
    });
  };

  const TemplateCard = ({ template }: { template: any }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </div>
          {template.rating > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{template.rating}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{template.category}</Badge>
            <span className="text-xs text-gray-500">{template.usageCount} uses</span>
          </div>
          {template.tags && JSON.parse(template.tags || "[]").length > 0 && (
            <div className="flex flex-wrap gap-1">
              {JSON.parse(template.tags || "[]").map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <Button className="w-full" variant="outline">
            Use Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Templates</h1>
          <p className="text-gray-600 mt-1">Pre-built templates for common task patterns</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      {showCreateForm && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Create New Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Template Name</label>
              <Input
                placeholder="e.g., Web Scraper, Data Analyzer"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={templateCategory || "web-scraping"} onValueChange={setTemplateCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web-scraping">Web Scraping</SelectItem>
                  <SelectItem value="data-analysis">Data Analysis</SelectItem>
                  <SelectItem value="report-generation">Report Generation</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Describe what this template does"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateTemplate}
                disabled={createMutation.isPending || !templateName || !templateCategory}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter by Category:</label>
          <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? "" : val)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="public" className="w-full">
        <TabsList>
          <TabsTrigger value="public">Public Templates ({publicTemplates.length})</TabsTrigger>
          <TabsTrigger value="mine">My Templates ({myTemplates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="space-y-4">
          {publicLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : publicTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No public templates available yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          {myLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : myTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                You haven't created any templates yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
