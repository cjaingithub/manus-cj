/**
 * Advanced Task Search and Filtering Page
 * Full-text search, date range filtering, and status-based queries
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Loader2 } from "lucide-react";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Perform advanced search
  const { data: searchResults, isLoading: searchLoading } =
    trpc.search.advancedSearch.useQuery(
      {
        query: searchQuery || undefined,
        status: (status as any) || undefined,
        sortBy: (sortBy as any) || "createdAt",
        sortOrder: (sortOrder as any) || "desc",
        limit: 50,
      },
      { enabled: searchQuery.length > 0 || status !== undefined }
    );

  // Get search suggestions
  const { data: suggestions } = trpc.search.suggestions.useQuery();

  // Get task statistics
  const { data: stats } = trpc.search.statistics.useQuery({});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is triggered automatically by useQuery
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task Search & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Find and analyze your tasks with advanced filtering options
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.completed}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.failed}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Executing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.executing}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Form */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Input */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Search Query</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {suggestions && suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.slice(0, 5).map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setSearchQuery(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={status || "all"} onValueChange={(val) => setStatus(val === "all" ? undefined : val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="executing">Executing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-sm font-medium">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="updatedAt">Updated Date</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort Order */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium">Order</label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full md:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Search Results
            {searchResults && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({searchResults.length} tasks)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {searchLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{task.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={
                            task.status === "completed"
                              ? "default"
                              : task.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {task.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery || status
                  ? "No tasks match your search criteria"
                  : "Enter a search query or select filters to begin"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
